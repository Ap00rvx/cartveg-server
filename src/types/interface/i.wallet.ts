import mongoose from "mongoose";

export interface IUserWallet {
    userId: mongoose.Types.ObjectId; 
    current_amount : number;
    transaction_history: {
        transactionId: mongoose.Types.ObjectId; 
        amount: number; 
        type: "credit" | "debit"; 
        date: Date; 
        description: string; 
    }[]; 
}


export interface IWalletTransaction {
    wallet_id : mongoose.Types.ObjectId;
    transactionId : mongoose.Types.ObjectId;
    amount :number; 
    type: "credit" | "debit"; 
    date: Date; 
    description: string;
}