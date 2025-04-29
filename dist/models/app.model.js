"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDetails = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const appDetailsSchema = new mongoose_1.default.Schema({
    appName: {
        type: String,
        required: true,
    },
    bannerImages: {
        type: [String],
        required: true,
    },
    privacyPolicy: {
        type: String,
        required: true,
    },
    termsAndConditions: {
        type: String,
        required: true,
    },
    aboutUs: {
        type: String,
        required: true,
    },
    contactno: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    deliveryTime: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    refAmount: {
        type: Number,
        default: 0,
    }
}, {
    timestamps: true
});
// Create AppDetails Model
exports.AppDetails = mongoose_1.default.model("AppDetails", appDetailsSchema);
