import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS
  }
});

export async function sendEmailOtp(email, otp) {
  await transporter.sendMail({
    from: env.MAIL_FROM,
    to: email,
    subject: "Bachat Nirman - Email Verification OTP",
    text: `Your Bachat Nirman verification OTP is ${otp}. It expires in ${env.OTP_EXPIRES_MINUTES} minutes. Do not share this OTP.`,
    html: `<p>Your Bachat Nirman verification OTP is <strong>${otp}</strong>.</p>
           <p>It expires in ${env.OTP_EXPIRES_MINUTES} minutes. Do not share this OTP.</p>`
  });
  // Log only the delivery stage; never include the recipient or OTP.
  console.info("Email OTP accepted by SMTP server");
}
