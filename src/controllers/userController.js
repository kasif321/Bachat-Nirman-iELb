import { User } from "../models/User.js";

function publicUser(user) {
  return {
    id: user._id,
    companyName: user.companyName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt
  };
}

export async function getMe(req, res) {
  const user = await User.findById(req.user.sub);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  res.json({ success: true, user: publicUser(user) });
}
