import User from "../models/user.model";
import Cart from "../models/cart.model";
import { Response, Request } from "express";
import { InterServerError } from "../types/types/types";
import { ICartItem } from "../types/interface/interface";
import mongoose from "mongoose";
import Product from "../models/product.model";

interface AuthRequest extends Request {
    user?: any; // Modify based on your user type
}

// Define a more specific type for populated product
interface PopulatedCartItem extends Omit<ICartItem, 'productId'> {
    productId: {
        _id: mongoose.Types.ObjectId;
        name: string;
        price: number;
        [key: string]: any; // For any other product properties
    }
}

export const getUserCart = async(req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userEmail = req.user?.email; 
        if (!userEmail) {
            res.status(401).json({ msg: "Unauthorized" });
            return;
        }
        
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            res.status(404).json({ msg: "User not found" });
            return;
        }
        
        const cart = await Cart.findOne({ userId: user._id }).populate("cartItems.productId");

        if (!cart) {
            res.status(200).json({ msg: "Cart is empty",cart: [], totalItems: 0, totalAmount: 0 });
            return;
        }
        
        const cartItems = (cart.cartItems as unknown as PopulatedCartItem[]).map((item) => ({
            productId: item.productId._id,
            name: item.productId.name,
            price: item.productId.price,
            quantity: item.quantity,
            totalPrice: item.productId.price * item.quantity
        }));        
        res.status(200).json({ 
            msg: "Cart fetched successfully",
            cart: cartItems,
            totalItems: cart.totalItems,
            totalAmount: cart.totalAmount
        });
    } catch (err: any) {
        const interServerError: InterServerError = {
            message: err.message,
            statusCode: 500,
            stack: err.stack,
        };
        res.status(500).json(interServerError);
    }
};

export const addToCart = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userEmail = req.user?.email; 
        if (!userEmail) {
            res.status(401).json({ msg: "Unauthorized" });
            return;
        }
        
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            res.status(404).json({ msg: "User not found" });
            return;
        }
        
        const { productId, quantity } = req.body;
        if (!productId || !quantity) {
            res.status(400).json({ msg: "Product ID and quantity are required" });
            return;
        }
        
        let cart = await Cart.findOne({ userId: user._id });
        
        if (!cart) {
            cart = new Cart({
                userId: user._id,
                cartItems: [],
                totalAmount: 0,
                totalItems: 0
            });
        }
        
        const existingItemIndex = cart.cartItems.findIndex((item) => item.productId.toString() === productId);
        
        if (existingItemIndex > -1) {
            cart.cartItems[existingItemIndex].quantity += quantity;
        } else {
            cart.cartItems.push({
                productId,
                quantity
            });
        }
        const product = await Product.findById(productId);
        if (!product) {
            res.status(404).json({ msg: "Product not found" });
            return;
        }
        
        cart.totalAmount += quantity * product.price; // Assuming Product model is defined and has a price field
        cart.totalItems = cart.cartItems.reduce((acc, item) => acc + item.quantity, 0);
        
        await cart.save();
        
        res.status(200).json({ msg: "Product added to cart successfully", cart });
    } catch (err: any) {
        const interServerError: InterServerError = {
            message: err.message,
            statusCode: 500,
            stack: err.stack,
        };
        res.status(500).json(interServerError);
    }
}
export const removefromcart = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userEmail = req.user?.email; 
        if (!userEmail) {
            res.status(401).json({ msg: "Unauthorized" });
            return;
        }
        
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            res.status(404).json({ msg: "User not found" });
            return;
        }
        
        const { productId } = req.body;
        if (!productId) {
            res.status(400).json({ msg: "Product ID is required" });
            return;
        }
        
        const cart = await Cart.findOne({ userId: user._id });
        
        if (!cart) {
            res.status(404).json({ msg: "Cart not found" });
            return;
        }
        
        const existingItemIndex = cart.cartItems.findIndex((item) => item.productId.toString() === productId);
        
        if (existingItemIndex === -1) {
            res.status(404).json({ msg: "Product not found in cart" });
            return;
        }
        
        const product = await Product.findById(productId);
        if (!product) {
            res.status(404).json({ msg: "Product not found" });
            return;
        }
        
        cart.totalAmount -= cart.cartItems[existingItemIndex].quantity * product.price;
        cart.cartItems.splice(existingItemIndex, 1);
        
        cart.totalItems = cart.cartItems.reduce((acc, item) => acc + item.quantity, 0);
        
        await cart.save();
        
        res.status(200).json({ msg: "Product removed from cart successfully", cart });
    } catch (err: any) {
        const interServerError: InterServerError = {
            message: err.message,
            statusCode: 500,
            stack: err.stack,
        };
        res.status(500).json(interServerError);
    }
}