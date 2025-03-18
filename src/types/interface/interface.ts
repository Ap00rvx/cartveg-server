
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