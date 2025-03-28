import mongoose from "mongoose";

export interface IUser {
    name: string;
    email:string; 
    fcmTokens: string[];
    addresses: IAddress[];
    phone : string;
     // optional fields 
    dob?: Date; 
    // Define or import UserRole
     role?: 'admin' | 'user' ; // Example definition, adjust as needed
    isActivate?: boolean;
    password?: string;
    orders?: string[];
}


export interface IAddress {
    flatno: string;
    street: string;
    city: string
    state: string; 
    pincode: string;
}

export interface IProduct {
    name: string;
    description: string;
    price: number;
    category: string;
    stock: number;
    image: string;
    unit:string;
    actualPrice: number;
    origin : string;
    shelfLife: string;
    threshold: number;
    isAvailable: boolean;
}
export enum OrderStatus {
    Placed = "placed",
    Shipped = "shipped",
    Delivered = "delivered",
    Cancelled = "cancelled",
  }

export enum PaymentStatus {
    Pending = "pending",
    Paid = "paid",
    Failed = "failed",
} 

export interface IOrder { 
    orderId: string;  
    userId: mongoose.Types.ObjectId; 
    products: {
        productId: mongoose.Types.ObjectId;
        
        quantity: number;
    }[]; 
    orderDate: Date;
    expectedDeliveryDate: Date; 
    totalAmount: number; 
    totalItems: number;
    status: OrderStatus;  
    isCashOnDelivery: boolean;
    deliveryAddress: IAddress;
    invoiceId: string;
    paymentStatus: PaymentStatus; 
    rzpPaymentId?: string;
    rzpOrderId?: string;
}

