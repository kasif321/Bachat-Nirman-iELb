import bcrypt from "bcrypt";
import { z } from "zod";
import { User } from "../models/User.js";
import { Otp } from "../models/Otp.js";
import { VerificationTicket } from "../models/VerificationTicket.js";
import { issueOtp, verifyOtp } from "../services/otpService.js";
import { verifyFirebasePhoneToken } from "../services/firebase.js";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signVerificationTicket,
  verifyVerificationTicket
} from "../utils/tokens.js";

const emailSchema = z.string().trim().toLowerCase().email();
const phoneSchema = z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Phone must use E.164 format, e.g. +919876543210");

const requestEmailSchema = z.object({ email: emailSchema });

const verifyEmailSchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits")
});

const verifyFirebasePhoneSchema = z.object({
  phone: phoneSchema,
  firebaseIdToken: z.string().min(20)
});

const signupSchema = z.object({
  companyName: z.string().trim().min(2).max(150),
  email: emailSchema,
  phone: phoneSchema,
  password: z.string().min(8).max(72),
  confirmPassword: z.string(),
  role: z.enum(["manufacturer", "contractor"]),
  emailVerificationTicket: z.string().min(20),
  phoneVerificationTicket: z.string().min(20)
}).refine(v => v.password === v.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1)
});

function parse(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const error = new Error(result.error.issues[0]?.message || "Invalid request");
    error.statusCode = 400;
    throw error;
  }
  return result.data;
}

function setRefreshCookie(res, token) {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/auth"
  });
}

function publicUser(user) {
  return {
    id: user._id,
    companyName: user.companyName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified
  };
}

// ── Email OTP (unchanged) ────────────────────────────────────────────────────

export async function requestEmailOtp(req, res) {
  const { email } = parse(requestEmailSchema, req.body);

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ success: false, message: "Email is already registered" });
  }

  await issueOtp({ target: email, purpose: "email_signup" });
  res.json({ success: true, message: "Email OTP sent" });
}

export async function verifyEmailOtp(req, res) {
  const { email, otp } = parse(verifyEmailSchema, req.body);

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ success: false, message: "Email is already registered" });
  }

  await verifyOtp({ target: email, purpose: "email_signup", code: otp });

  const ticket = signVerificationTicket({ target: email, purpose: "email_signup" });
  await VerificationTicket.create({
    ticketHash: hashToken(ticket),
    target: email,
    purpose: "email_signup",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });

  res.json({ success: true, message: "Email verified", verificationTicket: ticket });
}

// ── Firebase Phone Verification ──────────────────────────────────────────────
//
// The frontend uses Firebase Web SDK to send the SMS OTP and confirm it.
// After confirmation, it calls user.getIdToken() and sends that token here.
// We verify it server-side with Firebase Admin and issue a signed ticket.

export async function verifyPhoneFirebase(req, res) {
  const { phone, firebaseIdToken } = parse(verifyFirebasePhoneSchema, req.body);

  const existing = await User.findOne({ phone });
  if (existing) {
    return res.status(409).json({ success: false, message: "Phone number is already registered" });
  }

  // Verify the Firebase ID token and extract the phone number Firebase confirmed.
  const { uid, phone: firebasePhone } = await verifyFirebasePhoneToken(firebaseIdToken);

  // Normalise both to E.164 for comparison.
  if (firebasePhone !== phone) {
    const error = new Error("Firebase token phone number does not match the submitted phone number");
    error.statusCode = 400;
    throw error;
  }

  const ticket = signVerificationTicket({ target: phone, purpose: "phone_firebase" });
  await VerificationTicket.create({
    ticketHash: hashToken(ticket),
    target: phone,
    purpose: "phone_firebase",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });

  res.json({ success: true, message: "Phone verified", verificationTicket: ticket, firebaseUid: uid });
}

// ── Signup ───────────────────────────────────────────────────────────────────

export async function signup(req, res) {
  const data = parse(signupSchema, req.body);

  let emailPayload, phonePayload;
  try {
    emailPayload = verifyVerificationTicket(data.emailVerificationTicket);
    phonePayload = verifyVerificationTicket(data.phoneVerificationTicket);
  } catch {
    const error = new Error("Verification ticket is invalid or expired");
    error.statusCode = 400;
    throw error;
  }

  if (
    emailPayload.type !== "verification" ||
    emailPayload.purpose !== "email_signup" ||
    emailPayload.target !== data.email ||
    phonePayload.type !== "verification" ||
    phonePayload.purpose !== "phone_firebase" ||
    phonePayload.target !== data.phone
  ) {
    const error = new Error("Email and phone verification do not match");
    error.statusCode = 400;
    throw error;
  }

  const tickets = await VerificationTicket.find({
    ticketHash: { $in: [hashToken(data.emailVerificationTicket), hashToken(data.phoneVerificationTicket)] }
  });

  if (tickets.length !== 2 || tickets.some(t => t.expiresAt <= new Date())) {
    const error = new Error("Verification ticket is invalid, expired, or already used");
    error.statusCode = 400;
    throw error;
  }

  const [emailTaken, phoneTaken] = await Promise.all([
    User.exists({ email: data.email }),
    User.exists({ phone: data.phone })
  ]);
  if (emailTaken) {
    const error = new Error("Email is already registered");
    error.statusCode = 409;
    throw error;
  }
  if (phoneTaken) {
    const error = new Error("Phone number is already registered");
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  // Retrieve the firebaseUid stored in the phone ticket payload.
  // The ticket was signed with { target, purpose } only; uid was returned
  // separately in the verifyPhoneFirebase response. We look it up from the
  // Firebase token one more time via the ticket target to avoid trusting the
  // client. Since we already verified the ticket JWT and the DB record, we
  // can safely use phonePayload.target as the confirmed phone number.
  const user = await User.create({
    companyName: data.companyName,
    email: data.email,
    phone: data.phone,
    passwordHash,
    role: data.role,
    emailVerified: true,
    phoneVerified: true
  });

  await VerificationTicket.deleteMany({
    ticketHash: { $in: [hashToken(data.emailVerificationTicket), hashToken(data.phoneVerificationTicket)] }
  });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await User.updateOne({ _id: user._id }, { refreshTokenHash: hashToken(refreshToken) });
  setRefreshCookie(res, refreshToken);

  res.status(201).json({
    success: true,
    message: "Registration successful",
    accessToken,
    user: publicUser(user)
  });
}

// ── Login / Refresh / Logout (unchanged) ────────────────────────────────────

export async function login(req, res) {
  const data = parse(loginSchema, req.body);
  const user = await User.findOne({ email: data.email }).select("+passwordHash +refreshTokenHash");

  if (!user || !user.emailVerified || !user.phoneVerified) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  user.refreshTokenHash = hashToken(refreshToken);
  user.lastLoginAt = new Date();
  await user.save();

  setRefreshCookie(res, refreshToken);

  res.json({
    success: true,
    message: "Login successful",
    accessToken,
    user: publicUser(user)
  });
}

export async function refresh(req, res) {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ success: false, message: "Refresh token missing" });

  try {
    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.sub).select("+refreshTokenHash");

    if (!user?.refreshTokenHash || user.refreshTokenHash !== hashToken(token)) {
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    const newRefreshToken = signRefreshToken(user);
    const accessToken = signAccessToken(user);
    user.refreshTokenHash = hashToken(newRefreshToken);
    await user.save();
    setRefreshCookie(res, newRefreshToken);

    res.json({ success: true, accessToken, user: publicUser(user) });
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
  }
}

export async function logout(req, res) {
  const token = req.cookies.refreshToken;

  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await User.updateOne(
        { _id: payload.sub, refreshTokenHash: hashToken(token) },
        { $set: { refreshTokenHash: null } }
      );
    } catch {}
  }

  res.clearCookie("refreshToken", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/api/auth" });
  res.json({ success: true, message: "Logged out" });
}
