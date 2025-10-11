import mongoose from 'mongoose';

const shopAccessSchema = new mongoose.Schema({
  shopDomain: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true
  },
  isTokenValidated: {
    type: Boolean,
    default: false
  },
  validatedToken: {
    type: String,
    default: null
  },
  validatedAt: {
    type: Date,
    default: null
  },
  lastAccessAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update lastAccessAt on each query
shopAccessSchema.pre('findOneAndUpdate', function() {
  this.set({ lastAccessAt: Date.now() });
});

const ShopAccess = mongoose.model('ShopAccess', shopAccessSchema);

export default ShopAccess;

