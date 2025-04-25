import mongoose from "mongoose";
import { ICashback } from "../types/interface/i.cashback";


const cashbackSchema = new mongoose.Schema<ICashback>({

    min_purchase_amount: {
        type: Number,
        required: true,
        min: 0,
    },
    cashback_amount: {
        type: Number,
        required: true,
        min: 0,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    isActive:{
        type: Boolean,
        default: true, // Default to true if not provided
    }
}, {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
}); 



const Cashback = mongoose.model<ICashback>("Cashback", cashbackSchema);
export default Cashback;