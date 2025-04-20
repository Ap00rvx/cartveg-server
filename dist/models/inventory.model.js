"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Inventory = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// Define Inventory Schema
const inventorySchema = new mongoose_1.default.Schema({
    // Products array storing inventory details for each product
    products: [
        {
            productId: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: "Product", // Reference to Product collection
                required: true, // Ensure productId is always provided
            },
            quantity: {
                type: Number,
                required: true, // Ensure quantity is always provided
                min: [0, "Quantity cannot be negative"], // Prevent negative quantities
            },
            threshold: {
                type: Number,
                required: true, // Ensure threshold is always provided
                min: [0, "Threshold cannot be negative"], // Prevent negative thresholds
            },
            availability: {
                type: Boolean,
                required: true, // Ensure availability is always provided
                default: true, // Default to true (available) if not specified
            },
        },
    ],
    // Store ID referencing the Store collection
    storeId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Store", // Reference to Store collection
        required: true, // Ensure storeId is always provided
        index: true, // Index for faster queries by storeId
    },
}, {
    timestamps: true, // Automatically add createdAt and updatedAt fields
});
// Create Inventory Model
exports.Inventory = mongoose_1.default.model("Inventory", inventorySchema);
