const base = 'http://localhost:3000';

async function req(path: string, opts: any = {}) {
  const url = base + path;
  const res = await fetch(url, opts);
  const txt = await res.text();
  let body: any = txt;
  try { body = JSON.parse(txt); } catch(e) {}
  if (!res.ok) throw new Error(`HTTP ${res.status} ${JSON.stringify(body)}`);
  return body;
}

async function run() {
  console.log('Starting partner E2E flow');
  // 1 create partner user (do not set sensitive 'role' field here)
  const partnerUid = 'partner_test_uid';
  await req('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: partnerUid, email: 'partner@example.com', name: 'Partner Test' }) });
  console.log('Partner user created/upserted');

  // 2 apply (ignore if already applied)
  try {
    const apply = await req('/api/partners/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: partnerUid, partnerName: 'Test Partner' }) });
    console.log('Applied as partner id=', apply.partner._id);
  } catch (err:any) {
    console.warn('Apply failed (possibly already exists):', err.message || err);
  }

  // 3 admin login
  const admin = await req('/api/auth/admin-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: '9691827337', password: '888981' }) });
  console.log('Admin login ok uid=', admin.uid);

  // 4 list partners
  const parts = await req(`/api/partners?uid=${encodeURIComponent(admin.uid)}`);
  const partner = parts[0];
  console.log('Partner record before approve:', partner.referralCode);

  // 5 approve
  await req(`/api/partners/${partner._id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: admin.uid }) });
  console.log('Partner approved');

  // 6 refresh
  const parts2 = await req(`/api/partners?uid=${encodeURIComponent(admin.uid)}`);
  const code = parts2[0].referralCode;
  console.log('Referral code:', code);

  // inspect partner user
  try {
    const partnerUser = await req(`/api/users/${parts2[0].userId}`);
    console.log('Partner user after approve:', { uid: partnerUser.uid, role: partnerUser.role, partnerId: partnerUser.partnerId, partnerCode: partnerUser.partnerCode });
  } catch (e) { console.warn('failed to fetch partner user', e); }

  // 7 record click
  await req('/api/referral/click', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ referralCode: code, partnerId: parts2[0]._id, ip: '127.0.0.1' }) });
  console.log('Recorded click');

  // 8 signup referred user (if exists, fetch existing)
  let signup: any;
  try {
    signup = await req('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'referred@example.com', password: 'pass123', name: 'Referred User', referralCode: code }) });
    console.log('Signed up referred user uid=', signup.uid);
  } catch (err:any) {
    console.warn('Signup failed (maybe exists):', err.message || err);
    // try to find existing user by email
    const all = await req('/api/users');
    const found = (all || []).find((u:any) => u.email === 'referred@example.com');
    if (!found) throw new Error('Referred user not found after signup failure');
    signup = found;
    console.log('Using existing user uid=', signup.uid);
  }

  // 9 create transaction
  const tx = await req('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: signup.uid, type: 'challenge_purchase', amount: 4999, capital: 50000, planName: 'Standard Challenge', challengeName: 'Standard Challenge', invoiceNumber: 'TXN-TEST-1' }) });
  console.log('Transaction created id=', tx.transaction._id);

  // 10 approve transaction
  await req(`/api/transactions/${tx.transaction._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'approved' }) });
  console.log('Transaction approved');

  // 11 check commissions via admin endpoint (some partner checks require role)
  const allComms = await req(`/api/admin/commissions?uid=${encodeURIComponent(admin.uid)}`);
  const comms = (allComms || []).filter((c:any) => c.partnerId === parts2[0]._id);
  console.log('Commissions for partner count=', comms.length, comms[0] ? `amt=${comms[0].commissionAmount}` : '');

  // 12 partner request payout (small amount)
  const payoutReq = await req('/api/partner/payouts/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: partnerUid, amount: 1, paymentMethod: 'manual', payoutDetails: {} }) });
  console.log('Payout requested id=', payoutReq.payout._id);

  // 13 admin list payouts and mark paid
  const pouts = await req(`/api/admin/payouts?uid=${encodeURIComponent(admin.uid)}`);
  console.log('Payouts total=', pouts.length);
  const firstPayoutId = pouts[0]._id;
  await req(`/api/admin/payouts/${firstPayoutId}/mark-paid`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: admin.uid, transactionRef: 'UTR-123456' }) });
  console.log('Payout marked paid id=', firstPayoutId);

  // 14 final checks
  const finalCom = await req('/api/partner/commissions?uid=partner_test_uid');
  const finalPouts = await req('/api/partner/payouts?uid=partner_test_uid');
  console.log('Final commissions=', finalCom.length, 'Final payouts=', finalPouts.length);
}

run().catch(err => { console.error('E2E failed:', err.message || err); process.exit(1); });
