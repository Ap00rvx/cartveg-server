"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const addressSchema = new mongoose_1.default.Schema({
    flatno: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
});
const userSchema = new mongoose_1.default.Schema({
    name: { type: String, default: "" },
    email: { type: String, required: true },
    fcmTokens: [{ type: String }, { default: [] }],
    addresses: [addressSchema, { default: [] }],
    phone: { type: String, default: "" },
    dob: { type: Date },
}, {
    timestamps: true,
});
const User = mongoose_1.default.model("User", userSchema);
exports.default = User;
