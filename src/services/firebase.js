import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { env } from "../config/env.js";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    })
  });
}

/**
 * Verifies a Firebase ID token and returns { uid, phone_number }.
 * Throws if the token is invalid, expired, or has no phone_number claim.
 */
export async function verifyFirebasePhoneToken(idToken) {
  const decoded = await getAuth().verifyIdToken(idToken);
  if (!decoded.phone_number) {
    const err = new Error("Firebase token does not contain a verified phone number");
    err.statusCode = 400;
    throw err;
  }
  return { uid: decoded.uid, phone: decoded.phone_number };
}
