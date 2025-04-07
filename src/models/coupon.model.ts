import mongoose from "mongoose";
import { ICoupon } from "../types/interface/interface";

const couponSchema = new mongoose.Schema<ICoupon>({
    minValue : {
        type: Number,
        required: true,
    },
    expiry : {
        type: Date,
        required: true,
    },
    maxUsage: {
        type: Number,
        required: true,
    },
    couponCode :{
        type: String,
        required :true,
        unique : true,
    },
    offValue : {
        type:Number,
        required:true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    usedUsers : {
        type: [String],
        default: [],

    }
});

const Coupon = mongoose.model<ICoupon>("Coupon", couponSchema);
export default Coupon;