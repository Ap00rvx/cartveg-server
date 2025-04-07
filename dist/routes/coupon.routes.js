"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const coupon_controller_1 = require("../controller/coupon.controller");
const router = (0, express_1.Router)();
router.get("/", coupon_controller_1.getActiveCoupons);
router.post("/apply", coupon_controller_1.applyCoupon);
router.post("/remove", coupon_controller_1.removeCoupon);
exports.default = router;
