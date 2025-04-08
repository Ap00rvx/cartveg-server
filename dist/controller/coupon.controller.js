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
const coupon_model_1 = __importDefault(require("../models/coupon.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const getActiveCoupons = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const coupons = yield coupon_model_1.default.find({ isActive: true, isDeleted: false });
        res.status(200).json(coupons);
        return;
    }
    catch (error) {
        res.status(500).json({ message: "Internal server error" });
        return;
    }
});
exports.getActiveCoupons = getActiveCoupons;
const applyCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Start a session for transaction
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { couponCode, cartTotal, userId } = req.body;
        if (!couponCode || cartTotal === undefined || !userId) {
            res.status(400).json({
                success: false,
                message: "Coupon code, cart total, and user ID are required"
            });
            return;
        }
        // Find the coupon
        const coupon = yield coupon_model_1.default.findOne({ couponCode });
        // Check if coupon exists
        if (!coupon) {
            res.status(404).json({
                success: false,
                message: "Coupon not found"
            });
            return;
        }
        // Check if coupon is active
        if (!coupon.isActive) {
            res.status(400).json({
                success: false,
                message: "This coupon is inactive"
            });
            return;
        }
        // Check if coupon is expired
        if (new Date() > new Date(coupon.expiry)) {
            res.status(400).json({
                success: false,
                message: "This coupon has expired"
            });
            return;
        }
        // Check if minimum cart value requirement is met
        if (cartTotal < coupon.minValue) {
            res.status(400).json({
                success: false,
                message: `Minimum cart value of ${coupon.minValue} required for this coupon`
            });
            return;
        }
        // Check if user has already used this coupon
        if (coupon.usedUsers.includes(userId)) {
            res.status(400).json({
                success: false,
                message: "You have already used this coupon"
            });
            return;
        }
        // Check if max usage limit has been reached
        if (coupon.maxUsage <= coupon.usedUsers.length) {
            res.status(400).json({
                success: false,
                message: "This coupon has reached its maximum usage limit"
            });
            return;
        }
        // Calculate discount
        const discount = coupon.offValue;
        const finalAmount = cartTotal - discount;
        // Record coupon usage (will be committed during transaction)
        coupon.usedUsers.push(userId);
        yield coupon.save({ session });
        // Commit the transaction
        yield session.commitTransaction();
        session.endSession();
        res.status(200).json({
            success: true,
            message: "Coupon applied successfully",
            data: {
                originalAmount: cartTotal,
                discountAmount: discount,
                finalAmount: finalAmount,
                couponCode: coupon.couponCode
            }
        });
        return;
    }
    catch (error) {
        // Abort transaction in case of error
        yield session.abortTransaction();
        session.endSession();
        console.error("Error applying coupon:", error);
        res.status(500).json({
            success: false,
            message: "Something went wrong while applying coupon",
            error: error.message
        });
        return;
    }
});
exports.applyCoupon = applyCoupon;
const removeCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { couponCode, userId } = req.body;
        if (!couponCode || !userId) {
            res.status(400).json({
                success: false,
                message: "Coupon code and user ID are required"
            });
            return;
        }
        // Find the coupon
        const coupon = yield coupon_model_1.default.findOne({ couponCode });
        // Check if coupon exists
        if (!coupon) {
            res.status(404).json({
                success: false,
                message: "Coupon not found"
            });
            return;
        }
        // Remove user from usedUsers array
        coupon.usedUsers = coupon.usedUsers.filter((user) => user !== userId);
        // Save the updated coupon
        yield coupon.save();
        res.status(200).json({
            success: true,
            message: "Coupon removed successfully",
            data: coupon
        });
        return;
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Something went wrong while removing coupon",
            error: error.message
        });
        return;
    }
});
exports.removeCoupon = removeCoupon;
