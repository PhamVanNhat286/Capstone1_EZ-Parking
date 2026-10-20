import { Router } from "express";
import { getLots, getLotById, getLotSlots } from "../controllers/lot.controller";

const router = Router();

router.get("/", getLots);
router.get("/:id", getLotById);
router.get("/:id/slots", getLotSlots);

export default router;
