import { Router } from "express";
import lotRoutes from "./lot.routes";
import authRoutes from "./auth.routes";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use("/auth", authRoutes);
router.use("/lots", lotRoutes);

export default router;
