import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 150
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    enum: ["manufacturer", "contractor"],
    required: true,
    index: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  firebaseUid: {
    type: String,
    default: null,
    sparse: true,
    index: true
  },
  refreshTokenHash: {
    type: String,
    default: null,
    select: false
  },
  lastLoginAt: Date
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);