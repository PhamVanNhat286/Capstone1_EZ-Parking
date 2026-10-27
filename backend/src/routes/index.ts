import { Router } from "express";
import lotRoutes from "./lot.routes";
import authRoutes from "./auth.routes";
import vehicleRoutes from "./vehicle.routes";
import reservationRoutes from "./reservation.routes";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use("/auth", authRoutes);
router.use("/lots", lotRoutes);
router.use("/vehicles", vehicleRoutes);
router.use("/reservations", reservationRoutes);

export default router;

