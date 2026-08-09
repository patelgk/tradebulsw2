import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  name: String,
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Optional if using external auth, but good for local
  phoneNumber: String,
  balance: { type: Number, default: 0 },
  initial_balance: { type: Number, default: 0 },
  role: { type: String, enum: ['user', 'admin', 'partner'], default: 'user' },
  // Partner role: partners authenticate with existing user accounts
  // Add partner-related attribution fields (nullable for direct users)
  partnerId: { type: String, default: null },
  partnerCode: { type: String, default: null },
  referralSource: { type: String, enum: ['direct', 'partner'], default: 'direct' },
  accountStatus: { type: String, enum: ['inactive', 'active', 'suspended', 'rejected'], default: 'inactive' },
  tradingCapital: { type: Number, default: 0 },
  tradingPermission: { type: Boolean, default: false },
  challenge: { type: String, default: null },
  challengeStatus: { type: String, enum: ['none', 'pending', 'active', 'rejected', 'disabled', 'closed', 'reset'], default: 'none' },
  currentChallengeName: { type: String, default: null },
  challengeActivatedAt: Date,
  tradingAccountId: String,
  createdAt: { type: Date, default: Date.now },
});

// ─── Partner / Referral / Commission / Payout Schemas ───────────────────────

const partnerSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  partnerName: { type: String, required: true },
  partnerType: { type: String, default: '' },
  referralCode: { type: String, unique: true, sparse: true, default: null },
  application: mongoose.Schema.Types.Mixed,
  commissionRate: { type: Number, default: 15 },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const referralSchema = new mongoose.Schema({
  referralCode: { type: String, required: true, index: true },
  partnerId: { type: String, required: true, index: true },
  type: { type: String, enum: ['click', 'signup'], required: true },
  userId: { type: String, default: null }, // set when signup occurs
  ip: String,
  userAgent: String,
  path: String,
  createdAt: { type: Date, default: Date.now },
});

const commissionSchema = new mongoose.Schema({
  partnerId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  transactionId: { type: String, required: true, unique: true, index: true },
  challengeName: { type: String },
  purchaseAmount: { type: Number, required: true },
  commissionRate: { type: Number, required: true },
  commissionAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'paid', 'cancelled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const payoutSchema = new mongoose.Schema({
  partnerId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, default: '' },
  payoutDetails: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ['pending', 'processing', 'paid', 'rejected', 'cancelled'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
  processedAt: Date,
  transactionRef: String, // UTR / reference
  adminNote: String,
});

const tradeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  symbol: String,
  type: { type: String, enum: ['BUY', 'SELL'] },
  optionType: { type: String, enum: ['CE', 'PE'] },
  strike: Number,
  price: Number,
  lots: { type: Number, default: 1 },
  qty: Number,
  lotSize: { type: Number, default: 50 },
  time: { type: Date, default: Date.now },
  exitTime: Date,
  exitPrice: Number,
  status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
  pnl: { type: Number, default: 0 },
  charges: { type: Number, default: 0 },
  margin: { type: Number, default: 0 },
});

const challengeSchema = new mongoose.Schema({
  name: String,
  price: Number,
  capital: Number,
  profit_target: Number,
  max_dd: Number,
  daily_dd: Number,
  tag: String,
  recommended: Boolean,
});

const ruleSchema = new mongoose.Schema({
  name: String,
  value: String,
  description: String,
});

const settingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // e.g., 'market', 'notifications'
  data: mongoose.Schema.Types.Mixed,
});

const transactionSchema = new mongoose.Schema({
  userId: String,
  type: { type: String, enum: ['challenge_purchase', 'withdrawal', 'deposit'] },
  amount: Number,
  capital: Number,
  planId: String,
  planName: String,
  paymentLink: String,
  paymentReference: String,
  paymentDate: Date,
  invoiceNumber: String,
  challengeName: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  time: { type: Date, default: Date.now },
});

const challengePurchaseSchema = new mongoose.Schema({
  userId: String,
  userEmail: String,
  challengeName: String,
  fundingAmount: Number,
  challengeFee: Number,
  transactionId: String,
  paymentReference: String,
  paymentDate: Date,
  paymentStatus: { type: String, enum: ['pending', 'successful', 'failed', 'approved', 'rejected'], default: 'pending' },
  invoiceNumber: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'active', 'closed'], default: 'pending' },
  reviewReason: String,
  approvedAt: Date,
  adminId: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const fundHistorySchema = new mongoose.Schema({
  userId: String,
  type: { type: String, enum: ['credit', 'debit', 'reset', 'freeze', 'unfreeze', 'disable', 'enable', 'close', 'approve', 'reject', 'adjust'], default: 'credit' },
  amount: Number,
  balanceBefore: Number,
  balanceAfter: Number,
  reason: String,
  referenceId: String,
  adminId: String,
  createdAt: { type: Date, default: Date.now },
});

const adminActionSchema = new mongoose.Schema({
  adminId: String,
  action: String,
  targetType: String,
  targetId: String,
  details: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});

const challengeStatusSchema = new mongoose.Schema({
  userId: String,
  status: { type: String, enum: ['pending', 'active', 'rejected', 'disabled', 'closed', 'reset'], default: 'pending' },
  challengeName: String,
  fundingAmount: Number,
  tradingCapital: Number,
  activationDate: Date,
  updatedAt: { type: Date, default: Date.now },
});

const tradingAccountSchema = new mongoose.Schema({
  userId: String,
  accountNumber: String,
  challengeName: String,
  fundingAmount: Number,
  status: { type: String, enum: ['inactive', 'active', 'frozen', 'closed', 'rejected'], default: 'inactive' },
  tradingCapital: Number,
  createdAt: { type: Date, default: Date.now },
  activatedAt: Date,
  closedAt: Date,
});

const notificationSchema = new mongoose.Schema({
  userId: String,
  type: String,
  title: String,
  message: String,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model('User', userSchema);
export const Partner = mongoose.model('Partner', partnerSchema);
export const Referral = mongoose.model('Referral', referralSchema);
export const Commission = mongoose.model('Commission', commissionSchema);
export const Payout = mongoose.model('Payout', payoutSchema);
export const Trade = mongoose.model('Trade', tradeSchema);
export const Challenge = mongoose.model('Challenge', challengeSchema);
export const Rule = mongoose.model('Rule', ruleSchema);
export const Setting = mongoose.model('Setting', settingSchema);
export const Transaction = mongoose.model('Transaction', transactionSchema);
export const ChallengePurchase = mongoose.model('ChallengePurchase', challengePurchaseSchema);
export const FundHistory = mongoose.model('FundHistory', fundHistorySchema);
export const AdminAction = mongoose.model('AdminAction', adminActionSchema);
export const ChallengeStatus = mongoose.model('ChallengeStatus', challengeStatusSchema);
export const TradingAccount = mongoose.model('TradingAccount', tradingAccountSchema);
export const Notification = mongoose.model('Notification', notificationSchema);

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined. Set MONGODB_URI in your environment or .env file.');
    throw new Error('MONGODB_URI is not defined');
  }

  try {
    // Optimized connection options for reliable OLTP workload on MongoDB Atlas
    // These settings ensure proper connection pooling and prevent the 10000ms buffering timeout
    await mongoose.connect(uri, {
      // Initial server selection timeout - allow time for Atlas network latency
      serverSelectionTimeoutMS: 10000,
      
      // Connection establishment timeout
      connectTimeoutMS: 10000,
      
      // Socket timeout for long-running operations
      socketTimeoutMS: 45000,
      
      // Connection pool configuration for OLTP workload
      maxPoolSize: 50,        // Sufficient for typical Express app concurrent requests
      minPoolSize: 5,         // Keep connections pre-warmed
      maxIdleTimeMS: 300000,  // 5 minutes - clean up idle connections
      
      // Mongoose-specific buffer timeout override (default is 10s)
      bufferCommands: true,
      
      // Fail fast on connection failures for better debugging
      serverMonitoringMode: 'auto'
    });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    // Re-throw so startup fails fast and callers can handle the failure predictably
    throw err;
  }
};
