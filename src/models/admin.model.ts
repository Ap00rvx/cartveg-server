import mongoose from "mongoose";

import { IAdmin } from "../types/interface/interface";

import { AdminRole } from "../types/interface/interface";

// Define Admin Schema
const adminSchema = new mongoose.Schema<IAdmin>({
    name: {
        type: String,
        required: [true, "Admin name is required"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: [true, "Password is required"],
    },
    isActivate: {
        type: Boolean,
        default: false,
    },
    isSuperAdmin:{
        type:Boolean,
        default:false
    },
    role:{
        type:String,
        enum : AdminRole,
        default : AdminRole.StoreManager
    },
    storeId:{
        type : mongoose.Types.ObjectId,
        ref : 'Store',
        required : function (this: IAdmin) {
            return this.role === AdminRole.StoreManager;
        }
    }
    },{
    timestamps:true
});


// Create Admin Model

export const Admin = mongoose.model<IAdmin>("Admin", adminSchema);
