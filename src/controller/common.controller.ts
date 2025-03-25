import Product from "../models/product.model";
import { Request, Response } from "express";
import { InterServerError } from "../types/types/types";

export const getProductCategories = async (req: Request, res: Response) => {
    try {
        const categories = await Product.distinct("category");

        if (categories.length === 0) {
             res.status(400).json({ message: "No categories found" });
             return
        }
        res.status(200).json({ categories });
    } catch (error :any ) {
            const errorResponse: InterServerError = {
                statusCode: 500,
                message: "Internal server error",
                stack : error.stack
                
            }
            res.status(500).json(errorResponse);
            return
    }
}