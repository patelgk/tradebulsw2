import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  name: String,
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Optional if using external auth, but good for local
  phoneNumber: String,
  balance: { type: Number, default: 0 },
  initial_balance: { type: Number, default: 0 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
});

const tradeSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // refers to uid
  symbol: String,
  type: { type: String, enum: ['BUY', 'SELL'] },
  optionType: { type: String, enum: ['CE', 'PE'] },
  strike: Number,
  price: Number,
  qty: Number,
  time: { type: Date, default: Date.now },
  status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
  pnl: { type: Number, default: 0 },
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
  planId: String,
  planName: String,
  time: { type: Date, default: Date.now },
});

export const User = mongoose.model('User', userSchema);
export const Trade = mongoose.model('Trade', tradeSchema);
export const Challenge = mongoose.model('Challenge', challengeSchema);
export const Rule = mongoose.model('Rule', ruleSchema);
export const Setting = mongoose.model('Setting', settingSchema);
export const Transaction = mongoose.model('Transaction', transactionSchema);

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined. Set MONGODB_URI in your environment or .env file.');
    throw new Error('MONGODB_URI is not defined');
  }

  try {
    // Use a short server selection timeout so failures surface quickly instead
    // of letting mongoose buffer operations for a long time.
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    // Re-throw so startup fails fast and callers can handle the failure predictably
    throw err;
  }
};
