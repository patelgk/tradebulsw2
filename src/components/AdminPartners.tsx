import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AdminPartners({ currentUser }: { currentUser: any }) {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const p = await api.getPartners(currentUser?.uid);
      setPartners(p || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const approve = async (id: string) => {
    if (!confirm('Approve partner?')) return;
    await api.approvePartner(id, currentUser?.uid || 'admin');
    await load();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Partners</h3>
      {partners.map(p => (
        <div key={p._id} className="p-4 bg-white rounded-2xl border">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold">{p.partnerName}</p>
              <p className="text-sm text-slate-500">Code: {p.referralCode || '—'} · Status: {p.status}</p>
            </div>
            <div>
              {p.status !== 'approved' && <button onClick={()=>approve(p._id)} className="px-3 py-1 bg-primary text-white rounded">Approve</button>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
