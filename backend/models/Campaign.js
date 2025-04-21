import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
  ownerId:      { type: String, required: true },
  name:         { type: String, required: true },
  systemPrompt: { type: String, default: '' },
  initialGreeting: { type: String, default: '' },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Campaign', campaignSchema);