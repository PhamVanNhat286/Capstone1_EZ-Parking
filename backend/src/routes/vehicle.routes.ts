import { Router } from "express";
import { getMyVehicles, addVehicle, updateVehicle, deleteVehicle } from "../controllers/vehicle.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

// Tất cả các route quản lý xe đều yêu cầu đăng nhập
router.use(authenticateToken);

router.get("/", getMyVehicles);
router.post("/", addVehicle);
router.put("/:id", updateVehicle);
router.delete("/:id", deleteVehicle);

export default router;
