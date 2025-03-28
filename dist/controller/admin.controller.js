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
exports.getAllOrders = exports.createUser = exports.uploadCSV = exports.deleteUser = exports.updateUserDetails = exports.getAllUsers = exports.searchProducts = exports.adminLogin = exports.createAdminUser = exports.updateProductThreshold = exports.updateProductAvailability = exports.updateProductDetails = exports.updateProductStock = exports.getAllProducts = exports.createMultipleProducts = void 0;
const product_model_1 = __importDefault(require("../models/product.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const helpers_1 = require("../config/helpers");
const cache_1 = __importDefault(require("../config/cache"));
const papaparse_1 = __importDefault(require("papaparse"));
const order_model_1 = __importDefault(require("../models/order.model"));
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
        // Extract query parameters with defaults
        let { page = "1", limit = "10", sort = "createdAt", order = "desc", category, query, isAvailable } = req.query;
        // Convert query params to numbers where needed
        const pageNumber = Math.max(1, parseInt(page, 10));
        const limitNumber = Math.max(1, parseInt(limit, 10));
        const skip = (pageNumber - 1) * limitNumber;
        // Sorting configuration
        const sortOrder = order === "asc" ? 1 : -1;
        const sortQuery = { [sort]: sortOrder };
        // Construct filtering criteria
        const filter = {};
        if (isAvailable !== undefined) {
            filter.isAvailable = isAvailable === "1";
        }
        if (query) {
            filter.name = { $regex: new RegExp(query, "i") }; // Case-insensitive search in name
        }
        if (category) {
            filter.category = { $regex: new RegExp(category, "i") }; // Case-insensitive category search
        }
        // Fetch products with filtering, sorting, and pagination
        const products = yield product_model_1.default.find(filter)
            .sort(sortQuery)
            .skip(skip)
            .limit(limitNumber);
        // Count total products for pagination metadata
        const totalProducts = yield product_model_1.default.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limitNumber);
        // Send response
        res.status(200).json({
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
        });
    }
    catch (err) {
        console.error("Error fetching products:", err);
        res.status(500).json({
            statusCode: 500,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
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
        if (updatedStockValue < product.threshold) {
            product.isAvailable = false;
            product.stock = updatedStockValue;
        }
        else {
            product.stock = updatedStockValue;
            product.isAvailable = true;
        }
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
        delete updatedDetails.threshold;
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
const updateProductThreshold = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId, threshold } = req.body;
        if (!productId || threshold === undefined) {
            res.status(400).json({ message: "productId and threshold are required" });
            return;
        }
        // return error if threshold is negative or string 
        if (threshold < 0 || typeof threshold === "string") {
            res.status(400).json({ message: "Threshold must be a non-negative number" });
            return;
        }
        // Find product by ID
        const product = yield product_model_1.default.findById(productId);
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }
        // Update threshold
        product.threshold = threshold;
        if (product.stock < threshold) {
            product.isAvailable = false;
        }
        else {
            product.isAvailable = true;
        }
        yield product.save();
        //update new cache 
        const products = yield product_model_1.default.find({});
        cache_1.default.set("allProducts", products);
        res.status(200).json({ message: "Threshold updated successfully", data: product });
        return;
    }
    catch (err) {
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
});
exports.updateProductThreshold = updateProductThreshold;
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
        // await sendAdminLoginAlert(user.email,device,formatted_time  );
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
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = req.query.role;
        const page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = parseInt(req.query.limit) || 10; // Default to 10 users per page
        const skip = (page - 1) * limit; // Calculate how many documents to skip
        let filter = {};
        if (query) {
            if (query !== "admin" && query !== "user") {
                res.status(400).json({ message: "Invalid role query" });
                return;
            }
            filter = query === "admin" ? { role: "admin" } : { role: { $ne: "admin" } };
        }
        // Get total user count
        const totalUsers = yield user_model_1.default.countDocuments(filter);
        const users = yield user_model_1.default.find(filter).select("-password").skip(skip).limit(limit);
        res.status(200).json({
            statusCode: 200,
            message: "Users retrieved successfully",
            currentPage: page,
            totalPages: Math.ceil(totalUsers / limit),
            totalUsers,
            data: users,
        });
    }
    catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({
            statusCode: 500,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
    }
});
exports.getAllUsers = getAllUsers;
const updateUserDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, data } = req.body;
        if (!id) {
            res.status(400).json({ statusCode: 400, message: "User ID is required" });
            return;
        }
        const { addresses, name, phone, dob, isActivate } = data;
        const updatedUser = yield user_model_1.default.findByIdAndUpdate(id, Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (name && { name })), (phone && { phone })), (dob && { dob })), (typeof isActivate === "boolean" && { isActivate })), (addresses && { addresses: addresses })), { new: true, runValidators: true });
        if (!updatedUser) {
            res.status(404).json({ statusCode: 404, message: "User not found" });
            return;
        }
        res.status(200).json({
            statusCode: 200,
            message: "User updated successfully",
            user: updatedUser,
        });
    }
    catch (err) {
        res.status(500).json({
            statusCode: 500,
            message: "Internal server error",
            stack: err.stack
        });
    }
});
exports.updateUserDetails = updateUserDetails;
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.body;
        if (!id) {
            res.status(400).json({
                statusCode: 400,
                message: "User ID is required",
            });
            return;
        }
        // Find the user
        const user = yield user_model_1.default.findById(id);
        if (!user) {
            res.status(404).json({
                statusCode: 404,
                message: "User not found",
            });
            return;
        }
        // Delete the user
        yield user_model_1.default.findByIdAndDelete(id);
        res.status(200).json({
            statusCode: 200,
            message: "User deleted successfully",
        });
    }
    catch (err) {
        console.error("Error deleting user:", err);
        res.status(500).json({
            statusCode: 500,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
});
exports.deleteUser = deleteUser;
const uploadCSV = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check if file is uploaded
        if (!req.file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }
        // Validate access token
        const accessToken = req.headers["access_token"];
        if (!accessToken || accessToken !== process.env.ACCESS_TOKEN) {
            res.status(403).json({ message: "Unauthorized: Invalid Access Token" });
            return;
        }
        // Validate file type
        const allowedMimeTypes = ["text/csv", "application/vnd.ms-excel"];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            res.status(400).json({ message: "Invalid file type. Only CSV files are allowed." });
            return;
        }
        // Convert CSV buffer to string
        const csvBuffer = req.file.buffer.toString("utf-8");
        // Parse CSV to JSON
        const { data } = papaparse_1.default.parse(csvBuffer, {
            header: true, // Treat first row as headers
            skipEmptyLines: true,
            dynamicTyping: true, // Convert numbers to actual numbers
        });
        // Send response
        res.status(200).json({
            message: "CSV processed successfully",
            data, // Parsed JSON data
        });
    }
    catch (err) {
        console.error("CSV Processing Error:", err);
        res.status(500).json({
            statusCode: 500,
            message: "Internal Server Error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
});
exports.uploadCSV = uploadCSV;
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, name, phone, addresses } = req.body;
        // Validate required fields
        if (!email || !name || !phone) {
            res.status(400).json({ message: "Email, name, and phone are required" });
            return;
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({ message: "Invalid email format" });
            return;
        }
        // Validate phone number format (basic example)
        const phoneRegex = /^[0-9]{10,15}$/;
        if (!phoneRegex.test(phone)) {
            res.status(400).json({ message: "Invalid phone number" });
            return;
        }
        // Validate addresses if provided
        if (addresses && !Array.isArray(addresses)) {
            res.status(400).json({ message: "Addresses must be an array" });
            return;
        }
        // Check if user already exists
        const existingUser = yield user_model_1.default.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: "User already exists" });
            return;
        }
        // Create a new user
        const newUser = new user_model_1.default({
            email,
            name,
            phone,
            addresses: addresses || [], // Ensure addresses is an array
            role: "user",
        });
        yield newUser.save();
        res.status(201).json({ message: "User created successfully", data: newUser });
    }
    catch (err) {
        console.error("User Creation Error:", err);
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
});
exports.createUser = createUser;
const getAllOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract page and limit from query params, with default values
        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;
        let userId = req.query.userId;
        let sortBy = req.query.sortBy; // Can be "price" or "date"
        let sortOrder = req.query.sortOrder; // Can be "asc" or "desc"
        if (page < 1)
            page = 1;
        if (limit < 1)
            limit = 10;
        // Calculate the number of documents to skip
        const skip = (page - 1) * limit;
        // Default sorting (latest orders first)
        const sortFilter = { orderDate: -1 };
        // Apply user-defined sorting if valid
        if (sortBy && (sortBy === "price" || sortBy === "date")) {
            sortFilter[sortBy === "date" ? "orderDate" : "totalAmount"] = sortOrder === "asc" ? 1 : -1;
        }
        // Fetch orders with pagination
        const orders = yield order_model_1.default.find(userId ? { userId } : {} // Filter by userId if provided
        )
            .sort(sortFilter)
            .skip(skip)
            .limit(limit)
            .populate("userId", "name email phone")
            .populate({
            path: "products.productId", // Populate product details inside the array
            model: "Product", // Ensure it's referring to the correct model
            select: "name price image stock category", // Select relevant fields
        })
            .exec();
        // Get total count of orders
        const totalOrders = yield order_model_1.default.countDocuments();
        res.status(200).json({
            message: "Orders fetched successfully",
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            totalOrders,
            orders,
        });
    }
    catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.getAllOrders = getAllOrders;
