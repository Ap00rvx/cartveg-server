"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const order_controller_1 = __importDefault(require("../controller/order.controller"));
const storeManager_middleware_1 = require("../middleware/storeManager.middleware");
const router = (0, express_1.Router)();
router.post("/create", order_controller_1.default.createOrder);
router.post("/cancel", order_controller_1.default.cancelOrder);
router.put("/update-status", storeManager_middleware_1.verifyStoreManager, order_controller_1.default.updateOrderStatus);
router.get("/user-orders/:userId", order_controller_1.default.getUserOrders);
router.get("/:orderId", order_controller_1.default.getOrderById);
// router.get("/userOrders", getUserOrders);
// router.get("/order", getOrderById);
exports.default = router;
