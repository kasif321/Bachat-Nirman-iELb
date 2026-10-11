import express from "express";
import rateLimit from "express-rate-limit";
import {
  requestEmailOtp,
  verifyEmailOtp,
  verifyPhoneFirebase,
  signup,
  login,
  refresh,
  logout
} from "../controllers/authController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many OTP requests. Try again later." }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many authentication attempts. Try again later." }
});

router.post("/signup/email/request-otp", otpLimiter, asyncHandler(requestEmailOtp));
router.post("/signup/email/verify-otp", authLimiter, asyncHandler(verifyEmailOtp));
router.post("/signup/phone/verify-firebase", authLimiter, asyncHandler(verifyPhoneFirebase));
router.post("/signup", authLimiter, asyncHandler(signup));

router.post("/login", authLimiter, asyncHandler(login));
router.post("/refresh", asyncHandler(refresh));
router.post("/logout", asyncHandler(logout));

export default router;
