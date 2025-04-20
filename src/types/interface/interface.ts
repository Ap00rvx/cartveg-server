import mongoose from "mongoose";

export interface IUser {
    name: string;
    email:string; 
    fcmTokens: string[];
    addresses: IAddress[];
    phone : string;
    dob?: Date; 
    isActivate?: boolean;
    orders?: string[];
}
export interface IAddress {
    flatno: string;
    street: string;
    city: string
    state: string; 
    pincode: string;
    latitude: number;
    longitude: number;
}
export interface IStore {
    name: string;
    address: Object;
    phone: string;
    email: string;
    longitude: number;
    latitude: number;
    radius: number;
    openingTime: string;  
    isOpen: boolean;
    
}
export interface INotification {
    title: string;
    body: string;
    image?: string; // Optional field
    data?: any; // Optional field for additional data
}

export interface IStoreInventory {
    // Array of products with inventory details
    products: Array<{
      productId: mongoose.Types.ObjectId; // Reference to Product document
      quantity: number; // Current stock quantity
      threshold: number; // Minimum quantity before restock is needed
      availability: boolean; // Indicates if the product is available for sale
    }>;
    
    // Reference to the store
    storeId: mongoose.Types.ObjectId;
  }
export interface IProduct {
    name: string;
    description: string;
    category: string;
    image: string;
    unit:string;
    origin : string;
    shelfLife: string;
    price: number;
    actualPrice?: number;
    
}
export interface IInvoice { 
    
}
export interface IAdmin {
    name: string;
    email: string;
    password: string;
    isActivate?: boolean;
    isSuperAdmin?: boolean;
    role : AdminRole;
    storeId?: mongoose.Types.ObjectId;
}


export enum AdminRole {
    SuperAdmin = "superadmin",
    StoreManager = "storemanager",
}


export enum OrderStatus {
    Placed = "placed",
    Shipped = "shipped",
    Delivered = "delivered",
    Cancelled = "cancelled",
    Confirmed = "confirmed"
}

export enum PaymentStatus {
    Pending = "pending",
    Paid = "paid",
    Failed = "failed",
    Refund = "refund",
    Cancelled = "cancelled"
} 
export interface ICartItem { 
    productId :  mongoose.Types.ObjectId; 
    quantity : number; 
}
export interface ICart { 
    userId: mongoose.Types.ObjectId; 
    cartItems: ICartItem[]; 
    totalAmount: number; 
    totalItems: number; 
}
export interface IOrder { 
    orderId: string;  
    userId: mongoose.Types.ObjectId; 
    products: {
        productId: mongoose.Types.ObjectId; 
        quantity: number;
    }[]; 
    orderDate: Date;
    storeId : mongoose.Types.ObjectId ; 
    expectedDeliveryDate: Date; 
    totalAmount: number; 
    totalItems: number;
    status: OrderStatus;  
    isCashOnDelivery: boolean;
    deliveryAddress: IAddress;
    invoiceId: string;
    appliedCoupon?: {
        couponId: mongoose.Types.ObjectId;
        code: string;
        discountAmount: number;
    };
    paymentStatus: PaymentStatus; 
    shippingAmount :number; 
    rzpPaymentId?: string;
    rzpOrderId?: string;
}
export interface ICoupon {
    minValue  : number; 
    expiry :Date; 
    maxUsage: number; 
    couponCode : string;
    offValue :  number;
    isActive: boolean;
    isDeleted: boolean;
    usedUsers : string[]; 
}
