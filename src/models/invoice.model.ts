import mongoose, { Schema, Document } from "mongoose";
import { PaymentStatus } from "../types/interface/interface"; // Import PaymentStatus enum

// Define the Invoice Interface extending Mongoose Document
export interface IInvoice extends Document {
    invoiceId: string;
    orderId: string;
    userDetails: {
        name: string;
        email: string;
        phone: string;
    },
    totalAmount: number;
    paymentStatus: PaymentStatus;
    shippingAmount : number; 
    discount : number; 
    billingAddress: {
        flatno: string;
        street: string;
        city: string;
        state: string;
        pincode: string;
    };
    shippingAddress: {
        flatno: string;
        street: string;
        city: string;
        state: string;
        pincode: string;
    };
    orderDate: Date;
    items: {
        name: string;
        quantity: number;
        price: number;
    }[];
    paymentMode: string;
}

// Invoice Schema Definition
const invoiceSchema = new Schema<IInvoice>({
    invoiceId: { type: String, required: true, unique: true },
    orderId: { type: String, required: true },
    userDetails: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
    }, 
    totalAmount: { type: Number, required: true, min: 0 },
    paymentStatus: { 
        type: String, 
        enum: Object.values(PaymentStatus), 
        required: true,
        default: PaymentStatus.Pending,
    },
    shippingAmount :{
        type: Number, required: true, min: 0
    },
    discount : {
        type:Number, 
        required : true, 
        default : 0 
    }, 
    billingAddress: {
        flatno: { type: String, required: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
    },
    shippingAddress: {
        flatno: { type: String, required: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
    },
    orderDate: { type: Date, required: true, default: Date.now },
    items: [
        {
            name: { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 },
            price: { type: Number, required: true, min: 0 },
        },
    ],
    paymentMode: { type: String, required: true },
});

// Create and export the Invoice model
const Invoice = mongoose.model<IInvoice>("Invoice", invoiceSchema);

export default Invoice;
