"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProducts = exports.createMultipleProducts = exports.createProduct = void 0;
const product_model_1 = __importDefault(require("../models/product.model"));
// create a new Product
// Create a New Product
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const product = new product_model_1.default({
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
        yield product.save();
        // Success Response
        const successResponse = {
            statusCode: 201,
            message: "Product added successfully",
            data: product,
        };
        res.status(201).json(successResponse);
    }
    catch (error) {
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
        const internalServerErrorResponse = {
            statusCode: 500,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined, // Hide stack in production
        };
        res.status(500).json(internalServerErrorResponse);
    }
});
exports.createProduct = createProduct;
// Create Multiple Products
const createMultipleProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const result = yield product_model_1.default.insertMany(products);
        // Success Response
        const successResponse = {
            statusCode: 201,
            message: "Products added successfully",
            data: result,
        };
        res.status(201).json(successResponse);
    }
    catch (error) {
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
        const internalServerErrorResponse = {
            statusCode: 500,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined, // Hide stack in production
        };
        res.status(500).json(internalServerErrorResponse);
    }
});
exports.createMultipleProducts = createMultipleProducts;
const getProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { page = "1", limit = "10", sort = "createdAt", order = "desc", category } = req.query;
        // Convert query params to numbers where needed
        const pageNumber = Math.max(1, parseInt(page, 10));
        const limitNumber = Math.max(1, parseInt(limit, 10));
        const skip = (pageNumber - 1) * limitNumber;
        // Sorting configuration (Fixed Typing Issue)
        const sortOrder = order === "asc" ? 1 : -1;
        const sortQuery = { [sort]: sortOrder };
        // Filtering by category if provided
        const filter = {};
        if (category) {
            filter.category = category;
        }
        // Fetch products with pagination
        const products = yield product_model_1.default.find(filter)
            .sort(sortQuery) // ✅ Fixed Type Issue Here
            .skip(skip)
            .limit(limitNumber);
        // Count total products for pagination metadata
        const totalProducts = yield product_model_1.default.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limitNumber);
        // Success Response
        const successResponse = {
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
    }
    catch (error) {
        console.error("Error fetching products:", error);
        // Internal Server Error Response
        const internalServerErrorResponse = {
            statusCode: 500,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        };
        res.status(500).json(internalServerErrorResponse);
    }
});
exports.getProducts = getProducts;
