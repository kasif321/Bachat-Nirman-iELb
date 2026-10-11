import { verifyAccessToken } from "../utils/tokens.js";

export function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    req.user = verifyAccessToken(auth.slice(7));
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired access token" });
  }
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    next();
  };
}