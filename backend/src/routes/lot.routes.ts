import { Router } from "express";
import { getLots, getLotById, getLotSlots } from "../controllers/lot.controller";
import { optionalAuthenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getLots);
router.get("/:id", getLotById);
router.get("/:id/slots", optionalAuthenticateToken, getLotSlots);

export default router;
