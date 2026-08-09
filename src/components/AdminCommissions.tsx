import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AdminCommissions() {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const partners = await api.getPartners();
      const all = await Promise.all((partners || []).map(async (p:any) => {
        try {
          const list = await api.getPartnerCommissions(p.userId || p.userId || p._id || '');
          return (list || []).map((c:any) => ({...c, partnerName: p.partnerName || p.partnerName}));
        } catch (err) { return []; }
      }));
      setCommissions((all || []).flat());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  if (loading) return <div>Loading commissions...</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Partner Commissions</h3>
      {commissions.length === 0 && <div className="text-sm text-slate-500">No commissions found.</div>}
      {commissions.map(c => (
        <div key={c._id || c.transactionId} className="p-3 bg-white rounded-2xl border">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-bold">Partner: {c.partnerName || c.partnerId}</div>
              <div className="text-sm text-slate-500">Txn: {c.transactionId} · Amount: ₹{(c.commissionAmount||0).toLocaleString()}</div>
            </div>
            <div className="text-sm">{c.status}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
