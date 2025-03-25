import Product from "../models/product.model";
import { Request, Response } from "express";
import { ErrorResponse, InterServerError, SuccessResponse } from "../types/types/types";
import { SortOrder } from "mongoose";
import NodeCache from "node-cache";
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

const getProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        let { page = "1", limit = "10", sort = "createdAt", order = "desc", category } = req.query;

        // Convert query params to numbers where needed
        const pageNumber = Math.max(1, parseInt(page as string, 10));
        const limitNumber = Math.max(1, parseInt(limit as string, 10));
        const skip = (pageNumber - 1) * limitNumber;

        // Sorting configuration
        const sortOrder: SortOrder = order === "asc" ? 1 : -1;
        const sortQuery: { [key: string]: SortOrder } = { [sort as string]: sortOrder };

        // Filtering by category if provided
        const filter: any = {
            isAvailable: true, // Ensure only available products are fetched
        };
        if (category) {
            // make in case-insensitive
            filter.category = { $regex: new RegExp(category as string, "i") };
        }

        // Fetch products with pagination
        const products = await Product.find(filter)
            .sort(sortQuery)
            .skip(skip)
            .limit(limitNumber);

        // Count total products for pagination metadata
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limitNumber);

        // Success Response
        res.status(200).json({
            statusCode: 200,
            message: "Products retrieved successfully",
            data: {
                products, // No need to filter manually since it's already done in the query
                pagination: {
                    currentPage: pageNumber,
                    totalPages,
                    totalProducts,
                    limit: limitNumber,
                },
            },
        });
    } catch (error: any) {
        console.error("Error fetching products:", error);

        // Internal Server Error Response
        res.status(500).json({
            statusCode: 500,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
    }
};

// Initialize cache with 10 minutes expiration
const productCache = new NodeCache({ stdTTL: 900, checkperiod: 920 });

const searchProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = (req.query.query as string)?.trim().toLowerCase();

        if (!query) {
            res.status(400).json({ message: "Query parameter is required" });
            return;
        }

        // Check cache first
        const cachedProducts = productCache.get("allProducts") as any[];
        if (cachedProducts) {
            console.log("Serving from cache");
            const filteredProducts = cachedProducts.filter(product =>
                product.name.toLowerCase().includes(query)
            ).slice(0, 20);
            
            res.status(200).json({ statusCode: 200, data: filteredProducts });
            return;
        }

        console.log("Fetching from database...");
        
        // Fetch from DB and cache it
        const products = await Product.find({
            isAvailable: true,
        });
        productCache.set("allProducts", products);

        // Filter results
        const filteredProducts = products.filter(product =>
            product.name.toLowerCase().includes(query)
        ).slice(0, 20);

        res.status(200).json({ statusCode: 200, data: filteredProducts });
    } catch (err: any) {
        res.status(500).json({
            statusCode: 500,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
};
export { createProduct, getProducts, searchProducts
};