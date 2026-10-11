import express from "express";
import { requireAuth, allowRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getMe } from "../controllers/userController.js";

const router = express.Router();

router.get("/me", requireAuth, asyncHandler(getMe));

// Example role-protected endpoints:
router.get("/manufacturer-area", requireAuth, allowRoles("manufacturer"), (req, res) => {
  res.json({ success: true, message: "Manufacturer access granted" });
});

router.get("/contractor-area", requireAuth, allowRoles("contractor"), (req, res) => {
  res.json({ success: true, message: "Contractor access granted" });
});

export default router;