import mongoose from "mongoose";
import { IPurchaseDocument } from "../types/interface/interface";

// Define the Purchase schema

const PurchaseSchema = new mongoose.Schema<IPurchaseDocument>(
  {
    store_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Store", // Reference to the Store collection (adjust based on your actual collection name)
    },
    date: {
      type: String,
      required: true,
    },
    products: [
      {
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        total_cost: {
          type: Number,
          required: true,
        },
        price_per_unit: {
          type: Number,
          required: true,
        },
        unit: {
          type: String,
          required: true,
        },
        
      },
    ],
    total_cost: {
      type: Number,
      required: true,
    },
    total_quantity: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// Create the Purchase model

export const PurchaseModel = mongoose.model<IPurchaseDocument>(
  "Purchase",
  PurchaseSchema
);

