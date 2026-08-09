import dotenv from 'dotenv';
import { connectDB, User } from '../db.js';

dotenv.config();

(async function(){
  try {
    await connectDB();
    console.log('connected');
    const uid = 'partner_test_uid';
    const partnerId = '6a78234586d174b0af9eea9b';
    const referralCode = 'TESTPART70';
    const updated = await User.findOneAndUpdate({ uid }, { $set: { partnerId: partnerId, partnerCode: referralCode, referralSource: 'partner', role: 'partner' } }, { new: true });
    console.log('updated=', updated);
    process.exit(0);
  } catch (err) { console.error(err); process.exit(1); }
})();
