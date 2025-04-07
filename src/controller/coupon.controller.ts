import Coupon from "../models/coupon.model";
import { Request, Response } from "express";
import { ICoupon } from "../types/interface/interface";
import mongoose from "mongoose";


export const getActiveCoupons = async (req: Request, res: Response) => {
    try {
        const coupons = await Coupon.find({ isActive: true, isDeleted: false });
         res.status(200).json(coupons);return
    } catch (error) {
         res.status(500).json({ message: "Internal server error" });return
    }
}
export const applyCoupon = async (req: Request, res: Response): Promise<void> => {
    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { couponCode, cartTotal, userId } = req.body;
        
        if (!couponCode || cartTotal === undefined || !userId) {
             res.status(400).json({
                success: false,
                message: "Coupon code, cart total, and user ID are required"
            });return
        }
        
        // Find the coupon
        const coupon = await Coupon.findOne({ couponCode });
        
        // Check if coupon exists
        if (!coupon) {
             res.status(404).json({
                success: false,
                message: "Coupon not found"
            });return
        }
        
        // Check if coupon is active
        if (!coupon.isActive) {
             res.status(400).json({
                success: false,
                message: "This coupon is inactive"
            });return
        }
        
        // Check if coupon is expired
        if (new Date() > new Date(coupon.expiry)) {
             res.status(400).json({
                success: false,
                message: "This coupon has expired"
            });return
        }
        
        // Check if minimum cart value requirement is met
        if (cartTotal < coupon.minValue) {
             res.status(400).json({
                success: false,
                message: `Minimum cart value of ${coupon.minValue} required for this coupon`
            });return
        }
        
        // Check if user has already used this coupon
        if (coupon.usedUsers.includes(userId)) {
                res.status(400).json({
                    success: false,
                    message: "You have already used this coupon"
                });return

        }
        
        // Check if max usage limit has been reached
        if (coupon.maxUsage <= coupon.usedUsers.length) {
             res.status(400).json({
                success: false,
                message: "This coupon has reached its maximum usage limit"
            });return
        }
        
        // Calculate discount
        const discount = coupon.offValue;
        const finalAmount = cartTotal - discount;
        
        // Record coupon usage (will be committed during transaction)
        coupon.usedUsers.push(userId);
        // Commit the transaction
        await session.commitTransaction();
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
        
    } catch (error:any) {
        // Abort transaction in case of error
        await session.abortTransaction();
        session.endSession();
        
        console.error("Error applying coupon:", error);
         res.status(500).json({
            success: false,
            message: "Something went wrong while applying coupon",
            error: error.message
        }); return; 
    }
};

export const removeCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
        const { couponCode, userId } = req.body;
        
        if (!couponCode || !userId) {
             res.status(400).json({
                success: false,
                message: "Coupon code and user ID are required"
            });return
        }
        
        // Find the coupon
        const coupon = await Coupon.findOne({ couponCode });
        
        // Check if coupon exists
        if (!coupon) {
             res.status(404).json({
                success: false,
                message: "Coupon not found"
            });return
        }
        
        // Remove user from usedUsers array
        coupon.usedUsers = coupon.usedUsers.filter((user) => user !== userId);
        
        // Save the updated coupon
        await coupon.save();
        
         res.status(200).json({
            success: true,
            message: "Coupon removed successfully",
            data: coupon
        });return
        
    } catch (error:any) {
         res.status(500).json({
            success: false,
            message: "Something went wrong while removing coupon",
            error: error.message
        });return 
    }
}

