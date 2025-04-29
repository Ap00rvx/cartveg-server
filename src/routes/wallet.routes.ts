import { getWallet, applyReferralCode,generateReferralCode} from "../controller/wallet.controller";
import { Router } from "express";

const router = Router();


router.get("/", getWallet); // Route to get wallet information
router.post("/apply-referral-code", applyReferralCode); // Route to apply a referral code
router.post("/generate-referral-code", generateReferralCode); // Route to generate a referral code



export default router; // Export the router for use in the main app