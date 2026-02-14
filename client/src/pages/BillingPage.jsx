import { Fragment, useEffect, useMemo, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../components/forms/datepicker-custom.css';
import { FaBell, FaMoneyBillWave, FaPaperPlane } from 'react-icons/fa';
import { useApp } from '../context/AppContext';

const API_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:3002/api';

const parseISODate = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

export default function BillingPage() {
  const { buildings } = useApp();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [tenantSummaries, setTenantSummaries] = useState([]);
  const [paymentsHistory, setPaymentsHistory] = useState([]);
  const [sendingForTenant, setSendingForTenant] = useState(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState('all');
  const [chargeForm, setChargeForm] = useState({
    tenant_id: '',
    amount: '',
    due_date: '',
    description: '',
    billing_type: 'one-time', // one-time | recurring
    period: 'monthly'
  });
  const [paymentForm, setPaymentForm] = useState({ tenant_id: '', charge_id: '', amount: '', method: 'cash', reference: '' });
  const [expandedTenantId, setExpandedTenantId] = useState(null);
  const [tenantDebtDetails, setTenantDebtDetails] = useState({});
  const [loadingDebtForTenant, setLoadingDebtForTenant] = useState(null);

  const overdueAlerts = useMemo(() => {
    return (dashboard?.overdue_tenants || []).filter((t) => Number(t.open_balance || 0) > 0);
  }, [dashboard]);

  async function fetchData() {
    setLoading(true);
    try {
      const query = selectedBuildingId !== 'all' ? `?buildingId=${selectedBuildingId}` : '';
      const [dashboardRes, summariesRes, paymentsRes] = await Promise.all([
        fetch(`${API_URL}/billing/dashboard`),
        fetch(`${API_URL}/billing/tenant-summaries${query}`),
        fetch(`${API_URL}/billing/payments`)
      ]);

      const dashboardData = await dashboardRes.json();
      const summariesData = await summariesRes.json();
      const paymentsData = await paymentsRes.json();

      setDashboard(dashboardData);
      setTenantSummaries(Array.isArray(summariesData) ? summariesData : []);
      setPaymentsHistory(Array.isArray(paymentsData) ? paymentsData : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [selectedBuildingId]);

  async function handleRequestPayment(tenantId) {
    try {
      setSendingForTenant(tenantId);
      const res = await fetch(`${API_URL}/billing/tenants/${tenantId}/request-payment`, { method: 'POST' });
      const data = await res.json();

      const text = `${data.message}\n\nמספר דייר: ${data.phone || 'לא זמין'}`;
      await navigator.clipboard.writeText(text);
      alert(`בקשת התשלום הוכנה והועתקה ללוח (תזכורת #${data.reminder_id}).`);
      await fetchData();
    } catch (error) {
      alert('שגיאה בהכנת בקשת תשלום');
    } finally {
      setSendingForTenant(null);
    }
  }

  async function handleToggleTenantDebt(tenantId) {
    if (expandedTenantId === tenantId) {
      setExpandedTenantId(null);
      return;
    }

    setExpandedTenantId(tenantId);

    if (tenantDebtDetails[tenantId]) {
      return;
    }

    try {
      setLoadingDebtForTenant(tenantId);
      const res = await fetch(`${API_URL}/billing/tenants/${tenantId}`);
      const data = await res.json();

      const overdueUnpaidCharges = (data?.charges || []).filter((charge) => {
        const openAmount = Number(charge.amount || 0) - Number(charge.paid_amount || 0);
        return charge.status === 'overdue' && openAmount > 0;
      });

      setTenantDebtDetails((prev) => ({
        ...prev,
        [tenantId]: overdueUnpaidCharges
      }));
    } catch {
      alert('שגיאה בטעינת פירוט חובות');
    } finally {
      setLoadingDebtForTenant(null);
    }
  }

  async function handleCreateCharge(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/billing/charges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: Number(chargeForm.tenant_id),
          amount: Number(chargeForm.amount),
          due_date: chargeForm.due_date,
          period: chargeForm.billing_type === 'recurring' ? chargeForm.period : null,
          notes: chargeForm.description || null
        })
      });

      if (!res.ok) throw new Error('failed');

      setChargeForm({
        tenant_id: '',
        amount: '',
        due_date: '',
        description: '',
        billing_type: 'one-time',
        period: 'monthly'
      });
      await fetchData();
      alert('חיוב נוצר בהצלחה');
    } catch {
      alert('שגיאה ביצירת חיוב');
    }
  }

  async function handleCreatePayment(e) {
    e.preventDefault();
    try {
      const body = {
        tenant_id: Number(paymentForm.tenant_id),
        amount: Number(paymentForm.amount),
        method: paymentForm.method || null,
        reference: paymentForm.reference || null
      };
      if (paymentForm.charge_id) body.charge_id = Number(paymentForm.charge_id);

      const res = await fetch(`${API_URL}/billing/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error('failed');

      setPaymentForm({ tenant_id: '', charge_id: '', amount: '', method: 'cash', reference: '' });
      await fetchData();
      alert('תשלום נרשם בהצלחה');
    } catch {
      alert('שגיאה ברישום תשלום');
    }
  }

  if (loading) {
    return <div className="p-6">טוען נתוני גבייה...</div>;
  }

  const kpi = dashboard?.kpi || {
    total_billed: 0,
    total_paid: 0,
    overdue_balance: 0,
    overdue_charges: 0
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">גבייה</h1>
          <p className="text-gray-600 mt-1">דשבורד גבייה, איחורים והתראות תשלום</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">סינון לפי מבנה</label>
          <select
            className="border border-gray-300 rounded px-3 py-2"
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
          >
            <option value="all">כל המבנים</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <form onSubmit={handleCreateCharge} className="bg-white border rounded-lg p-4 space-y-3">
          <div className="font-semibold">חיוב חדש</div>
          <div className="grid grid-cols-2 gap-2">
            <select className="border rounded px-3 py-2" value={chargeForm.tenant_id} onChange={(e) => setChargeForm((p) => ({ ...p, tenant_id: e.target.value }))} required>
              <option value="">בחר דייר</option>
              {tenantSummaries.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input className="border rounded px-3 py-2" type="number" step="0.01" min="0" placeholder="סכום" value={chargeForm.amount} onChange={(e) => setChargeForm((p) => ({ ...p, amount: e.target.value }))} required />

            <DatePicker
              selected={parseISODate(chargeForm.due_date)}
              onChange={(date) => {
                if (!date) return;
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                setChargeForm((p) => ({ ...p, due_date: `${year}-${month}-${day}` }));
              }}
              dateFormat="dd/MM/yyyy"
              className="border rounded px-3 py-2"
              required
            />

            <div className="border rounded px-3 py-2 flex items-center gap-4">
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  name="billing_type"
                  value="one-time"
                  checked={chargeForm.billing_type === 'one-time'}
                  onChange={(e) => setChargeForm((p) => ({ ...p, billing_type: e.target.value }))}
                />
                חד פעמית
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  name="billing_type"
                  value="recurring"
                  checked={chargeForm.billing_type === 'recurring'}
                  onChange={(e) => setChargeForm((p) => ({ ...p, billing_type: e.target.value }))}
                />
                חוזרת
              </label>
            </div>

            {chargeForm.billing_type === 'recurring' && (
              <select
                className="border rounded px-3 py-2"
                value={chargeForm.period}
                onChange={(e) => setChargeForm((p) => ({ ...p, period: e.target.value }))}
                required
              >
                <option value="monthly">חודשית</option>
                <option value="semi-annual">חצי שנתית</option>
                <option value="annual">שנתית</option>
              </select>
            )}

            <textarea
              className="border rounded px-3 py-2 col-span-2"
              placeholder="תיאור הגבייה (על מה החיוב)"
              value={chargeForm.description}
              onChange={(e) => setChargeForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              required
            />
          </div>
          <button className="bg-primary text-white px-3 py-2 rounded hover:bg-orange-600">צור חיוב</button>
        </form>

        <form onSubmit={handleCreatePayment} className="bg-white border rounded-lg p-4 space-y-3">
          <div className="font-semibold">רישום תשלום</div>
          <div className="grid grid-cols-2 gap-2">
            <select className="border rounded px-3 py-2" value={paymentForm.tenant_id} onChange={(e) => setPaymentForm((p) => ({ ...p, tenant_id: e.target.value }))} required>
              <option value="">בחר דייר</option>
              {tenantSummaries.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input className="border rounded px-3 py-2" type="number" min="0" placeholder="מספר חיוב (אופציונלי)" value={paymentForm.charge_id} onChange={(e) => setPaymentForm((p) => ({ ...p, charge_id: e.target.value }))} />
            <input className="border rounded px-3 py-2" type="number" step="0.01" min="0" placeholder="סכום" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} required />
            <input className="border rounded px-3 py-2" placeholder="אסמכתא" value={paymentForm.reference} onChange={(e) => setPaymentForm((p) => ({ ...p, reference: e.target.value }))} />
          </div>
          <button className="bg-emerald-600 text-white px-3 py-2 rounded hover:bg-emerald-700">רשום תשלום</button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="סה״כ לחיוב" value={`₪${Number(kpi.total_billed || 0).toLocaleString()}`} />
        <KpiCard title="סה״כ נגבה" value={`₪${Number(kpi.total_paid || 0).toLocaleString()}`} />
        <KpiCard title="חוב באיחור" value={`₪${Number(kpi.overdue_balance || 0).toLocaleString()}`} danger />
        <KpiCard title="חיובים באיחור" value={Number(kpi.overdue_charges || 0)} danger />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3 text-amber-800 font-semibold">
          <FaBell /> התראות אי-תשלום
        </div>

        {overdueAlerts.length === 0 ? (
          <p className="text-sm text-gray-600">אין כרגע דיירים באיחור.</p>
        ) : (
          <ul className="space-y-2">
            {overdueAlerts.map((tenant) => (
              <li key={tenant.id} className="text-sm text-gray-800">
                {tenant.name} ({tenant.building_name || 'ללא מבנה'}) — יתרה פתוחה: ₪{Number(tenant.open_balance || 0).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b font-semibold">דיירים וסטטוס גבייה</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right p-3">דייר</th>
                <th className="text-right p-3">מבנה</th>
                <th className="text-right p-3">חוב באיחור</th>
                <th className="text-right p-3">באיחור</th>
                <th className="text-right p-3">דירוג אשראי</th>
                <th className="text-right p-3">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {tenantSummaries.map((tenant) => {
                const isExpanded = expandedTenantId === tenant.id;
                const debts = tenantDebtDetails[tenant.id] || [];

                return (
                  <Fragment key={tenant.id}>
                    <tr className="border-t">
                      <td className="p-3 font-medium">{tenant.name}</td>
                      <td className="p-3">{tenant.building_name || '-'}</td>
                      <td className="p-3">₪{Number(tenant.overdue_balance || 0).toLocaleString()}</td>
                      <td className="p-3">{Number(tenant.overdue_items || 0)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${riskClass(tenant.risk_level)}`}>
                          {tenant.credit_score} · {riskLabel(tenant.risk_level)}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleTenantDebt(tenant.id)}
                            className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-2 rounded hover:bg-slate-200"
                          >
                            {isExpanded ? 'הסתר חובות' : 'הצג חובות'}
                          </button>
                          <button
                            onClick={() => handleRequestPayment(tenant.id)}
                            disabled={sendingForTenant === tenant.id}
                            className="inline-flex items-center gap-2 bg-primary text-white px-3 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
                          >
                            <FaPaperPlane />
                            {sendingForTenant === tenant.id ? 'שולח...' : 'בקשת תשלום'}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-slate-50 border-t">
                        <td className="p-3" colSpan={6}>
                          {loadingDebtForTenant === tenant.id ? (
                            <div className="text-sm text-gray-600">טוען פירוט חובות...</div>
                          ) : debts.length === 0 ? (
                            <div className="text-sm text-green-700">אין חיובים באיחור שלא שולמו.</div>
                          ) : (
                            <div className="space-y-2">
                              <div className="text-sm font-semibold text-gray-700">חיובים באיחור שלא שולמו:</div>
                              <ul className="space-y-2">
                                {debts.map((charge) => {
                                  const openAmount = Number(charge.amount || 0) - Number(charge.paid_amount || 0);
                                  const overdueDays = getOverdueDays(charge.due_date);
                                  return (
                                    <li key={charge.id} className="text-sm border rounded bg-white px-3 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                      <span>
                                        <span className="font-medium">{charge.notes || `חיוב #${charge.id}`}</span>
                                        <span className="text-gray-500"> · לתשלום עד {formatDateDisplay(charge.due_date)}</span>
                                      </span>
                                      <span className="text-red-700 font-medium">₪{openAmount.toLocaleString()} · איחור {overdueDays} ימים</span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {tenantSummaries.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-gray-500" colSpan={6}>אין נתוני גבייה להצגה</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b font-semibold">תיעוד תקבולים אחרונים</div>
          <div className="p-4">
            {paymentsHistory.length === 0 ? (
              <div className="text-sm text-gray-500">עדיין לא נרשמו תקבולים.</div>
            ) : (
              <ul className="space-y-2 text-sm max-h-64 overflow-auto">
                {paymentsHistory.slice(0, 12).map((p) => (
                  <li key={p.id} className="flex items-center justify-between border rounded px-3 py-2">
                    <span>{p.tenant_name}</span>
                    <span className="text-gray-500">₪{Number(p.amount || 0).toLocaleString()} · {p.method || 'manual'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b font-semibold">תזכורות תשלום אחרונות</div>
          <div className="p-4">
            {(dashboard?.recent_reminders || []).length === 0 ? (
              <div className="text-sm text-gray-500">עדיין לא הוכנו תזכורות.</div>
            ) : (
              <ul className="space-y-2 text-sm max-h-64 overflow-auto">
                {dashboard.recent_reminders.map((r) => (
                  <li key={r.id} className="flex items-center justify-between border rounded px-3 py-2">
                    <span>{r.tenant_name}</span>
                    <span className="text-gray-500">#{r.id} · {r.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 flex items-center gap-2">
        <FaMoneyBillWave />
        Local-first mode: הודעות תשלום מועתקות ללוח לשליחה ידנית.
      </div>
    </div>
  );
}

function formatDateDisplay(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('he-IL');
}

function getOverdueDays(dueDate) {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = now.setHours(0, 0, 0, 0) - due.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function KpiCard({ title, value, danger = false }) {
  return (
    <div className={`rounded-lg p-4 border ${danger ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
      <div className="text-sm text-gray-600">{title}</div>
      <div className={`text-2xl font-bold mt-1 ${danger ? 'text-red-700' : 'text-gray-900'}`}>{value}</div>
    </div>
  );
}

function riskClass(level) {
  if (level === 'high') return 'bg-red-100 text-red-700';
  if (level === 'medium') return 'bg-amber-100 text-amber-700';
  return 'bg-green-100 text-green-700';
}

function riskLabel(level) {
  if (level === 'high') return 'סיכון גבוה';
  if (level === 'medium') return 'סיכון בינוני';
  return 'תקין';
}
