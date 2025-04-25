import { getWallet } from "../controller/wallet.controller";
import { Router } from "express";

const router = Router();


router.get("/", getWallet); // Route to get wallet information



export default router; // Export the router for use in the main app