import { Request, Response } from "express";
import mongoose from "mongoose";
import { CouponType } from "../types/interface/interface";
import Coupon from "../models/coupon.model";
import Order from "../models/order.model";
import { ICoupon } from "../types/interface/interface";

/**
 * Get all active and non-deleted coupons
 * @param req Express request object
 * @param res Express response object
 */
export const getActiveCoupons = async (req: Request, res: Response): Promise<void> => {
  try {
    const coupons = await Coupon.find({ isActive: true, isDeleted: false }).lean();
    res.status(200).json({
      success: true,
      message: coupons.length > 0 ? "Active coupons fetched successfully" : "No active coupons found",
      data: coupons,
    });
  } catch (error: any) {
    console.error("Error fetching active coupons:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Apply a coupon to a cart
 * @param req Express request object
 * @param res Express response object
 */
export const applyCoupon = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { couponCode, cartTotal, userId } = req.body;

    // Validate input
    if (!couponCode || cartTotal === undefined || !userId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        message: "Coupon code, cart total, and user ID are required",
      });
      return;
    }

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
      return;
    }

    // Find coupon
    const coupon = await Coupon.findOne({ couponCode }).session(session);
    if (!coupon) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
      return;
    }

    // Validate coupon status
    if (!coupon.isActive) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        message: "This coupon is inactive",
      });
      return;
    }

    if (coupon.isDeleted) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        message: "This coupon is deleted",
      });
      return;
    }

    if (new Date() > new Date(coupon.expiry)) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        message: "This coupon has expired",
      });
      return;
    }

    // Validate minimum cart value
    if (cartTotal < coupon.minValue) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        message: `Minimum cart value of ${coupon.minValue} required for this coupon`,
      });
      return;
    }

    // Validate user usage
    if (coupon.usedUsers.includes(userId)) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        message: "You have already used this coupon",
      });
      return;
    }

    // Validate max usage
    if (coupon.maxUsage <= coupon.usedUsers.length) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        message: "This coupon has reached its maximum usage limit",
      });
      return;
    }

    // Validate MinOrders coupon type
    if (coupon.couponType === CouponType.MinOrders) {
      const orderCount = await Order.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
      }).session(session);
      if (orderCount < (coupon.minOrders || 0)) {
        await session.abortTransaction();
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
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        message: "Discount amount exceeds cart total",
      });
      return;
    }

    // Record coupon usage
    coupon.usedUsers.push(userId);
    await coupon.save({ session });

    // Commit transaction
    await session.commitTransaction();
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
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error applying coupon:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while applying coupon",
      error: error.message,
    });
  }
};

/**
 * Remove a coupon from a user's usage
 * @param req Express request object
 * @param res Express response object
 */
export const removeCoupon = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { couponCode, userId } = req.body;

    // Validate input
    if (!couponCode || !userId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        message: "Coupon code and user ID are required",
      });
      return;
    }

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
      return;
    }

    // Find coupon
    const coupon = await Coupon.findOne({ couponCode }).session(session);
    if (!coupon) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
      return;
    }

    // Check if user has used the coupon
    if (!coupon.usedUsers.includes(userId)) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        success: false,
        message: "This coupon has not been used by the user",
      });
      return;
    }

    // Remove user from usedUsers
    coupon.usedUsers = coupon.usedUsers.filter((user) => user !== userId);
    await coupon.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Coupon removed successfully",
      data: {
        couponCode: coupon.couponCode,
        usedUsers: coupon.usedUsers,
      },
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error removing coupon:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while removing coupon",
      error: error.message,
    });
  }
};