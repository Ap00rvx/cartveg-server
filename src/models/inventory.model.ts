import mongoose from "mongoose";
import { IStoreInventory } from "../types/interface/interface";

// Define Inventory Schema
const inventorySchema = new mongoose.Schema<IStoreInventory>(
  {
    // Products array storing inventory details for each product
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product", // Reference to Product collection
          required: true, // Ensure productId is always provided
        },
        quantity: {
          type: Number,
          required: true, // Ensure quantity is always provided
          min: [0, "Quantity cannot be negative"], // Prevent negative quantities
        },
        threshold: {
          type: Number,
          required: true, // Ensure threshold is always provided
          min: [0, "Threshold cannot be negative"], // Prevent negative thresholds
        },
        availability: {
          type: Boolean,
          required: true, // Ensure availability is always provided
          default: true, // Default to true (available) if not specified
        },
      },
    ],
    // Store ID referencing the Store collection
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store", // Reference to Store collection
      required: true, // Ensure storeId is always provided
      index: true, // Index for faster queries by storeId
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Create Inventory Model
export const Inventory = mongoose.model<IStoreInventory>("Inventory", inventorySchema);