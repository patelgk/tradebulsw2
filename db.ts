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
  userId: { type: String, required: true },
  symbol: String,
  type: { type: String, enum: ['BUY', 'SELL'] },
  optionType: { type: String, enum: ['CE', 'PE'] },
  strike: Number,
  price: Number,
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
