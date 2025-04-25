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
    referralCode?: string;
    referredBy?: string;   
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
    StoreAdmin = "storeadmin",
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
export interface IPurchaseDocument{
    store_id : mongoose.Types.ObjectId; 
    date : string;
    products : 
        {
            name: string; 
            quantity: number;
            total_cost: number;
            price_per_unit: number;
            unit: string;
            // product_id: mongoose.Types.ObjectId;
        }[]; 
    
    total_cost: number;
    total_quantity: number;
}
export interface IZoneDailyProfitLoss {
    
    store_id: mongoose.Types.ObjectId; 
    date: string ;
    total_sale_amount: number;
    total_purchase_cost: number;
    total_fixed_cost: number;
    labour_cost: number;
    packaging_cost: number;
    net_profit_or_loss: number;
    status: 'Profit' | 'Loss';
    most_selling_product_id?: string; // Optional, as not all zones may have sales
    most_selling_quantity?: number;
    total_orders: number;
    avg_order_value: number;
    created_at: string;
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
