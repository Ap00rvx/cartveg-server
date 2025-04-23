"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Admin = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const interface_1 = require("../types/interface/interface");
// Define Admin Schema
const adminSchema = new mongoose_1.default.Schema({
    name: {
        type: String,
        required: [true, "Admin name is required"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: [true, "Password is required"],
    },
    isActivate: {
        type: Boolean,
        default: false,
    },
    isSuperAdmin: {
        type: Boolean,
        default: false
    },
    role: {
        type: String,
        enum: interface_1.AdminRole,
        default: interface_1.AdminRole.StoreManager
    },
    storeId: {
        type: mongoose_1.default.Types.ObjectId,
        ref: 'Store',
        required: function () {
            return this.role !== interface_1.AdminRole.SuperAdmin;
        }
    }
}, {
    timestamps: true
});
// Create Admin Model
exports.Admin = mongoose_1.default.model("Admin", adminSchema);
