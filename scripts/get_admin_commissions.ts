(async function(){
  const base = 'http://localhost:3000';
  const fetch = (await import('node-fetch')).default;
  try {
    const login = await fetch(base + '/api/auth/admin-login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ mobile: '9691827337', password: '888981' }) });
    const admin = (await login.json()) as { uid?: string; [key: string]: any };
    const uid = admin.uid || '';
    console.log('admin=', admin);
    const userRes = await fetch(base + `/api/users/${uid}`);
    const user = await userRes.json();
    console.log('admin user=', user);
    const res = await fetch(base + `/api/admin/commissions?uid=${encodeURIComponent(uid)}`);
    const data = await res.text();
    console.log('status=', res.status);
    console.log(data);
  } catch (err) { console.error(err); process.exit(1); }
})();
