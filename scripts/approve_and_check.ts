(async function(){
  const base = 'http://localhost:3000';
  const fetch = (await import('node-fetch')).default;
  try {
    const login = await fetch(base + '/api/auth/admin-login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ mobile: '9691827337', password: '888981' }) });
    const admin = (await login.json()) as { uid?: string; [key: string]: any };
    const uid = admin.uid || '';
    const partsRes = await fetch(base + `/api/partners?uid=${encodeURIComponent(uid)}`);
    const parts = await partsRes.json() as any[];
    const p = parts[0];
    console.log('Approving partner id=', p._id, 'userId=', p.userId);
    const approveRes = await fetch(base + `/api/partners/${p._id}/approve`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ uid }) });
    const apr = await approveRes.json();
    console.log('approveResp=', apr);
    const userRes = await fetch(base + `/api/users/${p.userId}`);
    const user = await userRes.json();
    console.log('user after approve=', user);
  } catch (err) { console.error('err', err); process.exit(1); }
})();
