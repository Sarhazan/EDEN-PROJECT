import { useEffect, useState } from 'react';
import { FaMoneyBillWave, FaExclamationTriangle, FaBell, FaPaperPlane } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:3002/api';

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
        alert(error.message);
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

      alert('בקשת התשלום נשלחה בהצלחה');
    } catch (error) {
      alert(error.message);
    } finally {
      setSendingTenantId(null);
    }
  };

  if (loading) {
    return <div className="p-6">טוען דשבורד גבייה...</div>;
  }

  const kpi = dashboard?.kpi || {};
  const overdueTenants = dashboard?.overdue_tenants || [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">גבייה</h1>
        <p className="text-gray-600 mt-1">דשבורד גבייה, התראות ודיירים באיחור</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="סה״כ חיובים" value={kpi.total_charges || 0} icon={FaMoneyBillWave} color="text-blue-600" />
        <KpiCard title="סה״כ לחיוב" value={`${(kpi.total_billed || 0).toFixed(2)} ₪`} icon={FaMoneyBillWave} color="text-indigo-600" />
        <KpiCard title="סה״כ נגבה" value={`${(kpi.total_paid || 0).toFixed(2)} ₪`} icon={FaMoneyBillWave} color="text-green-600" />
        <KpiCard title="יתרה פתוחה" value={`${(kpi.total_open || 0).toFixed(2)} ₪`} icon={FaExclamationTriangle} color="text-red-600" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <FaBell className="text-amber-500" />
          <h2 className="text-xl font-bold">התראות אי-תשלום (דיירים באיחור)</h2>
        </div>

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
                    יתרה פתוחה: {Number(tenant.open_balance || 0).toFixed(2)} ₪ · {tenant.overdue_items} חיובים באיחור
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
