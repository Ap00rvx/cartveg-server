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
exports.searchProducts = exports.adminLogin = exports.createAdminUser = exports.updateProductAvailability = exports.updateProductDetails = exports.updateProductStock = exports.getAllProducts = exports.createMultipleProducts = void 0;
const product_model_1 = __importDefault(require("../models/product.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const helpers_1 = require("../config/helpers");
const nodemailer_1 = require("../config/nodemailer");
const cache_1 = __importDefault(require("../config/cache"));
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
const getAllProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //fetch products with pagination too
        let { page = "1", limit = "10", sort = "createdAt", order = "desc", category } = req.query;
        // Convert query params to numbers where needed
        const pageNumber = Math.max(1, parseInt(page, 10));
        const limitNumber = Math.max(1, parseInt(limit, 10));
        const skip = (pageNumber - 1) * limitNumber;
        // Sorting configuration
        const sortOrder = order === "asc" ? 1 : -1;
        const sortQuery = { [sort]: sortOrder };
        // Filtering by category if provided
        const filter = {};
        if (category) {
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
    catch (err) {
        console.error("Error fetching products:", err);
        const response = {
            message: err.message,
            statusCode: 500,
            stack: err.stack,
        };
        res.status(500).json(response);
    }
});
exports.getAllProducts = getAllProducts;
const updateProductStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId, updatedStockValue } = req.body;
        if (!productId || !updatedStockValue) {
            res.status(400).json({ message: "productId and quantity are required" });
            return;
        }
        // Find product by ID
        const product = yield product_model_1.default.findById(productId);
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }
        // Update stock
        product.stock = updatedStockValue;
        yield product.save();
        res.status(200).json({ message: "Stock updated successfully", data: product });
    }
    catch (err) {
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
});
exports.updateProductStock = updateProductStock;
const updateProductDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId, updatedDetails } = req.body;
        if (!productId || !updatedDetails) {
            res.status(400).json({ message: "productId and updatedDetails are required" });
            return;
        }
        // Find product by ID
        const product = yield product_model_1.default.findById(productId);
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }
        // remove stock and isAvailable from updatedDetails
        delete updatedDetails.stock;
        delete updatedDetails.isAvailable;
        // Update product details
        for (const key in updatedDetails) {
            if (key in product) {
                product[key] = updatedDetails[key];
            }
        }
        yield product.save();
        res.status(200).json({ message: "Product details updated successfully", data: product });
    }
    catch (err) {
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
});
exports.updateProductDetails = updateProductDetails;
const updateProductAvailability = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId, isAvailable } = req.body;
        if (!productId || isAvailable === undefined) {
            res.status(400).json({ message: "productId and isAvailable are required" });
            return;
        }
        // Find product by ID
        const product = yield product_model_1.default.findById(productId);
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }
        // Update availability
        product.isAvailable = isAvailable;
        yield product.save();
        res.status(200).json({ message: "Availability updated successfully", data: product });
    }
    catch (err) {
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
});
exports.updateProductAvailability = updateProductAvailability;
const createAdminUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            res.status(400).json({ message: "email, password, and name are required" });
            return;
        }
        // Check if user already exists
        const user = yield user_model_1.default.find({
            email: email
        });
        if (user.length > 0) {
            res.status(400).json({ message: "User already exists" });
            return;
        }
        // Hash password
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        // Create new user
        const newUser = new user_model_1.default({
            email,
            password: hashedPassword,
            name,
            role: "admin"
        });
        yield newUser.save();
        res.status(201).json({ message: "Admin user created successfully", data: newUser });
    }
    catch (err) {
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
});
exports.createAdminUser = createAdminUser;
const adminLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: "email and password are required" });
            return;
        }
        // Find user by email
        const user = yield user_model_1.default.findOne({ email });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Check if user is admin
        if (user.role !== "admin") {
            res.status(401).json({ message: "Unauthorized: Admin access required" });
            return;
        }
        // Compare passwords
        const isMatch = yield bcryptjs_1.default.compare(password, user.password);
        const token = yield (0, helpers_1.generateAdminToken)(user.role, user.email);
        const valid_till = new Date(Date.now() + 1000 * 60 * 60 * 2); // 2 hours 
        if (!isMatch) {
            res.status(401).json({ message: "Invalid password" });
            return;
        }
        const formatted_time = new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        }).format(new Date());
        const device = req.headers["user-agent"] || "Unknown device";
        yield (0, nodemailer_1.sendAdminLoginAlert)(user.email, device, formatted_time);
        res.status(200).json({ message: "Admin login successful", data: {
                name: user.name,
                email: user.email,
                role: user.role
            }, token, valid_till });
    }
    catch (err) {
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
});
exports.adminLogin = adminLogin;
const searchProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const query = (_a = req.query.query) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase();
        if (!query) {
            res.status(400).json({ message: "Query parameter is required" });
            return;
        }
        // Check cache first
        const cachedProducts = cache_1.default.get("allProducts");
        if (cachedProducts) {
            console.log("Serving from cache");
            const filteredProducts = cachedProducts.filter(product => product.name.toLowerCase().includes(query)).slice(0, 20);
            res.status(200).json({ statusCode: 200, data: filteredProducts });
            return;
        }
        console.log("Fetching from database...");
        // Fetch from DB and cache it
        const products = yield product_model_1.default.find({});
        cache_1.default.set("allProducts", products);
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
