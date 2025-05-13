"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeCoupon = exports.applyCoupon = exports.getActiveCoupons = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const interface_1 = require("../types/interface/interface");
const coupon_model_1 = __importDefault(require("../models/coupon.model"));
const order_model_1 = __importDefault(require("../models/order.model"));
/**
 * Get all active and non-deleted coupons
 * @param req Express request object
 * @param res Express response object
 */
const getActiveCoupons = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const coupons = yield coupon_model_1.default.find({ isActive: true, isDeleted: false }).lean();
        res.status(200).json({
            success: true,
            message: coupons.length > 0 ? "Active coupons fetched successfully" : "No active coupons found",
            data: coupons,
        });
    }
    catch (error) {
        console.error("Error fetching active coupons:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
});
exports.getActiveCoupons = getActiveCoupons;
/**
 * Apply a coupon to a cart
 * @param req Express request object
 * @param res Express response object
 */
const applyCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { couponCode, cartTotal, userId } = req.body;
        // Validate input
        if (!couponCode || cartTotal === undefined || !userId) {
            yield session.abortTransaction();
            session.endSession();
            res.status(400).json({
                success: false,
                message: "Coupon code, cart total, and user ID are required",
            });
            return;
        }
        // Validate userId
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            yield session.abortTransaction();
            session.endSession();
            res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
            return;
        }
        // Find coupon
        const coupon = yield coupon_model_1.default.findOne({ couponCode }).session(session);
        if (!coupon) {
            yield session.abortTransaction();
            session.endSession();
            res.status(404).json({
                success: false,
                message: "Coupon not found",
            });
            return;
        }
        // Validate coupon status
        if (!coupon.isActive) {
            yield session.abortTransaction();
            session.endSession();
            res.status(400).json({
                success: false,
                message: "This coupon is inactive",
            });
            return;
        }
        if (coupon.isDeleted) {
            yield session.abortTransaction();
            session.endSession();
            res.status(400).json({
                success: false,
                message: "This coupon is deleted",
            });
            return;
        }
        if (new Date() > new Date(coupon.expiry)) {
            yield session.abortTransaction();
            session.endSession();
            res.status(400).json({
                success: false,
                message: "This coupon has expired",
            });
            return;
        }
        // Validate minimum cart value
        if (cartTotal < coupon.minValue) {
            yield session.abortTransaction();
            session.endSession();
            res.status(400).json({
                success: false,
                message: `Minimum cart value of ${coupon.minValue} required for this coupon`,
            });
            return;
        }
        // Validate user usage
        if (coupon.usedUsers.includes(userId)) {
            yield session.abortTransaction();
            session.endSession();
            res.status(400).json({
                success: false,
                message: "You have already used this coupon",
            });
            return;
        }
        // Validate max usage
        if (coupon.maxUsage <= coupon.usedUsers.length) {
            yield session.abortTransaction();
            session.endSession();
            res.status(400).json({
                success: false,
                message: "This coupon has reached its maximum usage limit",
            });
            return;
        }
        // Validate MinOrders coupon type
        if (coupon.couponType === interface_1.CouponType.MinOrders) {
            const orderCount = yield order_model_1.default.countDocuments({
                userId: new mongoose_1.default.Types.ObjectId(userId),
            }).session(session);
            if (orderCount < (coupon.minOrders || 0)) {
                yield session.abortTransaction();
                session.endSession();
                res.status(400).json({
                    success: false,
                    message: `You have ${orderCount} orders, but ${coupon.minOrders} orders are required to use this coupon`,
                });
                return;
            }
        }
        // Calculate discount
        const discount = coupon.offValue;
        const finalAmount = cartTotal - discount;
        if (finalAmount < 0) {
            yield session.abortTransaction();
            session.endSession();
            res.status(400).json({
                success: false,
                message: "Discount amount exceeds cart total",
            });
            return;
        }
        // Record coupon usage
        coupon.usedUsers.push(userId);
        yield coupon.save({ session });
        // Commit transaction
        yield session.commitTransaction();
        session.endSession();
        res.status(200).json({
            success: true,
            message: "Coupon applied successfully",
            data: {
                originalAmount: cartTotal,
                discountAmount: discount,
                finalAmount,
                couponCode: coupon.couponCode,
            },
        });
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        console.error("Error applying coupon:", error);
        res.status(500).json({
            success: false,
            message: "Something went wrong while applying coupon",
            error: error.message,
        });
    }
});
exports.applyCoupon = applyCoupon;
/**
 * Remove a coupon from a user's usage
 * @param req Express request object
 * @param res Express response object
 */
const removeCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { couponCode, userId } = req.body;
        // Validate input
        if (!couponCode || !userId) {
            yield session.abortTransaction();
            session.endSession();
            res.status(400).json({
                success: false,
                message: "Coupon code and user ID are required",
            });
            return;
        }
        // Validate userId
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            yield session.abortTransaction();
            session.endSession();
            res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
            return;
        }
        // Find coupon
        const coupon = yield coupon_model_1.default.findOne({ couponCode }).session(session);
        if (!coupon) {
            yield session.abortTransaction();
            session.endSession();
            res.status(404).json({
                success: false,
                message: "Coupon not found",
            });
            return;
        }
        // Check if user has used the coupon
        if (!coupon.usedUsers.includes(userId)) {
            yield session.abortTransaction();
            session.endSession();
            res.status(400).json({
                success: false,
                message: "This coupon has not been used by the user",
            });
            return;
        }
        // Remove user from usedUsers
        coupon.usedUsers = coupon.usedUsers.filter((user) => user !== userId);
        yield coupon.save({ session });
        // Commit transaction
        yield session.commitTransaction();
        session.endSession();
        res.status(200).json({
            success: true,
            message: "Coupon removed successfully",
            data: {
                couponCode: coupon.couponCode,
                usedUsers: coupon.usedUsers,
            },
        });
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        console.error("Error removing coupon:", error);
        res.status(500).json({
            success: false,
            message: "Something went wrong while removing coupon",
            error: error.message,
        });
    }
});
exports.removeCoupon = removeCoupon;
