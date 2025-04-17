import mongoose, { Schema, Document } from "mongoose";
import { IProduct } from "../types/interface/interface";

// Define Product Schema
const productSchema = new Schema<IProduct>(
  {
    // Basic Product Info
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      unique: true,
      minlength: [3, "Product name must be at least 3 characters"],
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
    },
    unit :{
      type: String,
      required: [true, "Unit is required"],
      trim: true,
      default: "450-550g"
    },
    price:{
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be a positive number"],
    },
    
    actualPrice: {
      type: Number,
      min: [0, "Actual price must be a positive number"],
    },

    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      index: true, 
    },
    origin: {
      type: String,
      required: [true, "Product origin is required"],
      trim: true,
    },
    shelfLife: {
      type: String,
      required: [true, "Shelf life is required"],
      trim: true,
    },
    
    // Image Handling
    image: {
      type: String,
      default: "https://res.cloudinary.com/dqgv6uuos/image/upload/v1742729276/uploads/f5krfwxraavhpzyyhzey.png",
    },
  },
  { timestamps: true }
);

productSchema.index({ name: 1, category: 1 });

// Create & Export Model
export const Product = mongoose.model<IProduct>("Product", productSchema);
export default Product;
