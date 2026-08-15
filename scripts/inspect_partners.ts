(async function(){
  const base = 'http://localhost:3000';
  const fetch = (await import('node-fetch')).default;
  try {
    const login = await fetch(base + '/api/auth/admin-login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ mobile: '9691827337', password: '888981' }) });
    const admin = (await login.json()) as { uid?: string; [key: string]: any };
    const uid = admin.uid || '';
    console.log('admin uid=', uid);
    const partsRes = await fetch(base + `/api/partners?uid=${encodeURIComponent(uid)}`);
    const parts = await partsRes.json();
    console.log(JSON.stringify(parts, null, 2));
  } catch (err) { console.error('inspect failed', err); process.exit(1); }
})();
