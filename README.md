# Bachat Nirman — Part 1 Auth API

Production-oriented Node.js + Express + MongoDB authentication backend.

## Features

- Manufacturer / Contractor role
- Company name + email + phone
- Email OTP verification
- Phone OTP verification through Twilio
- Password hashing with bcrypt
- Login with email/password
- Short-lived JWT access token
- Rotating httpOnly refresh token cookie
- OTP hashing, expiration and attempt limits
- OTP resend cooldown
- Helmet, CORS, JSON size limit
- Authentication and OTP rate limits
- Role-based access middleware
- MongoDB TTL cleanup for OTP records
- Zod request validation

## Setup

1. Install Node.js 20+.
2. Create MongoDB database locally or use MongoDB Atlas.
3. Copy `.env.example` to `.env`.
4. Fill MongoDB, SMTP and Twilio credentials.
5. Run:

```bash
npm install
npm run dev
```

Production:

```bash
NODE_ENV=production npm start
```

## Optional keep-alive health check

In Render, set `BACKEND_URL` to the deployed service's public base URL (for
example, `https://your-service.onrender.com`). In production, the server then
requests its `/health` endpoint every 10 minutes. Leave `BACKEND_URL` unset to
disable the helper.

This helper does not guarantee that a hosting provider will keep a free
instance awake. Render's Free web services spin down after 15 minutes without
inbound traffic; use a paid compute instance when the service must remain
always on.

## Signup flow

1. `POST /api/auth/signup/email/request-otp`
2. `POST /api/auth/signup/email/verify-otp`
   - returns a short-lived `verificationTicket`
3. `POST /api/auth/signup/phone/request-otp`
4. `POST /api/auth/signup/phone/verify-otp`
   - returns a short-lived `verificationTicket`
5. `POST /api/auth/signup`

Example final signup body:

```json
{
  "companyName": "ABC Construction Pvt Ltd",
  "email": "company@example.com",
  "phone": "+919876543210",
  "password": "YourStrongPassword123!",
  "confirmPassword": "YourStrongPassword123!",
  "role": "contractor",
  "emailVerificationTicket": "TICKET_FROM_EMAIL_VERIFY",
  "phoneVerificationTicket": "TICKET_FROM_PHONE_VERIFY"
}
```

The server validates the signed tickets and consumes them after successful registration. The browser cannot simply send `emailVerified: true` or `phoneVerified: true` to bypass OTP verification.

## Login

`POST /api/auth/login`

```json
{
  "email": "company@example.com",
  "password": "YourStrongPassword123!"
}
```

The response includes an access token and user role. The refresh token is stored in an httpOnly cookie.

## Role-based access

Send:

`Authorization: Bearer <accessToken>`

Manufacturer-only route:

`GET /api/users/manufacturer-area`

Contractor-only route:

`GET /api/users/contractor-area`

## Important production notes

- Do not commit `.env`.
- Use HTTPS in production.
- Use a real transactional SMTP provider and a compliant SMS provider.
- Add Redis-backed rate limiting for multiple server instances.
- Add audit logs, account lockout / abuse detection, monitoring and alerts before launch.
- Consider a dedicated identity provider if the application grows substantially.
- OTP verification is represented by signed, short-lived server-side verification tickets. Do not accept client-provided boolean verification flags as proof.

## Suggested frontend sequence

Keep verified state in memory:

email -> request OTP -> verify OTP -> receive `emailVerificationTicket`

phone -> request OTP -> verify OTP -> receive `phoneVerificationTicket`

signup -> send both tickets + companyName + role + password

The backend then validates both tickets and creates the user.
