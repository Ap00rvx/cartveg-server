import Product from "../models/product.model";
import { Request, Response } from "express";
import { InterServerError } from "../types/types/types";
import Invoice from "../models/invoice.model";
export const getProductCategories = async (req: Request, res: Response) => {
    try {
        // Get all products first
        const products = await Product.find({}, { category: 1, _id: 0 });
        
        if (products.length === 0) {
            res.status(404).json({ 
                message: "No products found", 
                statusCode: 404,
                error: "Not Found" 
            });
            return;
        }
        
        // Extract and normalize categories (convert to lowercase for comparison)
        const categoriesMap = new Map();
        
        products.forEach(product => {
            if (product.category) {
                // Store with original case but use lowercase as key for uniqueness
                const lowerCaseCategory = product.category.toLowerCase();
                // Keep the first occurrence of each category (with its original capitalization)
                if (!categoriesMap.has(lowerCaseCategory)) {
                    categoriesMap.set(lowerCaseCategory, product.category);
                }
            }
        });
        
        // Convert map values to array (these are the distinct categories with original casing)
        const categories = Array.from(categoriesMap.values());
        
        if (categories.length === 0) {
            res.status(404).json({ 
                message: "No categories found", 
                statusCode: 404,
                error: "Not Found" 
            });
            return;
        }
        
        // Sort categories alphabetically (optional)
        categories.sort();
        
        res.status(200).json({ 
            message: "Categories retrieved successfully",
            statusCode: 200,
            categories 
        });
    } catch (error: any) {
        const errorResponse: InterServerError = {
            statusCode: 500,
            message: "Internal server error",
            stack: error.stack
        };
        res.status(500).json(errorResponse);
        return;
    }
}
export const getInvoice = async (req: Request, res: Response) => {
    const invoiceId = req.query.invoiceId as string;
    if (!invoiceId) {
        res.status(400).json({ message: "Missing invoiceId" });
        return
    }
    try {
        const invoice = await Invoice.findOne({ invoiceId });
        if (!invoice) {
            res.status(404).json({ message: "Invoice not found" });
            return
        }
        res.status(200).json({ invoice });
    }
    catch(err:any){
        const errorResponse: InterServerError = {
            statusCode: 500,
            message: "Internal server error",
            stack : err.stack
        }
        res.status(500).json(errorResponse);
        return
    }
}