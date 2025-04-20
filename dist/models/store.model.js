"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Store = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// Define Store Schema
const storeSchema = new mongoose_1.default.Schema({
    name: {
        type: String,
        required: [true, "Store name is required"],
        trim: true,
    },
    address: {
        flatno: { type: String, required: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
    },
    phone: {
        type: String,
        required: [true, "Phone number is required"],
    },
    email: {
        type: String,
        required: [true, "Email is required"],
    },
    longitude: {
        type: Number,
        required: [true, "Longitude is required"],
    },
    latitude: {
        type: Number,
        required: [true, "Latitude is required"],
    },
    radius: {
        type: Number,
        default: 5
    },
    openingTime: {
        type: String,
        default: "09-00"
    }
}, {
    timestamps: true
});
// Create Store Model
exports.Store = mongoose_1.default.model("Store", storeSchema);
