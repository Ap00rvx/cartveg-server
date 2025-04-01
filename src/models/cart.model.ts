import { ICart,ICartItem } from "../types/interface/interface";
import mongoose from "mongoose";
const cartItemSchema = new mongoose.Schema<ICartItem>({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
});

const cartSchema = new mongoose.Schema<ICart>({
    userId :{
        type :mongoose.Schema.Types.ObjectId,
        ref:"User", 
        required:true,
        unique : true
    },
    cartItems: {
        type: [cartItemSchema],
        required: true,
        default: [],
    },
    totalAmount: { type: Number, default: 0 },
    totalItems: { type: Number, default: 0 },
});  

const Cart = mongoose.model<ICart>("Cart", cartSchema);

export default Cart ; 
