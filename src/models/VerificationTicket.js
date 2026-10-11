import mongoose from "mongoose";

const schema = new mongoose.Schema({
  ticketHash: { type: String, required: true, unique: true, index: true },
  target: { type: String, required: true },
  purpose: { type: String, enum: ["email_signup", "phone_firebase"], required: true },
  expiresAt: { type: Date, required: true, index: true }
}, { timestamps: true });

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const VerificationTicket = mongoose.model("VerificationTicket", schema);
