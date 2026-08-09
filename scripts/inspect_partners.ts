(async function(){
  const base = 'http://localhost:3000';
  const fetch = (await import('node-fetch')).default;
  try {
    const login = await fetch(base + '/api/auth/admin-login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ mobile: '9691827337', password: '888981' }) });
    const admin = await login.json();
    console.log('admin uid=', admin.uid);
    const partsRes = await fetch(base + `/api/partners?uid=${encodeURIComponent(admin.uid)}`);
    const parts = await partsRes.json();
    console.log(JSON.stringify(parts, null, 2));
  } catch (err) { console.error('inspect failed', err); process.exit(1); }
})();
