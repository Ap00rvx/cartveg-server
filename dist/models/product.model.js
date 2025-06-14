"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Define Product Schema
const productSchema = new mongoose_1.Schema({
    // Basic Product Info
    name: {
        type: String,
        required: [true, "Product name is required"],
        trim: true,
        unique: true,
        minlength: [3, "Product name must be at least 3 characters"],
    },
    description: {
        type: String,
        required: [true, "Product description is required"],
        trim: true,
        minlength: [10, "Description must be at least 10 characters"],
    },
    unit: {
        type: String,
        required: [true, "Unit is required"],
        trim: true,
        default: "450-550g"
    },
    price: {
        type: Number,
        required: [true, "Price is required"],
        min: [0, "Price must be a positive number"],
    },
    actualPrice: {
        type: Number,
        min: [0, "Actual price must be a positive number"],
    },
    category: {
        type: String,
        required: [true, "Category is required"],
        trim: true,
        index: true,
    },
    origin: {
        type: String,
        required: [true, "Product origin is required"],
        trim: true,
    },
    shelfLife: {
        type: String,
        required: [true, "Shelf life is required"],
        trim: true,
    },
    // Image Handling
    image: {
        type: String,
        default: "https://res.cloudinary.com/dqgv6uuos/image/upload/v1742729276/uploads/f5krfwxraavhpzyyhzey.png",
    },
}, { timestamps: true });
productSchema.index({ name: 1, category: 1 });
// Create & Export Model
exports.Product = mongoose_1.default.model("Product", productSchema);
exports.default = exports.Product;
