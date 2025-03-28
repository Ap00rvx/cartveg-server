"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const order_controller_1 = require("../controller/order.controller");
const router = (0, express_1.Router)();
router.post("/create", order_controller_1.createOrder);
router.get("/userOrders", order_controller_1.getUserOrders);
router.get("/order", order_controller_1.getOrderById);
exports.default = router;
