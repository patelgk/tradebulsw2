import { Router } from "express";
import { dhanControllerInstance } from "../controllers/dhanController.js";

const router = Router();

// Simple test route (Requirement 12)
router.get("/test", dhanControllerInstance.getTest);

// Funds route (Requirement 4.a)
router.get("/funds", dhanControllerInstance.getFunds);

// Option chain route (Requirement 4.b)
router.post("/option-chain", dhanControllerInstance.getOptionChain);

export default router;
