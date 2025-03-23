import Product from "../models/product.model";
import { Request, Response } from "express";
import { ErrorResponse, InterServerError, SuccessResponse } from "../types/types/types";
import { SortOrder } from "mongoose";
// create a new Product
// Create a New Product
const createProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        // Destructure request body
        const { name, description, price, category, stock, image, origin, shelfLife } = req.body;

        // Input Validation
        if (!name || !description || !price || !category || !stock || !origin || !shelfLife) {
            res.status(400).json({
                statusCode: 400,
                message: "All fields are required.",
            });
            return;
        }

        if (price < 0 || stock < 0) {
            res.status(400).json({
                statusCode: 400,
                message: "Price and stock must be non-negative values.",
            });
            return;
        }

        // Create product instance
        const product = new Product({
            name,
            description,
            price,
            category,
            stock,
            image: image || undefined, // Defaults to schema default if not provided
            origin,
            shelfLife,
        });

        // Save product to database
        await product.save();

        // Success Response
        const successResponse: SuccessResponse = {
            statusCode: 201,
            message: "Product added successfully",
            data: product,
        };

        res.status(201).json(successResponse);
    } catch (error: any) {
        console.error("Error creating product:", error);

        // Handle Mongoose Validation Errors
        if (error.name === "ValidationError") {
            res.status(400).json({
                statusCode: 400,
                message: "Validation error",
                errors: error.errors,
            });
            return;
        }

        // Handle Duplicate Key Errors (e.g., unique name constraint)
        if (error.code === 11000) {
            res.status(400).json({
                statusCode: 400,
                message: "Duplicate entry detected",
                details: error.keyValue,
            });
            return;
        }

        // General Internal Server Error
        const internalServerErrorResponse: InterServerError = {
            statusCode: 500,
            message: "Internal server error",
            
            stack : process.env.NODE_ENV === "development" ? error.stack : undefined, // Hide stack in production
        };

        res.status(500).json(internalServerErrorResponse);
    }
};

// Create Multiple Products
const createMultipleProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const products = req.body;

        // Check if products array exists and is not empty
        if (!Array.isArray(products) || products.length === 0) {
            res.status(400).json({
                statusCode: 400,
                message: "Request body must contain an array of products.",
            });
            return;
        }

        // Validate each product before insertion
        for (const product of products) {
            const { name, description, price, category, stock, origin, shelfLife } = product;

            if (!name || !description || !price || !category || !stock || !origin || !shelfLife) {
                res.status(400).json({
                    statusCode: 400,
                    message: "All product fields are required.",
                });
                return;
            }

            if (price < 0 || stock < 0) {
                res.status(400).json({
                    statusCode: 400,
                    message: "Price and stock must be non-negative values.",
                });
                return;
            }
        }

        // Insert products into database
        const result = await Product.insertMany(products);

        // Success Response
        const successResponse: SuccessResponse = {
            statusCode: 201,
            message: "Products added successfully",
            data: result,
        };

        res.status(201).json(successResponse);
    } catch (error: any) {
        console.error("Error creating multiple products:", error);

        // Handle Mongoose Validation Errors
        if (error.name === "ValidationError") {
            res.status(400).json({
                statusCode: 400,
                message: "Validation error",
                errors: error.errors,
            });
            return;
        }

        // Handle Duplicate Key Errors (e.g., unique name constraint)
        if (error.code === 11000) {
            res.status(400).json({
                statusCode: 400,
                message: "Duplicate entry detected",
                details: error.keyValue,
            });
            return;
        }

        // General Internal Server Error
        const internalServerErrorResponse: InterServerError = {
            statusCode: 500,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined, // Hide stack in production
        };

        res.status(500).json(internalServerErrorResponse);
    }
};



const getProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        let { page = "1", limit = "10", sort = "createdAt", order = "desc", category } = req.query;

        // Convert query params to numbers where needed
        const pageNumber = Math.max(1, parseInt(page as string, 10));
        const limitNumber = Math.max(1, parseInt(limit as string, 10));
        const skip = (pageNumber - 1) * limitNumber;

        // Sorting configuration (Fixed Typing Issue)
        const sortOrder: SortOrder = order === "asc" ? 1 : -1;
        const sortQuery: { [key: string]: SortOrder } = { [sort as string]: sortOrder };

        // Filtering by category if provided
        const filter: any = {};
        if (category) {
            filter.category = category;
        }

        // Fetch products with pagination
        const products = await Product.find(filter)
            .sort(sortQuery) // ✅ Fixed Type Issue Here
            .skip(skip)
            .limit(limitNumber);

        // Count total products for pagination metadata
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limitNumber);

        // Success Response
        const successResponse: SuccessResponse = {
            statusCode: 200,
            message: "Products retrieved successfully",
            data: {
                products,
                pagination: {
                    currentPage: pageNumber,
                    totalPages,
                    totalProducts,
                    limit: limitNumber,
                },
            },
        };

        res.status(200).json(successResponse);
    } catch (error: any) {
        console.error("Error fetching products:", error);

        // Internal Server Error Response
        const internalServerErrorResponse: InterServerError = {
            statusCode: 500,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        };

        res.status(500).json(internalServerErrorResponse);
    }
};

export { createProduct, createMultipleProducts, getProducts };