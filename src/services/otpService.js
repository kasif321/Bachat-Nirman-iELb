import { Otp } from "../models/Otp.js";
import { env } from "../config/env.js";
import { generateOtp, hashOtp, safeEqualHex } from "../utils/otp.js";
import { sendEmailOtp } from "./email.js";

export async function issueOtp({ target, purpose }) {
  const now = new Date();
  const existing = await Otp.findOne({ target, purpose });

  if (existing && now - existing.lastSentAt < env.OTP_RESEND_SECONDS * 1000) {
    const retryAfter = Math.ceil((env.OTP_RESEND_SECONDS * 1000 - (now - existing.lastSentAt)) / 1000);
    const error = new Error(`Please wait ${retryAfter} seconds before requesting another OTP`);
    error.statusCode = 429;
    throw error;
  }

  const code = generateOtp();
  const doc = {
    target,
    purpose,
    codeHash: hashOtp(code),
    expiresAt: new Date(now.getTime() + env.OTP_EXPIRES_MINUTES * 60 * 1000),
    attempts: 0,
    lastSentAt: now
  };

  await Otp.findOneAndUpdate({ target, purpose }, doc, { upsert: true, new: true });

  try {
    await sendEmailOtp(target, code);
  } catch (err) {
    await Otp.deleteOne({ target, purpose });
    throw err;
  }
}

export async function verifyOtp({ target, purpose, code }) {
  const otp = await Otp.findOne({ target, purpose });

  if (!otp) {
    const error = new Error("OTP not found or expired");
    error.statusCode = 400;
    throw error;
  }

  if (otp.expiresAt <= new Date()) {
    await Otp.deleteOne({ _id: otp._id });
    const error = new Error("OTP expired");
    error.statusCode = 400;
    throw error;
  }

  if (otp.attempts >= env.OTP_MAX_ATTEMPTS) {
    await Otp.deleteOne({ _id: otp._id });
    const error = new Error("Too many incorrect OTP attempts. Request a new OTP.");
    error.statusCode = 429;
    throw error;
  }

  const valid = safeEqualHex(hashOtp(code), otp.codeHash);
  if (!valid) {
    otp.attempts += 1;
    await otp.save();
    const error = new Error("Invalid OTP");
    error.statusCode = 400;
    throw error;
  }

  await Otp.deleteOne({ _id: otp._id });
}
