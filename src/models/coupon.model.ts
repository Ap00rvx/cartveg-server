import mongoose from "mongoose";
import { ICoupon, CouponType } from "../types/interface/interface";

// Coupon Schema
const couponSchema = new mongoose.Schema<ICoupon>(
  {
    minValue: {
      type: Number,
      required: [true, "Minimum order value is required"],
      min: [0, "Minimum order value cannot be negative"],
    },
    expiry: {
      type: Date,
      required: [true, "Expiry date is required"],
    },
    maxUsage: {
      type: Number,
      required: [true, "Maximum usage limit is required"],
      min: [1, "Maximum usage must be at least 1"],
    },
    couponCode: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      trim: true,
    },
    offValue: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [0, "Discount value cannot be negative"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    usedUsers: {
      type: [String],
      default: [],
    },
    couponType: {
      type: String,
      enum: {
        values: Object.values(CouponType),
        message: "Invalid coupon type. Must be 'MaxUsage' or 'MinOrders'",
      },
      required: [true, "Coupon type is required"],
    },
    minOrders: {
      type: Number,
      required: [
        function (this: ICoupon) {
          return this.couponType === CouponType.MinOrders;
        },
        "Minimum number of orders is required for MinOrders coupon type",
      ],
      min: [0, "Minimum orders cannot be negative"],
      validate: {
        validator: function (this: ICoupon, value: number | undefined) {
          if (this.couponType === CouponType.MinOrders) {
            return value !== undefined && Number.isInteger(value);
          }
          return value === undefined || value === null;
        },
        message: "minOrders must be an integer for MinOrders coupon type, or undefined/null for MaxUsage",
      },
    },
  },
  {
    timestamps: true,
  },
);

// Coupon Model
const Coupon = mongoose.model<ICoupon>("Coupon", couponSchema);
export default Coupon;