import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  target: {
    type: String,
    required: true,
    index: true
  },
  purpose: {
    type: String,
    enum: ["email_signup"],
    required: true,
    index: true
  },
  codeHash: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  lastSentAt: {
    type: Date,
    required: true
  }
}, { timestamps: true });

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ target: 1, purpose: 1 }, { unique: true });

export const Otp = mongoose.model("Otp", otpSchema);