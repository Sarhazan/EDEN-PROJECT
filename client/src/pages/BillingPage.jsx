import { useEffect, useMemo, useState } from 'react';
import { FaMoneyBillWave, FaExclamationTriangle, FaBell, FaPaperPlane, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:3002/api';

const formatCurrency = (value) => `${Number(value || 0).toFixed(2)} ₪`;

export default function BillingPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingTenantId, setSendingTenantId] = useState(null);

  const fetchDashboard = async () => {
    const response = await fetch(`${API_URL}/billing/dashboard`);
    if (!response.ok) throw new Error('שגיאה בטעינת דשבורד גבייה');
    const data = await response.json();
    setDashboard(data);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        await fetchDashboard();
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const sendPaymentRequest = async (tenant) => {
    try {
      setSendingTenantId(tenant.id);

      const reqResponse = await fetch(`${API_URL}/billing/tenants/${tenant.id}/request-payment`, {
        method: 'POST'
      });
      const reqData = await reqResponse.json();

      if (!reqResponse.ok) {
        throw new Error(reqData.error || 'שגיאה ביצירת בקשת תשלום');
      }

      if (!reqData.phone) {
        throw new Error('אין מספר טלפון לדייר');
      }

      const waResponse = await fetch(`${API_URL}/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: reqData.phone,
          message: reqData.message
        })
      });

      const waData = await waResponse.json();
      if (!waResponse.ok) {
        throw new Error(waData.error || 'שגיאה בשליחת הודעת WhatsApp');
      }

      toast.success(`בקשת תשלום נשלחה ל-${tenant.name}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSendingTenantId(null);
    }
  };

  if (loading) {
    return <div className="p-6">טוען דשבורד גבייה...</div>;
  }

  const kpi = dashboard?.kpi || {};
  const overdueTenants = dashboard?.overdue_tenants || [];
  const recentPayments = dashboard?.recent_payments || [];

  const alerts = useMemo(() => {
    const overdueTenantsCount = overdueTenants.length;
    const totalOverdueBalance = overdueTenants.reduce((sum, tenant) => sum + Number(tenant.open_balance || 0), 0);

    return {
      overdueTenantsCount,
      totalOverdueBalance,
      hasAlerts: overdueTenantsCount > 0
    };
  }, [overdueTenants]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">גבייה</h1>
        <p className="text-gray-600 mt-1">דשבורד גבייה, התראות ודיירים באיחור</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="סה״כ חיובים" value={kpi.total_charges || 0} icon={FaMoneyBillWave} color="text-blue-600" />
        <KpiCard title="סה״כ לחיוב" value={formatCurrency(kpi.total_billed)} icon={FaMoneyBillWave} color="text-indigo-600" />
        <KpiCard title="סה״כ נגבה" value={formatCurrency(kpi.total_paid)} icon={FaMoneyBillWave} color="text-green-600" />
        <KpiCard title="יתרה פתוחה" value={formatCurrency(kpi.total_open)} icon={FaExclamationTriangle} color="text-red-600" />
      </div>

      <div className={`rounded-xl border p-4 ${alerts.hasAlerts ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
        <div className="flex items-center gap-2">
          {alerts.hasAlerts ? <FaBell className="text-amber-600" /> : <FaCheckCircle className="text-emerald-600" />}
          <h2 className="text-lg font-bold">
            {alerts.hasAlerts ? 'התראות אי-תשלום פעילות' : 'אין התראות אי-תשלום'}
          </h2>
        </div>
        <p className="mt-2 text-sm text-gray-700">
          {alerts.hasAlerts
            ? `${alerts.overdueTenantsCount} דיירים באיחור, יתרה כוללת ${formatCurrency(alerts.totalOverdueBalance)}`
            : 'כל הדיירים מעודכנים בתשלומים נכון לעכשיו.'}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-xl font-bold mb-4">רשימת דיירים באיחור</h2>

        {overdueTenants.length === 0 ? (
          <div className="text-gray-500">אין כרגע דיירים באיחור ✅</div>
        ) : (
          <div className="space-y-3">
            {overdueTenants.map((tenant) => (
              <div key={tenant.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-red-100 rounded-lg p-4 bg-red-50/40">
                <div>
                  <div className="font-bold text-gray-900">{tenant.name}</div>
                  <div className="text-sm text-gray-700">{tenant.building_name || 'ללא מבנה'} · קומה {tenant.floor} · דירה {tenant.apartment_number}</div>
                  <div className="text-sm text-red-700 font-medium mt-1">
                    יתרה פתוחה: {formatCurrency(tenant.open_balance)} · {tenant.overdue_items} חיובים באיחור
                  </div>
                </div>

                <button
                  onClick={() => sendPaymentRequest(tenant)}
                  disabled={sendingTenantId === tenant.id}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-orange-600 disabled:opacity-60"
                >
                  <FaPaperPlane />
                  {sendingTenantId === tenant.id ? 'שולח...' : 'שלח בקשת תשלום'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-xl font-bold mb-4">תשלומים אחרונים</h2>
        {recentPayments.length === 0 ? (
          <div className="text-gray-500">אין תשלומים אחרונים להצגה.</div>
        ) : (
          <div className="space-y-2 text-sm">
            {recentPayments.slice(0, 5).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-b-0 last:pb-0">
                <span className="font-medium text-gray-800">{payment.tenant_name}</span>
                <span className="text-gray-600">{formatCurrency(payment.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">{title}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
        <Icon className={`text-2xl ${color}`} />
      </div>
    </div>
  );
}
