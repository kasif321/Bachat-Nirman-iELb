/*
  Production signup hardening:
  After OTP verification, issue a short-lived signed verification ticket
  containing only the verified target and purpose.

  Example payload:
  { target: email, purpose: "email_signup", type: "verification", jti: ... }

  Store a hash of the ticket/JTI server-side if you want one-time-use semantics.
  Then require both tickets in POST /signup.

  This file is intentionally a design placeholder so the API never relies
  on a client-provided boolean such as { emailVerified: true } as proof.
*/