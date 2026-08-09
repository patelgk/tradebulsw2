import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AdminPayouts({ currentUser }: { currentUser: any }) {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = api.getAllPayouts ? await api.getAllPayouts() : await api.getAdminPayouts(currentUser?.uid || '');
      setPayouts(list || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const markPaid = async (id: string) => {
    const tx = prompt('Enter payment transaction/UTR reference');
    if (!tx) return;
    await api.markPayoutPaid(id, currentUser?.uid || 'admin', tx);
    await load();
  };

  const reject = async (id: string) => {
    const note = prompt('Reason for rejection (optional)') || '';
    await api.rejectPayout(id, currentUser?.uid || 'admin', note);
    await load();
  };

  if (loading) return <div>Loading payouts...</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Payout Requests</h3>
      {payouts.length === 0 && <div className="text-sm text-slate-500">No payout requests.</div>}
      {payouts.map(p => (
        <div key={p._id || p.id} className="p-3 bg-white rounded-2xl border flex justify-between items-center">
          <div>
            <div className="font-bold">Partner: {p.partnerId}</div>
            <div className="text-sm text-slate-500">Amount: ₹{(p.amount||0).toLocaleString()} · Status: {p.status}</div>
            <div className="text-[11px] text-slate-400">Requested: {new Date(p.requestedAt || p.createdAt).toLocaleString()}</div>
          </div>
          <div className="flex gap-2">
            {p.status === 'pending' && (
              <>
                <button onClick={() => markPaid(p._id)} className="px-3 py-1 bg-emerald-500 text-white rounded">Mark Paid</button>
                <button onClick={() => reject(p._id)} className="px-3 py-1 bg-red-500 text-white rounded">Reject</button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
