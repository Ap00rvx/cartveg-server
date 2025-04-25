import mongoose from "mongoose";

export interface ICashback {
    min_purchase_amount: number; // Minimum purchase amount required to avail the cashback
    cashback_amount: number; // Amount of cashback to be given
    description: string; // Description of the cashback offer
    isActive: boolean; // Indicates if the cashback offer is currently active
}
