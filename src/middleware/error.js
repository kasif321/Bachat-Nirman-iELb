export function notFound(req, res) {
  res.status(404).json({ success: false, message: "Route not found" });
}

export function errorHandler(err, req, res, next) {
  // Keep useful server-side context in Render logs without dumping arbitrary
  // error properties (which can include SMTP responses or credentials).
  const sensitiveValues = [
    process.env.SMTP_PASS,
    process.env.SMTP_USER,
    process.env.MONGODB_URI,
    process.env.JWT_ACCESS_SECRET,
    process.env.JWT_REFRESH_SECRET,
    process.env.VERIFICATION_SECRET,
    process.env.FIREBASE_PRIVATE_KEY
  ].filter(value => typeof value === "string" && value.length > 0);
  const redact = value => {
    let safe = String(value ?? "");
    for (const secret of sensitiveValues) safe = safe.split(secret).join("[REDACTED]");
    return safe
      .replace(/\b\d{6}\b/g, "[REDACTED_OTP]")
      .replace(/\bBearer\s+\S+/gi, "Bearer [REDACTED]")
      .replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED_TOKEN]");
  };
  const diagnostic = {
    name: redact(err?.name || "Error"),
    message: redact(err?.message || "Unknown error"),
    ...(err?.code !== undefined ? { code: redact(err.code) } : {}),
    ...(err?.stack ? { stack: redact(err.stack) } : {})
  };
  console.error("Request failed", {
    method: req.method,
    path: req.path,
    statusCode: err?.statusCode || 500,
    error: diagnostic
  });

  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({ success: false, message: `${field} already exists` });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.statusCode ? err.message : "Internal server error"
  });
}
