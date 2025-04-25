"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const wallet_controller_1 = require("../controller/wallet.controller");
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get("/", wallet_controller_1.getWallet); // Route to get wallet information
exports.default = router; // Export the router for use in the main app
