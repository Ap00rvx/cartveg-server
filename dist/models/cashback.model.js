"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const cashbackSchema = new mongoose_1.default.Schema({
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
    isActive: {
        type: Boolean,
        default: true, // Default to true if not provided
    }
}, {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
});
const Cashback = mongoose_1.default.model("Cashback", cashbackSchema);
exports.default = Cashback;
