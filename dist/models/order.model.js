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
const interface_1 = require("../types/interface/interface");
const user_model_1 = require("./user.model");
const orderSchema = new mongoose_1.default.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    products: {
        type: [{
                productId: { type: mongoose_1.Schema.Types.ObjectId, required: true },
                quantity: { type: Number, required: true },
            }],
        required: true,
    },
    orderDate: {
        type: Date,
        required: true,
        default: Date.now()
    },
    expectedDeliveryDate: {
        type: Date,
        required: true,
        default: function () {
            return new Date(this.orderDate.getTime() + 2 * 24 * 60 * 60 * 1000);
        }
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    shippingAmount: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
        select: true
    },
    totalItems: {
        type: Number,
        required: true,
        default: 1,
        min: 1,
    },
    status: {
        type: String,
        enum: interface_1.OrderStatus,
        required: true,
        default: interface_1.OrderStatus.Placed
    },
    isCashOnDelivery: {
        type: Boolean,
        required: true,
    },
    deliveryAddress: {
        type: user_model_1.addressSchema,
        required: true,
    },
    invoiceId: {
        type: String,
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: interface_1.PaymentStatus,
        default: interface_1.PaymentStatus.Pending,
        required: true
    },
    rzpOrderId: {
        type: String,
        required: function () {
            return this.isCashOnDelivery === false;
        }
    },
    rzpPaymentId: {
        type: String,
        required: function () {
            return this.isCashOnDelivery === false;
        }
    }
});
const Order = mongoose_1.default.model("Order", orderSchema);
exports.default = Order;
