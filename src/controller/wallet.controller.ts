import { UserWallet } from "../models/wallet.model";
import mongoose from "mongoose";
import { Request, Response } from "express";
import User from "../models/user.model";

export const getWallet = async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string; // Assuming userId is passed as a query parameter
    if(mongoose.isValidObjectId(userId) === false) {
         res.status(400).json({
            message: "Invalid user ID",
            statusCode: 400,
        });
        return

    }
        // Find the user's wallet
        const wallet = await UserWallet.findOne({ userId }).populate("transaction_history.transactionId","amount type date description", ).sort({ date: -1 }); 
    
        if (!wallet) {
         // create new wallet if not found
         const user  = await User.findById(userId);
            if(!user) {
                res.status(404).json({
                    message: "User not found",
                    statusCode: 404,
                });
                return
            }
            const newWallet = await UserWallet.create({ userId });
             res.status(201).json({
                message: "New wallet created successfully",
                statusCode: 201,
                data: newWallet,
            });return
        }
    
         res.status(200).json({
        message: "Wallet retrieved successfully",
        statusCode: 200,
        data: wallet,
        });
        return; 
    } catch (error:any) {
         res.status(500).json({
        message: "Internal server error",
        statusCode: 500,
        error: error.message,
        });
        return
    }
}