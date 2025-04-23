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
const mongoose_1 = __importStar(require("mongoose"));
// Define the Mongoose schema
const ZoneDailyProfitLossSchema = new mongoose_1.Schema({
    store_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'Store', // Reference to the Store collection (adjust based on your actual collection name)
    },
    date: {
        type: String,
        required: true,
    },
    total_sale_amount: {
        type: Number,
        required: true,
    },
    total_purchase_cost: {
        type: Number,
        required: true,
    },
    total_fixed_cost: {
        type: Number,
        required: true,
    },
    labour_cost: {
        type: Number,
        required: true,
    },
    packaging_cost: {
        type: Number,
        required: true,
    },
    net_profit_or_loss: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['Profit', 'Loss'],
        required: true,
    },
    most_selling_product_id: {
        type: String,
        required: false,
    },
    most_selling_quantity: {
        type: Number,
        required: false,
    },
    total_orders: {
        type: Number,
        required: true,
    },
    avg_order_value: {
        type: Number,
        required: true,
    },
    created_at: {
        type: String,
        default: () => new Date().toISOString(),
    },
}, {
    timestamps: false, // We're handling created_at manually
    collection: 'zone_daily_profit_loss', // Explicitly set the collection name
});
// Create and export the Mongoose model
const ZoneDailyProfitLossModel = mongoose_1.default.model('ZoneDailyProfitLoss', ZoneDailyProfitLossSchema);
exports.default = ZoneDailyProfitLossModel;
