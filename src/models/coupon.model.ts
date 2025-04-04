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
    },
    

});