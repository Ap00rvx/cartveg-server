"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// Define the Purchase schema
const PurchaseSchema = new mongoose_1.default.Schema({
    store_id: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        required: true,
        ref: "Store", // Reference to the Store collection (adjust based on your actual collection name)
    },
    date: {
        type: String,
        required: true,
    },
    products: [
        {
            name: {
                type: String,
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
            },
            total_cost: {
                type: Number,
                required: true,
            },
            price_per_unit: {
                type: Number,
                required: true,
            },
            unit: {
                type: String,
                required: true,
            },
        },
    ],
    total_cost: {
        type: Number,
        required: true,
    },
    total_quantity: {
        type: Number,
        required: true,
    },
}, { timestamps: true });
// Create the Purchase model
exports.PurchaseModel = mongoose_1.default.model("Purchase", PurchaseSchema);
