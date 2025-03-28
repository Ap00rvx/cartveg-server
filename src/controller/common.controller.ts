import Product from "../models/product.model";
import { Request, Response } from "express";
import { InterServerError } from "../types/types/types";
import Invoice from "../models/invoice.model";
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