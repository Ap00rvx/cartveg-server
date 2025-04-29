import mongoose from "mongoose";
import { IAppDetails } from "../types/interface/i.app-details";

const appDetailsSchema = new mongoose.Schema<IAppDetails>({
    appName: {
        type: String,
        required: true,
    },
    bannerImages: {
        type: [String],
        required: true,
    },
    privacyPolicy: {
        type: String,
        required: true,
    },
    termsAndConditions: {
        type: String,
        required: true,
    },
    aboutUs: {
        type: String,
        required: true,
    },
    contactno:{
        type:String, 
        required:true, 
    },
    email:{
        type:String, 
        required:true, 
    },
    deliveryTime:{
        type:String, 
        required:true, 
    },
    address:{
        type:String, 
        required:true, 
    },
    refAmount:{
        type:Number, 
        default : 0, 
    }
},{
    timestamps:true
});


// Create AppDetails Model

export const AppDetails = mongoose.model<IAppDetails>("AppDetails", appDetailsSchema);