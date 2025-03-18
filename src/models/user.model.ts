import mongoose from "mongoose";
import { IUser } from "../types/interface/interface"; 
import { IAddress } from "../types/interface/interface";

const addressSchema = new mongoose.Schema<IAddress>({
    flatno: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
});

const userSchema = new mongoose.Schema<IUser>({
    name: { type: String, default: "" },
    email: { type: String, required: true },
    
    fcmTokens: [{ type: String } , { default: [] }],
    addresses: [addressSchema, { default: [] }],
    phone: { type: String, default: "" },
    dob: { type: Date },
    
},{
    timestamps: true,
});


const User = mongoose.model("User", userSchema);


export default User;