
export interface IUser {
    name: string;
    email:string; 
    fcmTokens: string[];
    addresses: IAddress[];
    phone : string;
     // optional fields 
    dob?: Date; 

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
}