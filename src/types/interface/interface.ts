
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
    origin : string;
    shelfLife: string;
    isAvailable: boolean;
}
