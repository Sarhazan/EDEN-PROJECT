const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { db } = require('../database/schema');

const router = express.Router();

const uploadsRoot = path.join(__dirname, '..', '..', 'uploads', 'forms');
const logoDir = path.join(uploadsRoot, 'logos');
const contractsDir = path.join(uploadsRoot, 'contracts');
const pdfTemplatesDir = path.join(uploadsRoot, 'pdf_templates');

[uploadsRoot, logoDir, contractsDir, pdfTemplatesDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mode = req.query.mode || req.body.mode;
    if (mode === 'logo') return cb(null, logoDir);
    if (mode === 'pdf_template') return cb(null, pdfTemplatesDir);
    cb(null, contractsDir);
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
  const fallbackLabel = TEMPLATE_DEFS[dispatch.template_key]?.label || payload?.templateLabel || dispatch.template_key;
  const resolvedTemplateLabel = payload?.templateLabel || resolveTemplatePresentation(dispatch.template_key, fallbackLabel).label;
  const formUrl = `/forms/fill/${dispatch.id}`;
  const contentText = payload?.templateText || payload?.message;

  const isSignedCustomPdf = Boolean(payload?.isSignedCustomPdf);
  const introLines = isSignedCustomPdf
    ? [
        `שלום ${dispatch.recipient_name}`,
        `טופס ${resolvedTemplateLabel} נשלח אלייך לחתימה`,
        'נא פתח את הקובץ, קרא, וחתום'
      ]
    : [
        `שלום ${dispatch.recipient_name},`,
        `נשלח אליך ${resolvedTemplateLabel}.`
      ];

  return [
    ...introLines,
    payload?.title ? `נושא: ${payload.title}` : null,
    contentText ? `תוכן: ${contentText}` : null,
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
    defaultText: 'נא לעבור על התקנון המצורף ולאשר חתימה בסיום.',
    fields: [
      { key: 'full_name', label: 'שם מלא', type: 'text', required: true },
      { key: 'id_number', label: 'תעודת זהות', type: 'text', required: true },
      { key: 'accepted_regulation', label: 'אני מאשר/ת שקראתי את התקנון', type: 'checkbox', required: true }
    ]
  },
  credit_card: {
    key: 'credit_card',
    label: 'טופס למילוי כרטיס אשראי',
    defaultText: 'נא למלא את פרטי הכרטיס בצורה מלאה ומדויקת.',
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
    defaultText: 'נא להסדיר את התשלום בהקדם ולצרף אסמכתא במידת הצורך.',
    fields: [
      { key: 'full_name', label: 'שם מלא', type: 'text', required: true },
      { key: 'amount', label: 'סכום לתשלום', type: 'number', required: true },
      { key: 'payment_reference', label: 'אסמכתא/הערה', type: 'text', required: false }
    ]
  },
  notice: {
    key: 'notice',
    label: 'טופס הודעה',
    defaultText: 'נא לקרוא את ההודעה ולאשר קבלה.',
    fields: [
      { key: 'full_name', label: 'שם מלא', type: 'text', required: true },
      { key: 'notice_text', label: 'תוכן ההודעה', type: 'textarea', required: true }
    ]
  }
};

function getTemplateMetadataMap() {
  const rows = db.prepare(`
    SELECT template_key, display_name, template_text, is_deleted
    FROM form_template_metadata
  `).all();

  return rows.reduce((acc, row) => {
    acc[row.template_key] = row;
    return acc;
  }, {});
}

function resolveTemplatePresentation(templateKey, fallbackLabel, fallbackText = '') {
  const meta = db.prepare(`
    SELECT display_name, template_text
    FROM form_template_metadata
    WHERE template_key = ?
  `).get(templateKey);

  return {
    label: meta?.display_name?.trim() || fallbackLabel,
    template_text: meta?.template_text ?? fallbackText
  };
}

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

// ─── Custom PDF Templates ──────────────────────────────────────────────────

// HQ: list custom PDF templates
router.get('/hq/custom-templates', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, name, file_path, has_signature,
             signature_page, signature_x, signature_y, signature_width, signature_height,
             created_at
      FROM custom_form_templates
      ORDER BY created_at DESC
    `).all();
    res.json({ items: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HQ: upload custom PDF template
router.post('/hq/custom-templates', upload.single('file'), (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const hasSignature = req.body.has_signature === '1' || req.body.has_signature === 'true' ? 1 : 0;

    const signaturePage = req.body.signature_page ? Number(req.body.signature_page) : null;
    const signatureX = req.body.signature_x ? Number(req.body.signature_x) : null;
    const signatureY = req.body.signature_y ? Number(req.body.signature_y) : null;
    const signatureWidth = req.body.signature_width ? Number(req.body.signature_width) : null;
    const signatureHeight = req.body.signature_height ? Number(req.body.signature_height) : null;

    if (!name) return res.status(400).json({ error: 'שם הטופס הוא שדה חובה' });
    if (!req.file) return res.status(400).json({ error: 'לא נבחר קובץ PDF' });

    if (hasSignature) {
      const valid = Number.isFinite(signaturePage) && signaturePage >= 1
        && Number.isFinite(signatureX) && signatureX >= 0
        && Number.isFinite(signatureY) && signatureY >= 0
        && Number.isFinite(signatureWidth) && signatureWidth > 0
        && Number.isFinite(signatureHeight) && signatureHeight > 0;

      if (!valid) {
        return res.status(400).json({ error: 'בעת בחירת חתימה חובה לשמור מיקום חתימה תקין (עמוד + X/Y + רוחב/גובה)' });
      }
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.pdf') {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'יש לבחור קובץ PDF בלבד' });
    }

    const relativePath = `/uploads/forms/pdf_templates/${req.file.filename}`;

    const result = db.prepare(`
      INSERT INTO custom_form_templates (
        name, file_path, has_signature,
        signature_page, signature_x, signature_y, signature_width, signature_height
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      relativePath,
      hasSignature,
      hasSignature ? signaturePage : null,
      hasSignature ? signatureX : null,
      hasSignature ? signatureY : null,
      hasSignature ? signatureWidth : null,
      hasSignature ? signatureHeight : null
    );

    res.status(201).json({
      success: true,
      item: {
        id: result.lastInsertRowid,
        name,
        file_path: relativePath,
        has_signature: hasSignature,
        signature_placement: hasSignature ? {
          page: signaturePage,
          x: signatureX,
          y: signatureY,
          width: signatureWidth,
          height: signatureHeight
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HQ: delete custom PDF template
router.delete('/hq/custom-templates/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = db.prepare('SELECT * FROM custom_form_templates WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'תבנית לא נמצאה' });

    db.prepare('DELETE FROM custom_form_templates WHERE id = ?').run(id);

    if (row.file_path) {
      const absolute = path.join(__dirname, '..', '..', row.file_path.replace(/^\//, ''));
      if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Site Templates (built-in + custom) ────────────────────────────────────

// Site manager: interactive form templates
router.get('/site/templates', (req, res) => {
  try {
    const metadataMap = getTemplateMetadataMap();
    const custom = db.prepare(`
      SELECT id, name, has_signature,
             signature_page, signature_x, signature_y, signature_width, signature_height
      FROM custom_form_templates
      ORDER BY created_at DESC
    `).all();

    const builtInTemplates = Object.values(TEMPLATE_DEFS)
      .map(({ key, label, defaultText }) => {
        const meta = metadataMap[key] || {};
        return {
          key,
          label: meta.display_name?.trim() || label,
          template_text: meta.template_text ?? defaultText ?? '',
          is_custom_pdf: false,
          is_deleted: meta.is_deleted === 1
        };
      })
      .filter((t) => !t.is_deleted);

    const customTemplates = custom
      .map((t) => {
        const key = `custom_pdf_${t.id}`;
        const meta = metadataMap[key] || {};
        return {
          key,
          label: meta.display_name?.trim() || t.name,
          template_text: meta.template_text ?? '',
          is_custom_pdf: true,
          has_signature: t.has_signature === 1,
          signature_placement: t.has_signature === 1 ? {
            page: t.signature_page,
            x: t.signature_x,
            y: t.signature_y,
            width: t.signature_width,
            height: t.signature_height
          } : null,
          is_deleted: meta.is_deleted === 1
        };
      })
      .filter((t) => !t.is_deleted);

    res.json({ templates: [...builtInTemplates, ...customTemplates] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Site manager: read template editable metadata map
router.get('/site/templates/metadata', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT template_key, display_name, template_text, updated_at
      FROM form_template_metadata
      ORDER BY updated_at DESC
    `).all();

    res.json({ items: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Site manager: update template editable metadata (label + content)
router.put('/site/templates/:templateKey/metadata', (req, res) => {
  try {
    const templateKey = String(req.params.templateKey || '').trim();
    if (!templateKey) return res.status(400).json({ error: 'templateKey הוא שדה חובה' });

    const displayName = String(req.body.displayName || '').trim();
    const templateText = req.body.templateText == null ? '' : String(req.body.templateText);

    const isBuiltIn = Boolean(TEMPLATE_DEFS[templateKey]);
    const isCustom = /^custom_pdf_\d+$/.test(templateKey);

    if (!isBuiltIn && !isCustom) {
      return res.status(404).json({ error: 'תבנית לא נמצאה' });
    }

    if (isCustom) {
      const customId = Number(templateKey.replace('custom_pdf_', ''));
      const customTemplate = db.prepare('SELECT id FROM custom_form_templates WHERE id = ?').get(customId);
      if (!customTemplate) return res.status(404).json({ error: 'תבנית מותאמת לא נמצאה' });
    }

    db.prepare(`
      INSERT INTO form_template_metadata (template_key, display_name, template_text, is_deleted, updated_at)
      VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)
      ON CONFLICT(template_key) DO UPDATE SET
        display_name = excluded.display_name,
        template_text = excluded.template_text,
        is_deleted = 0,
        updated_at = CURRENT_TIMESTAMP
    `).run(templateKey, displayName || null, templateText);

    res.json({
      success: true,
      item: {
        template_key: templateKey,
        display_name: displayName || null,
        template_text: templateText
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Site manager: delete template from Template Center (safe)
router.delete('/site/templates/:templateKey', (req, res) => {
  try {
    const templateKey = String(req.params.templateKey || '').trim();
    if (!templateKey) return res.status(400).json({ error: 'templateKey הוא שדה חובה' });

    const isBuiltIn = Boolean(TEMPLATE_DEFS[templateKey]);
    const isCustom = /^custom_pdf_\d+$/.test(templateKey);

    if (!isBuiltIn && !isCustom) {
      return res.status(404).json({ error: 'תבנית לא נמצאה' });
    }

    const deps = db.prepare(`
      SELECT COUNT(*) AS total
      FROM form_dispatches
      WHERE template_key = ?
    `).get(templateKey);

    if ((deps?.total || 0) > 0) {
      return res.status(409).json({
        error: 'לא ניתן למחוק תבנית שכבר נשלחה לנמענים. כדי לשמור על היסטוריה, המחיקה נחסמה.',
        code: 'TEMPLATE_HAS_DEPENDENCIES',
        dependencyCount: deps.total
      });
    }

    if (isCustom) {
      const customId = Number(templateKey.replace('custom_pdf_', ''));
      const row = db.prepare('SELECT * FROM custom_form_templates WHERE id = ?').get(customId);
      if (!row) return res.status(404).json({ error: 'תבנית מותאמת לא נמצאה' });

      db.prepare('DELETE FROM custom_form_templates WHERE id = ?').run(customId);
      db.prepare('DELETE FROM form_template_metadata WHERE template_key = ?').run(templateKey);

      if (row.file_path) {
        const absolute = path.join(__dirname, '..', '..', row.file_path.replace(/^\//, ''));
        if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
      }
    } else {
      db.prepare(`
        INSERT INTO form_template_metadata (template_key, is_deleted, updated_at)
        VALUES (?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(template_key) DO UPDATE SET
          is_deleted = 1,
          updated_at = CURRENT_TIMESTAMP
      `).run(templateKey);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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

    // Resolve custom PDF template
    let customTemplate = null;
    const isCustomPdf = templateKey.startsWith('custom_pdf_');
    if (isCustomPdf) {
      const customId = Number(templateKey.replace('custom_pdf_', ''));
      customTemplate = db.prepare('SELECT * FROM custom_form_templates WHERE id = ?').get(customId);
      if (!customTemplate) return res.status(400).json({ error: 'תבנית PDF לא נמצאה' });
    } else if (!TEMPLATE_DEFS[templateKey]) {
      return res.status(400).json({ error: 'סוג טופס לא מוכר' });
    }
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

    const templatePresentation = resolveTemplatePresentation(
      templateKey,
      isCustomPdf ? customTemplate.name : TEMPLATE_DEFS[templateKey].label,
      isCustomPdf ? '' : TEMPLATE_DEFS[templateKey].defaultText || ''
    );

    const payloadObj = {
      title: title || '',
      message: message || '',
      templateLabel: templatePresentation.label,
      templateText: (message || templatePresentation.template_text || '').trim(),
      amount: amount || null,
      isSignedCustomPdf: Boolean(isCustomPdf && customTemplate?.has_signature)
    };
    const payload = JSON.stringify(payloadObj);

    const requestedMode = String(deliveryMode || 'manual').toLowerCase();
    const deliveryChannel = 'whatsapp';
    const resolvedDeliveryMode = requestedMode === 'live' ? 'live' : 'manual';
    const deliveryStatus = resolvedDeliveryMode === 'live' ? 'sending' : 'queued';

    const hasSignatureVal = customTemplate ? (customTemplate.has_signature ? 1 : 0) : 0;

    const result = db.prepare(`
      INSERT INTO form_dispatches (
        template_key, recipient_type, recipient_name, recipient_contact,
        building_id, tenant_id, supplier_id, payload_json, status,
        delivery_channel, delivery_mode, delivery_status,
        custom_template_id, has_signature
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?, ?, ?, ?, ?)
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
      deliveryStatus,
      customTemplate ? customTemplate.id : null,
      hasSignatureVal
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

router.get('/site/dispatches/pending-signature', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT fd.id, fd.template_key, fd.recipient_type, fd.recipient_name, fd.recipient_contact,
             fd.status, fd.created_at, fd.opened_at, fd.submitted_at, fd.signed_at,
             fd.delivery_channel, fd.delivery_mode, fd.delivery_status,
             fd.building_id, b.name AS building_name
      FROM form_dispatches fd
      LEFT JOIN buildings b ON b.id = fd.building_id
      WHERE fd.has_signature = 1
        AND fd.status IN ('sent', 'opened', 'submitted')
      ORDER BY fd.created_at DESC
      LIMIT 200
    `).all();

    res.json({ items: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/site/dispatches/sent-today', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT fd.id, fd.template_key, fd.recipient_type, fd.recipient_name, fd.recipient_contact,
             fd.status, fd.created_at, fd.opened_at, fd.submitted_at, fd.signed_at,
             fd.delivery_channel, fd.delivery_mode, fd.delivery_status,
             fd.building_id, b.name AS building_name
      FROM form_dispatches fd
      LEFT JOIN buildings b ON b.id = fd.building_id
      WHERE DATE(fd.created_at, 'localtime') = DATE('now', 'localtime')
      ORDER BY fd.created_at DESC
      LIMIT 200
    `).all();

    res.json({ items: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/site/dispatches/history', (req, res) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
    const offset = (page - 1) * limit;

    const totalRow = db.prepare('SELECT COUNT(*) AS total FROM form_dispatches').get();
    const rows = db.prepare(`
      SELECT fd.id, fd.template_key, fd.recipient_type, fd.recipient_name, fd.recipient_contact,
             fd.status, fd.created_at, fd.opened_at, fd.submitted_at, fd.signed_at,
             fd.delivery_channel, fd.delivery_mode, fd.delivery_status,
             fd.building_id, b.name AS building_name
      FROM form_dispatches fd
      LEFT JOIN buildings b ON b.id = fd.building_id
      ORDER BY fd.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    res.json({
      items: rows,
      page,
      limit,
      total: totalRow?.total || 0,
      hasMore: offset + rows.length < (totalRow?.total || 0)
    });
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
             fd.payload_json, fd.custom_template_id, fd.has_signature, fd.signed_at,
             b.name AS building_name,
             cft.name AS custom_template_name, cft.file_path AS custom_template_file,
             cft.signature_page AS custom_signature_page,
             cft.signature_x AS custom_signature_x,
             cft.signature_y AS custom_signature_y,
             cft.signature_width AS custom_signature_width,
             cft.signature_height AS custom_signature_height
      FROM form_dispatches fd
      LEFT JOIN buildings b ON b.id = fd.building_id
      LEFT JOIN custom_form_templates cft ON cft.id = fd.custom_template_id
      WHERE fd.id = ?
    `).get(id);

    if (!dispatch) return res.status(404).json({ error: 'טופס לא נמצא' });

    // Resolve template definition
    let template;
    if (dispatch.custom_template_id && dispatch.custom_template_file) {
      const presentation = resolveTemplatePresentation(dispatch.template_key, dispatch.custom_template_name || 'טופס PDF', '');
      template = {
        key: dispatch.template_key,
        label: presentation.label,
        template_text: presentation.template_text,
        is_custom_pdf: true,
        pdf_url: dispatch.custom_template_file,
        has_signature: dispatch.has_signature === 1,
        signature_placement: dispatch.has_signature === 1 ? {
          page: dispatch.custom_signature_page,
          x: dispatch.custom_signature_x,
          y: dispatch.custom_signature_y,
          width: dispatch.custom_signature_width,
          height: dispatch.custom_signature_height
        } : null
      };
    } else {
      const baseTemplate = TEMPLATE_DEFS[dispatch.template_key];
      if (!baseTemplate) return res.status(400).json({ error: 'תבנית טופס לא נתמכת' });
      const presentation = resolveTemplatePresentation(dispatch.template_key, baseTemplate.label, baseTemplate.defaultText || '');
      template = {
        ...baseTemplate,
        label: presentation.label,
        template_text: presentation.template_text
      };
    }

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
        has_signature: dispatch.has_signature === 1,
        signed_at: dispatch.signed_at || null,
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
      SELECT id, template_key, status, custom_template_id, has_signature
      FROM form_dispatches
      WHERE id = ?
    `).get(id);

    if (!dispatch) return res.status(404).json({ error: 'טופס לא נמצא' });

    if (dispatch.status === 'submitted' || dispatch.status === 'signed') {
      return res.status(409).json({ error: 'טופס כבר הוגש' });
    }

    const { answers = {}, submittedByName = '', submittedByContact = '', signature_dataurl = null } = req.body || {};

    // For built-in templates: validate required fields
    if (!dispatch.custom_template_id) {
      const template = TEMPLATE_DEFS[dispatch.template_key];
      if (!template) return res.status(400).json({ error: 'תבנית טופס לא נתמכת' });

      for (const field of template.fields) {
        if (field.required) {
          const value = answers[field.key];
          const isEmpty = value === undefined || value === null || value === '' || value === false;
          if (isEmpty) {
            return res.status(400).json({ error: `השדה "${field.label}" הוא חובה` });
          }
        }
      }
    }

    // For signature forms: validate signature provided
    if (dispatch.has_signature && !signature_dataurl) {
      return res.status(400).json({ error: 'נדרשת חתימה להגשת הטופס' });
    }

    const submissionAnswers = { ...answers };
    if (signature_dataurl) {
      submissionAnswers._signature = signature_dataurl;
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
      JSON.stringify(submissionAnswers),
      String(submittedByName || '').trim() || null,
      String(submittedByContact || '').trim() || null
    );

    const finalStatus = (dispatch.has_signature && signature_dataurl) ? 'signed' : 'submitted';
    const signedAt = finalStatus === 'signed' ? 'CURRENT_TIMESTAMP' : 'NULL';

    db.prepare(`
      UPDATE form_dispatches
      SET status = ?,
          submitted_at = CURRENT_TIMESTAMP,
          signed_at = CASE WHEN ? = 'signed' THEN CURRENT_TIMESTAMP ELSE signed_at END,
          opened_at = COALESCE(opened_at, CURRENT_TIMESTAMP)
      WHERE id = ?
    `).run(finalStatus, finalStatus, id);

    res.json({ success: true, status: finalStatus });
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
