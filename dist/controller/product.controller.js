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
exports.searchProducts = exports.getProducts = exports.createProduct = exports.getSearchProductList = exports.getAvailableProductIds = void 0;
const product_model_1 = __importDefault(require("../models/product.model"));
const node_cache_1 = __importDefault(require("node-cache"));
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
const getProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { page = "1", limit = "10", sort = "createdAt", order = "desc", category } = req.query;
        // Convert query params to numbers where needed
        const pageNumber = Math.max(1, parseInt(page, 10));
        const limitNumber = Math.max(1, parseInt(limit, 10));
        const skip = (pageNumber - 1) * limitNumber;
        // Sorting configuration
        const sortOrder = order === "asc" ? 1 : -1;
        const sortQuery = { [sort]: sortOrder };
        // Filtering by category if provided
        const filter = {
            isAvailable: true, // Ensure only available products are fetched
        };
        if (category) {
            // make in case-insensitive
            filter.category = { $regex: new RegExp(category, "i") };
        }
        // Fetch products with pagination
        const products = yield product_model_1.default.find(filter)
            .sort(sortQuery)
            .skip(skip)
            .limit(limitNumber);
        // Count total products for pagination metadata
        const totalProducts = yield product_model_1.default.countDocuments(filter);
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
    }
    catch (error) {
        console.error("Error fetching products:", error);
        // Internal Server Error Response
        res.status(500).json({
            statusCode: 500,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
    }
});
exports.getProducts = getProducts;
// Initialize cache with 10 minutes expiration
const productCache = new node_cache_1.default({ stdTTL: 900, checkperiod: 920 });
const searchProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const query = (_a = req.query.query) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase();
        if (!query) {
            res.status(400).json({ message: "Query parameter is required" });
            return;
        }
        // Check cache first
        const cachedProducts = productCache.get("allProducts");
        if (cachedProducts) {
            console.log("Serving from cache");
            const filteredProducts = cachedProducts.filter(product => product.name.toLowerCase().includes(query)).slice(0, 20);
            res.status(200).json({ statusCode: 200, data: filteredProducts });
            return;
        }
        console.log("Fetching from database...");
        // Fetch from DB and cache it
        const products = yield product_model_1.default.find({
            isAvailable: true,
        });
        productCache.set("allProducts", products);
        // Filter results
        const filteredProducts = products.filter(product => product.name.toLowerCase().includes(query)).slice(0, 20);
        res.status(200).json({ statusCode: 200, data: filteredProducts });
    }
    catch (err) {
        res.status(500).json({
            statusCode: 500,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
});
exports.searchProducts = searchProducts;
const getAvailableProductIds = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield product_model_1.default.find({ isAvailable: true }).select("id");
        const ids = products.map((product) => product.id);
        res.status(200).json(ids);
    }
    catch (err) {
        res.status(500).json({
            statusCode: 500,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
});
exports.getAvailableProductIds = getAvailableProductIds;
const getSearchProductList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // return only id,name and image
        const products = yield product_model_1.default.find().select("id name image");
        const successResponse = {
            statusCode: 200,
            message: "Products retrieved successfully",
            data: products,
        };
        res.status(200).json(successResponse);
    }
    catch (err) {
        const internalServerError = {
            statusCode: 500,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        };
        res.status(500).json(internalServerError);
    }
});
exports.getSearchProductList = getSearchProductList;
