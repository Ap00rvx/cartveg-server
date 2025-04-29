"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const wallet_controller_1 = require("../controller/wallet.controller");
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get("/", wallet_controller_1.getWallet); // Route to get wallet information
router.post("/apply-referral-code", wallet_controller_1.applyReferralCode); // Route to apply a referral code
router.post("/generate-referral-code", wallet_controller_1.generateReferralCode); // Route to generate a referral code
exports.default = router; // Export the router for use in the main app
