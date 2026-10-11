import crypto from "node:crypto";

export function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOtp(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function safeEqualHex(a, b) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}