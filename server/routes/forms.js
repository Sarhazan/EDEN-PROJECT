const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { db } = require('../database/schema');

const router = express.Router();

const uploadsRoot = path.join(__dirname, '..', '..', 'uploads', 'forms');
const logoDir = path.join(uploadsRoot, 'logos');
const contractsDir = path.join(uploadsRoot, 'contracts');

[uploadsRoot, logoDir, contractsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mode = req.query.mode || req.body.mode;
    cb(null, mode === 'logo' ? logoDir : contractsDir);
  },
  filename: (req, file, cb) => {
    const safeBase = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safeBase}`);
  }
});

const upload = multer({ storage });
const whatsappService = require('../services/whatsapp');

const LIVE_ALLOWLIST_RAW = process.env.FORMS_LIVE_ALLOWLIST || '0549441093';

function normalizePhone(input) {
  const digits = String(input || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('972')) return digits;
  return `972${digits.replace(/^0+/, '')}`;
}

function getLiveAllowlist() {
  return LIVE_ALLOWLIST_RAW
    .split(',')
    .map((s) => normalizePhone(s.trim()))
    .filter(Boolean);
}

function buildDispatchMessage(dispatch, payload) {
  const templateLabel = TEMPLATE_DEFS[dispatch.template_key]?.label || dispatch.template_key;
  const formUrl = `/forms/fill/${dispatch.id}`;

  return [
    `שלום ${dispatch.recipient_name},`,
    `נשלח אליך ${templateLabel}.`,
    payload?.title ? `נושא: ${payload.title}` : null,
    payload?.message ? `הודעה: ${payload.message}` : null,
    payload?.amount ? `סכום: ${payload.amount}` : null,
    `קישור לטופס: ${formUrl}`
  ].filter(Boolean).join('\n');
}

function insertDeliveryLog({ dispatchId, channel, mode, status, messagePreview, error }) {
  db.prepare(`
    INSERT INTO form_delivery_logs (dispatch_id, channel, mode, status, message_preview, error)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(dispatchId, channel || null, mode || null, status || null, messagePreview || null, error || null);
}

const TEMPLATE_DEFS = {
  regulation_signature: {
    key: 'regulation_signature',
    label: 'טופס חתימה על תקנון',
    fields: [
      { key: 'full_name', label: 'שם מלא', type: 'text', required: true },
      { key: 'id_number', label: 'תעודת זהות', type: 'text', required: true },
      { key: 'accepted_regulation', label: 'אני מאשר/ת שקראתי את התקנון', type: 'checkbox', required: true }
    ]
  },
  credit_card: {
    key: 'credit_card',
    label: 'טופס למילוי כרטיס אשראי',
    fields: [
      { key: 'full_name', label: 'שם בעל/ת הכרטיס', type: 'text', required: true },
      { key: 'id_number', label: 'תעודת זהות', type: 'text', required: true },
      { key: 'card_last4', label: '4 ספרות אחרונות', type: 'text', required: true },
      { key: 'expiry', label: 'תוקף (MM/YY)', type: 'text', required: true }
    ]
  },
  debt_payment: {
    key: 'debt_payment',
    label: 'טופס לתשלום חוב',
    fields: [
      { key: 'full_name', label: 'שם מלא', type: 'text', required: true },
      { key: 'amount', label: 'סכום לתשלום', type: 'number', required: true },
      { key: 'payment_reference', label: 'אסמכתא/הערה', type: 'text', required: false }
    ]
  },
  notice: {
    key: 'notice',
    label: 'טופס הודעה',
    fields: [
      { key: 'full_name', label: 'שם מלא', type: 'text', required: true },
      { key: 'notice_text', label: 'תוכן ההודעה', type: 'textarea', required: true }
    ]
  }
};

// HQ: view forms assets by building
router.get('/hq/buildings-assets', (req, res) => {
  try {
    const buildings = db.prepare('SELECT id, name FROM buildings ORDER BY name ASC').all();

    const rows = buildings.map((b) => {
      const branding = db.prepare('SELECT logo_path FROM building_branding WHERE building_id = ?').get(b.id);
      const contracts = db.prepare(`
        SELECT id, title, file_path, created_at
        FROM building_contracts
        WHERE building_id = ?
        ORDER BY created_at DESC
      `).all(b.id);

      return {
        buildingId: b.id,
        buildingName: b.name,
        logoPath: branding?.logo_path || null,
        contracts
      };
    });

    res.json({ items: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HQ: upload/replace building logo
router.post('/hq/buildings/:buildingId/logo', upload.single('file'), (req, res) => {
  try {
    const buildingId = Number(req.params.buildingId);
    if (!buildingId) return res.status(400).json({ error: 'buildingId לא תקין' });
    if (!req.file) return res.status(400).json({ error: 'לא נבחר קובץ לוגו' });

    const relativePath = `/uploads/forms/logos/${req.file.filename}`;

    db.prepare(`
      INSERT INTO building_branding (building_id, logo_path, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(building_id) DO UPDATE SET logo_path = excluded.logo_path, updated_at = CURRENT_TIMESTAMP
    `).run(buildingId, relativePath);

    res.json({ success: true, logoPath: relativePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HQ: upload contract file for a building
router.post('/hq/buildings/:buildingId/contracts', upload.single('file'), (req, res) => {
  try {
    const buildingId = Number(req.params.buildingId);
    const title = (req.body.title || '').trim();

    if (!buildingId) return res.status(400).json({ error: 'buildingId לא תקין' });
    if (!title) return res.status(400).json({ error: 'כותרת חוזה היא שדה חובה' });
    if (!req.file) return res.status(400).json({ error: 'לא נבחר קובץ חוזה' });

    const relativePath = `/uploads/forms/contracts/${req.file.filename}`;

    const result = db.prepare(`
      INSERT INTO building_contracts (building_id, title, file_path)
      VALUES (?, ?, ?)
    `).run(buildingId, title, relativePath);

    res.status(201).json({ success: true, contractId: result.lastInsertRowid, filePath: relativePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HQ: delete contract
router.delete('/hq/contracts/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = db.prepare('SELECT * FROM building_contracts WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'חוזה לא נמצא' });

    db.prepare('DELETE FROM building_contracts WHERE id = ?').run(id);

    // Best-effort file cleanup
    if (row.file_path) {
      const absolute = path.join(__dirname, '..', '..', row.file_path.replace(/^\//, ''));
      if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Site manager: interactive form templates
router.get('/site/templates', (req, res) => {
  res.json({
    templates: Object.values(TEMPLATE_DEFS).map(({ key, label }) => ({ key, label }))
  });
});

// Site manager: recipients lookup (for structured sending)
router.get('/site/recipients', (req, res) => {
  try {
    const type = String(req.query.type || '').trim(); // tenant | supplier
    const buildingId = Number(req.query.buildingId || 0);

    if (!['tenant', 'supplier'].includes(type)) {
      return res.status(400).json({ error: 'type חייב להיות tenant או supplier' });
    }

    if (type === 'tenant') {
      if (!buildingId) return res.status(400).json({ error: 'לבחירת דיירים יש לשלוח buildingId' });

      const tenants = db.prepare(`
        SELECT id, name, phone, email, apartment_number, floor, building_id
        FROM tenants
        WHERE building_id = ?
        ORDER BY CAST(floor AS INTEGER) ASC, CAST(apartment_number AS INTEGER) ASC, name ASC
      `).all(buildingId);

      return res.json({ items: tenants });
    }

    const suppliers = db.prepare(`
      SELECT id, name, phone, email
      FROM suppliers
      ORDER BY name ASC
    `).all();

    return res.json({ items: suppliers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Site manager: send interactive form
router.post('/site/send', async (req, res) => {
  try {
    const {
      templateKey,
      recipientType, // supplier | tenant
      recipientId,
      buildingId,
      recipientName,
      recipientContact,
      title,
      message,
      amount,
      deliveryMode
    } = req.body;

    if (!templateKey) return res.status(400).json({ error: 'סוג טופס הוא שדה חובה' });
    if (!TEMPLATE_DEFS[templateKey]) return res.status(400).json({ error: 'סוג טופס לא מוכר' });
    if (!recipientType || !['supplier', 'tenant'].includes(recipientType)) return res.status(400).json({ error: 'סוג נמען לא תקין' });

    const parsedRecipientId = recipientId ? Number(recipientId) : null;
    const parsedBuildingId = buildingId ? Number(buildingId) : null;

    let resolvedName = (recipientName || '').trim();
    let resolvedContact = (recipientContact || '').trim();
    let resolvedTenantId = null;
    let resolvedSupplierId = null;
    let resolvedBuildingId = parsedBuildingId || null;

    if (recipientType === 'tenant') {
      if (parsedRecipientId) {
        const tenant = db.prepare(`
          SELECT id, name, phone, email, building_id
          FROM tenants
          WHERE id = ?
        `).get(parsedRecipientId);

        if (!tenant) return res.status(400).json({ error: 'דייר לא נמצא' });

        resolvedTenantId = tenant.id;
        resolvedBuildingId = tenant.building_id;
        resolvedName = tenant.name;
        resolvedContact = tenant.phone || tenant.email || resolvedContact;
      }

      if (!resolvedName) {
        return res.status(400).json({ error: 'שם נמען הוא שדה חובה' });
      }

      if (!resolvedBuildingId) {
        return res.status(400).json({ error: 'לדייר חובה לבחור מבנה' });
      }
    }

    if (recipientType === 'supplier') {
      if (parsedRecipientId) {
        const supplier = db.prepare(`
          SELECT id, name, phone, email
          FROM suppliers
          WHERE id = ?
        `).get(parsedRecipientId);

        if (!supplier) return res.status(400).json({ error: 'ספק לא נמצא' });

        resolvedSupplierId = supplier.id;
        resolvedName = supplier.name;
        resolvedContact = supplier.phone || supplier.email || resolvedContact;
      }

      if (!resolvedName) {
        return res.status(400).json({ error: 'שם נמען הוא שדה חובה' });
      }
    }

    const payloadObj = {
      title: title || '',
      message: message || '',
      amount: amount || null
    };
    const payload = JSON.stringify(payloadObj);

    const requestedMode = String(deliveryMode || 'manual').toLowerCase();
    const deliveryChannel = 'whatsapp';
    const resolvedDeliveryMode = requestedMode === 'live' ? 'live' : 'manual';
    const deliveryStatus = resolvedDeliveryMode === 'live' ? 'sending' : 'queued';

    const result = db.prepare(`
      INSERT INTO form_dispatches (
        template_key, recipient_type, recipient_name, recipient_contact,
        building_id, tenant_id, supplier_id, payload_json, status,
        delivery_channel, delivery_mode, delivery_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?, ?, ?)
    `).run(
      templateKey,
      recipientType,
      resolvedName,
      resolvedContact,
      resolvedBuildingId,
      resolvedTenantId,
      resolvedSupplierId,
      payload,
      deliveryChannel,
      resolvedDeliveryMode,
      deliveryStatus
    );

    const id = result.lastInsertRowid;
    const formUrl = `/forms/fill/${id}`;

    const previewMessage = buildDispatchMessage({
      id,
      template_key: templateKey,
      recipient_name: resolvedName
    }, payloadObj);

    insertDeliveryLog({
      dispatchId: id,
      channel: deliveryChannel,
      mode: resolvedDeliveryMode,
      status: deliveryStatus,
      messagePreview: previewMessage,
      error: null
    });

    let finalDeliveryStatus = deliveryStatus;
    let deliveryError = null;

    if (resolvedDeliveryMode === 'live') {
      const normalizedRecipient = normalizePhone(resolvedContact);
      const allowlist = getLiveAllowlist();

      if (!normalizedRecipient || !allowlist.includes(normalizedRecipient)) {
        finalDeliveryStatus = 'blocked';
        deliveryError = 'מספר לא מורשה ל-LIVE';
      } else {
        const waStatus = whatsappService.getStatus();
        if (!waStatus.isReady) {
          finalDeliveryStatus = 'failed';
          deliveryError = 'וואטסאפ לא מחובר';
        } else {
          try {
            await whatsappService.sendMessage(resolvedContact, previewMessage);
            finalDeliveryStatus = 'sent';
          } catch (sendError) {
            finalDeliveryStatus = 'failed';
            deliveryError = sendError.message || 'send failed';
          }
        }
      }

      db.prepare(`
        UPDATE form_dispatches
        SET delivery_status = ?,
            external_message_id = CASE WHEN ? = 'sent' THEN ? ELSE external_message_id END,
            delivery_error = ?
        WHERE id = ?
      `).run(finalDeliveryStatus, finalDeliveryStatus, finalDeliveryStatus === 'sent' ? `wa-live-${Date.now()}` : null, deliveryError, id);

      insertDeliveryLog({
        dispatchId: id,
        channel: deliveryChannel,
        mode: resolvedDeliveryMode,
        status: finalDeliveryStatus,
        messagePreview: previewMessage,
        error: deliveryError
      });
    }

    res.status(201).json({
      success: true,
      dispatchId: id,
      formUrl,
      delivery: {
        channel: deliveryChannel,
        mode: resolvedDeliveryMode,
        status: finalDeliveryStatus,
        error: deliveryError,
        previewMessage
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Site manager: sent forms history
router.get('/site/dispatches', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT fd.id, fd.template_key, fd.recipient_type, fd.recipient_name, fd.recipient_contact,
             fd.status, fd.created_at, fd.opened_at, fd.submitted_at,
             fd.delivery_channel, fd.delivery_mode, fd.delivery_status, fd.external_message_id, fd.delivery_error,
             fd.building_id, b.name AS building_name,
             fd.tenant_id, fd.supplier_id
      FROM form_dispatches fd
      LEFT JOIN buildings b ON b.id = fd.building_id
      ORDER BY fd.created_at DESC
      LIMIT 100
    `).all();

    res.json({ items: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public form fill: get dispatch details
router.get('/site/dispatches/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id לא תקין' });

    const dispatch = db.prepare(`
      SELECT fd.id, fd.template_key, fd.recipient_type, fd.recipient_name, fd.recipient_contact,
             fd.status, fd.created_at, fd.opened_at, fd.submitted_at,
             fd.delivery_channel, fd.delivery_mode, fd.delivery_status, fd.external_message_id, fd.delivery_error,
             fd.payload_json, b.name AS building_name
      FROM form_dispatches fd
      LEFT JOIN buildings b ON b.id = fd.building_id
      WHERE fd.id = ?
    `).get(id);

    if (!dispatch) return res.status(404).json({ error: 'טופס לא נמצא' });

    const template = TEMPLATE_DEFS[dispatch.template_key];
    if (!template) return res.status(400).json({ error: 'תבנית טופס לא נתמכת' });

    if (dispatch.status === 'sent') {
      db.prepare(`
        UPDATE form_dispatches
        SET status = 'opened', opened_at = COALESCE(opened_at, CURRENT_TIMESTAMP)
        WHERE id = ?
      `).run(id);
      dispatch.status = 'opened';
      dispatch.opened_at = dispatch.opened_at || new Date().toISOString();
    }

    const existingSubmission = db.prepare(`
      SELECT answers_json, submitted_by_name, submitted_by_contact, created_at
      FROM form_submissions
      WHERE dispatch_id = ?
    `).get(id);

    res.json({
      item: {
        ...dispatch,
        payload: dispatch.payload_json ? JSON.parse(dispatch.payload_json) : {},
        template,
        submission: existingSubmission
          ? {
              ...existingSubmission,
              answers: existingSubmission.answers_json ? JSON.parse(existingSubmission.answers_json) : {}
            }
          : null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public form fill: submit answers
router.post('/site/dispatches/:id/submit', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id לא תקין' });

    const dispatch = db.prepare(`
      SELECT id, template_key, status
      FROM form_dispatches
      WHERE id = ?
    `).get(id);

    if (!dispatch) return res.status(404).json({ error: 'טופס לא נמצא' });

    if (dispatch.status === 'submitted') {
      return res.status(409).json({ error: 'טופס כבר נשלח' });
    }

    const template = TEMPLATE_DEFS[dispatch.template_key];
    if (!template) return res.status(400).json({ error: 'תבנית טופס לא נתמכת' });

    const { answers = {}, submittedByName = '', submittedByContact = '' } = req.body || {};

    for (const field of template.fields) {
      if (field.required) {
        const value = answers[field.key];
        const isEmpty = value === undefined || value === null || value === '' || value === false;
        if (isEmpty) {
          return res.status(400).json({ error: `השדה "${field.label}" הוא חובה` });
        }
      }
    }

    db.prepare(`
      INSERT INTO form_submissions (dispatch_id, template_key, answers_json, submitted_by_name, submitted_by_contact)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(dispatch_id) DO UPDATE SET
        answers_json = excluded.answers_json,
        submitted_by_name = excluded.submitted_by_name,
        submitted_by_contact = excluded.submitted_by_contact
    `).run(
      id,
      dispatch.template_key,
      JSON.stringify(answers),
      String(submittedByName || '').trim() || null,
      String(submittedByContact || '').trim() || null
    );

    db.prepare(`
      UPDATE form_dispatches
      SET status = 'submitted',
          submitted_at = CURRENT_TIMESTAMP,
          opened_at = COALESCE(opened_at, CURRENT_TIMESTAMP)
      WHERE id = ?
    `).run(id);

    res.json({ success: true, status: 'submitted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HQ: list dispatches with status and submission flag
router.get('/hq/dispatches', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT fd.id, fd.template_key, fd.recipient_type, fd.recipient_name, fd.recipient_contact,
             fd.status, fd.created_at, fd.opened_at, fd.submitted_at,
             fd.delivery_channel, fd.delivery_mode, fd.delivery_status, fd.external_message_id, fd.delivery_error,
             fd.building_id, b.name AS building_name,
             CASE WHEN fs.id IS NULL THEN 0 ELSE 1 END AS has_submission
      FROM form_dispatches fd
      LEFT JOIN buildings b ON b.id = fd.building_id
      LEFT JOIN form_submissions fs ON fs.dispatch_id = fd.id
      ORDER BY fd.created_at DESC
      LIMIT 300
    `).all();

    res.json({ items: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HQ: dispatch details + submitted answers
router.get('/hq/dispatches/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id לא תקין' });

    const dispatch = db.prepare(`
      SELECT fd.id, fd.template_key, fd.recipient_type, fd.recipient_name, fd.recipient_contact,
             fd.status, fd.created_at, fd.opened_at, fd.submitted_at,
             fd.delivery_channel, fd.delivery_mode, fd.delivery_status, fd.external_message_id, fd.delivery_error,
             fd.payload_json, b.name AS building_name
      FROM form_dispatches fd
      LEFT JOIN buildings b ON b.id = fd.building_id
      WHERE fd.id = ?
    `).get(id);

    if (!dispatch) return res.status(404).json({ error: 'טופס לא נמצא' });

    const submission = db.prepare(`
      SELECT answers_json, submitted_by_name, submitted_by_contact, created_at
      FROM form_submissions
      WHERE dispatch_id = ?
    `).get(id);

    res.json({
      item: {
        ...dispatch,
        payload: dispatch.payload_json ? JSON.parse(dispatch.payload_json) : {},
        submission: submission
          ? {
              ...submission,
              answers: submission.answers_json ? JSON.parse(submission.answers_json) : {}
            }
          : null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HQ: delivery logs
router.get('/hq/dispatches/:id/delivery-logs', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id לא תקין' });

    const rows = db.prepare(`
      SELECT id, channel, mode, status, error, created_at
      FROM form_delivery_logs
      WHERE dispatch_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `).all(id);

    res.json({ items: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HQ: delivery preview (no external send)
router.get('/hq/dispatches/:id/delivery-preview', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id לא תקין' });

    const dispatch = db.prepare(`
      SELECT id, template_key, recipient_name, recipient_contact, payload_json
      FROM form_dispatches
      WHERE id = ?
    `).get(id);

    if (!dispatch) return res.status(404).json({ error: 'טופס לא נמצא' });

    const payload = dispatch.payload_json ? JSON.parse(dispatch.payload_json) : {};
    const previewMessage = buildDispatchMessage(dispatch, payload);

    res.json({
      item: {
        dispatchId: dispatch.id,
        recipientName: dispatch.recipient_name,
        recipientContact: dispatch.recipient_contact,
        formUrl: `/forms/fill/${dispatch.id}`,
        previewMessage
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HQ: send live via WhatsApp (explicit, allowlist-protected)
router.post('/hq/dispatches/:id/send-live', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'id לא תקין' });

    const dispatch = db.prepare(`
      SELECT id, template_key, recipient_name, recipient_contact, payload_json,
             delivery_status, delivery_mode
      FROM form_dispatches
      WHERE id = ?
    `).get(id);

    if (!dispatch) return res.status(404).json({ error: 'טופס לא נמצא' });

    const normalizedRecipient = normalizePhone(dispatch.recipient_contact);
    const allowlist = getLiveAllowlist();
    if (!normalizedRecipient || !allowlist.includes(normalizedRecipient)) {
      return res.status(403).json({
        error: 'המספר לא מורשה לשליחת LIVE',
        details: 'השליחה בלייב מוגבלת למספרי TEST בלבד'
      });
    }

    const status = whatsappService.getStatus();
    if (!status.isReady) {
      return res.status(400).json({ error: 'וואטסאפ לא מחובר כרגע' });
    }

    const payload = dispatch.payload_json ? JSON.parse(dispatch.payload_json) : {};
    const message = buildDispatchMessage(dispatch, payload);

    db.prepare(`
      UPDATE form_dispatches
      SET delivery_mode = 'live', delivery_status = 'sending', delivery_error = NULL
      WHERE id = ?
    `).run(id);

    insertDeliveryLog({
      dispatchId: id,
      channel: 'whatsapp',
      mode: 'live',
      status: 'sending',
      messagePreview: message,
      error: null
    });

    try {
      await whatsappService.sendMessage(dispatch.recipient_contact, message);

      db.prepare(`
        UPDATE form_dispatches
        SET delivery_status = 'sent', external_message_id = ?, delivery_error = NULL
        WHERE id = ?
      `).run(`wa-local-${Date.now()}`, id);

      insertDeliveryLog({
        dispatchId: id,
        channel: 'whatsapp',
        mode: 'live',
        status: 'sent',
        messagePreview: message,
        error: null
      });

      return res.json({ success: true, deliveryStatus: 'sent' });
    } catch (sendError) {
      const errMsg = sendError.message || 'send failed';
      db.prepare(`
        UPDATE form_dispatches
        SET delivery_status = 'failed', delivery_error = ?
        WHERE id = ?
      `).run(errMsg, id);

      insertDeliveryLog({
        dispatchId: id,
        channel: 'whatsapp',
        mode: 'live',
        status: 'failed',
        messagePreview: message,
        error: errMsg
      });

      return res.status(500).json({ error: errMsg });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
