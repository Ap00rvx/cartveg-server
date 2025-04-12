import mongoose from "mongoose";

import { IStore } from "../types/interface/interface";

// Define Store Schema

const storeSchema = new mongoose.Schema<IStore>({
    name: {
        type: String,
        required: [true, "Store name is required"],
        trim: true,
    },
    address: {
        flatno: { type: String, required: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
    },
    phone: {
        type: String,
        required: [true, "Phone number is required"],
    },
    email:{
        type:String,
        required:[true,"Email is required"],
    },
    longitude:{
        type:Number,
        required:[true,"Longitude is required"],
    },
    latitude:{
        type:Number,
        required:[true,"Latitude is required"],
    },
    radius:{
        type:Number,
        default : 5
    },
    openingTime:{
        type:String,
        default : "09-00"
    }
    },{
    timestamps:true
});

// Create Store Model

const Store = mongoose.model<IStore>("Store", storeSchema);