import mongoose, { Schema, model } from "mongoose";
import { IUserWallet, IWalletTransaction } from "../types/interface/i.wallet";

// Transaction History Subschema (for embedding in UserWallet)
const transactionHistorySchema = new Schema({
    transactionId: {
        type: Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    type: {
        type: String,
        enum: ["credit", "debit"],
        required: true,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
});

// UserWallet Schema
const userWalletSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true, // Ensure one wallet per user
    },
    current_amount: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    transaction_history: [transactionHistorySchema],
}, {
    timestamps: true,
});



// Create and export Mongoose models
export const UserWallet = model<IUserWallet>("UserWallet", userWalletSchema);
