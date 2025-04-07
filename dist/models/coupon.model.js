"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const couponSchema = new mongoose_1.default.Schema({
    minValue: {
        type: Number,
        required: true,
    },
    expiry: {
        type: Date,
        required: true,
    },
    maxUsage: {
        type: Number,
        required: true,
    },
    couponCode: {
        type: String,
        required: true,
        unique: true,
    },
    offValue: {
        type: Number,
        required: true,
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
    }
});
const Coupon = mongoose_1.default.model("Coupon", couponSchema);
exports.default = Coupon;
