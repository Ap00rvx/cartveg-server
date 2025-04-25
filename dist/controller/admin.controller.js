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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeCashbackActiveStatus = exports.getAllCashback = exports.createCashback = exports.updateStoreDetails = exports.getAllStores = exports.assignStoreManager = exports.adminLogin = exports.createAdmin = exports.createStore = exports.changeCouponStatus = exports.updateCouponDetails = exports.getAllCoupons = exports.createCouponCode = exports.sendNotification = exports.getAllOrders = exports.createUser = exports.deleteUser = exports.updateUserDetails = exports.getAllUsers = exports.searchProducts = exports.getProductById = exports.getAllProducts = exports.deleteMultipleProducts = exports.createMultipleProducts = void 0;
const product_model_1 = __importDefault(require("../models/product.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const helpers_1 = require("../config/helpers");
const cache_1 = __importDefault(require("../config/cache"));
const order_model_1 = __importDefault(require("../models/order.model"));
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const mongoose_1 = __importDefault(require("mongoose"));
const coupon_model_1 = __importDefault(require("../models/coupon.model"));
const admin_model_1 = require("../models/admin.model");
const interface_1 = require("../types/interface/interface");
const store_model_1 = require("../models/store.model");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const cashback_model_1 = __importDefault(require("../models/cashback.model"));
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
            const { name, description, price, category, origin, shelfLife, actualPrice } = product;
            if (!name || !description || !price || !category || !origin || !shelfLife || !actualPrice) {
                res.status(400).json({
                    statusCode: 400,
                    message: "All product fields are required.",
                });
                return;
            }
            if (price < 0) {
                res.status(400).json({
                    statusCode: 400,
                    message: "Price  must be non-negative values.",
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
const deleteMultipleProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const ids = req.body;
        // Check if ids array exists and is not empty
        if (!Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({
                statusCode: 400,
                message: "Request body must contain an array of product IDs.",
            });
            return;
        }
        // Delete products from database
        const result = yield product_model_1.default.deleteMany({ _id: { $in: ids } }); //$in is used to match any of the values in the array
        // Success Response
        res.status(200).json({
            statusCode: 200,
            message: "Products deleted successfully",
            data: result,
        });
    }
    catch (error) {
        console.error("Error deleting multiple products:", error);
        res.status(500).json({
            statusCode: 500,
            message: "Internal server error",
            stack: error.stack
        });
    }
});
exports.deleteMultipleProducts = deleteMultipleProducts;
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
const getProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.query.id;
        if (!id) {
            res.status(400).json({ message: "Product ID is required" });
            return;
        }
        const product = yield product_model_1.default.findById(id);
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }
        res.status(200).json({ message: "Product retrieved successfully", data: product });
        return;
    }
    catch (err) {
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
});
exports.getProductById = getProductById;
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
const sendNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fcm, title, body, } = req.body;
        if (!fcm || !title || !body) {
            res.status(400).json({ message: "FCM token, title, and body are required" });
            return;
        }
        // Send notification logic here (e.g., using Firebase Cloud Messaging)
        const message = {
            notification: {
                title,
                body,
            },
            token: fcm,
        };
        yield firebase_admin_1.default.messaging().send(message);
        res.status(200).json({ message: "Notification sent successfully" });
    }
    catch (err) {
        console.error("Error sending notification:", err);
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
});
exports.sendNotification = sendNotification;
const createCouponCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code, expiry, minValue, maxUsage, offValue } = req.body;
        // Validate required fields
        if (!code || !expiry || !minValue || !maxUsage || !offValue) {
            res.status(400).json({
                success: false,
                message: "All fields are required: code, expiry, minValue, maxUsage, offValue"
            });
            return;
        }
        // Check if coupon code already exists
        const existingCoupon = yield coupon_model_1.default.findOne({ code });
        if (existingCoupon) {
            res.status(400).json({
                success: false,
                message: "Coupon code already exists"
            });
            return;
        }
        // Create new coupon
        const coupon = yield coupon_model_1.default.create({
            couponCode: code,
            expiry: new Date(expiry),
            minValue,
            maxUsage,
            offValue
        });
        res.status(201).json({
            success: true,
            message: "Coupon created successfully",
            coupon
        });
        return;
    }
    catch (error) {
        console.error("Error creating coupon:", error);
        res.status(500).json({
            success: false,
            message: "Something went wrong while creating coupon",
            error: error.message
        });
        return;
    }
});
exports.createCouponCode = createCouponCode;
const getAllCoupons = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const coupons = yield coupon_model_1.default.find({}).lean();
        if (!coupons || coupons.length === 0) {
            res.status(404).json({
                success: false,
                message: "No coupons found"
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Coupons fetched successfully",
            coupons
        });
        return;
    }
    catch (error) {
        console.error("Error fetching coupons:", error);
        res.status(500).json({
            success: false,
            message: "Something went wrong while fetching coupons",
            error: error.message
        });
        return;
    }
});
exports.getAllCoupons = getAllCoupons;
const updateCouponDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.query;
        const { code, expiry, minValue, maxUsage, offValue } = req.body;
        // Check if coupon exists
        const coupon = yield coupon_model_1.default.findById(id);
        if (!coupon) {
            res.status(404).json({
                success: false,
                message: "Coupon not found"
            });
            return;
        }
        // Create update object with only provided fields
        const updateData = {};
        if (code !== undefined)
            updateData.couponCode = code;
        if (expiry !== undefined)
            updateData.expiry = new Date(expiry);
        if (minValue !== undefined)
            updateData.minValue = minValue;
        if (maxUsage !== undefined)
            updateData.maxUsage = maxUsage;
        if (offValue !== undefined)
            updateData.offValue = offValue;
        // If code is being updated, check if new code already exists
        if (code && code !== coupon.couponCode) {
            const existingCoupon = yield coupon_model_1.default.findOne({ code });
            if (existingCoupon) {
                res.status(400).json({
                    success: false,
                    message: "Coupon code already exists"
                });
                return;
            }
        }
        // Update the coupon with only the provided fields
        const updatedCoupon = yield coupon_model_1.default.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        res.status(200).json({
            success: true,
            message: "Coupon updated successfully",
            coupon: updatedCoupon
        });
        return;
    }
    catch (error) {
        console.error("Error updating coupon:", error);
        res.status(500).json({
            success: false,
            message: "Something went wrong while updating coupon",
            error: error.message
        });
        return;
    }
});
exports.updateCouponDetails = updateCouponDetails;
const changeCouponStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.query.id;
        const { isActive } = req.body;
        // Validate inputs
        if (!id) {
            res.status(400).json({
                success: false,
                message: "Coupon ID is required"
            });
            return;
        }
        if (isActive === undefined) {
            res.status(400).json({
                success: false,
                message: "Active status is required"
            });
            return;
        }
        // Find and update coupon status
        const coupon = yield coupon_model_1.default.findById(id);
        if (!coupon) {
            res.status(404).json({
                success: false,
                message: "Coupon not found"
            });
            return;
        }
        // Update the status
        coupon.isActive = isActive;
        yield coupon.save();
        res.status(200).json({
            success: true,
            message: `Coupon ${isActive ? 'activated' : 'deactivated'} successfully`,
            coupon
        });
        return;
    }
    catch (error) {
        console.error("Error changing coupon status:", error);
        res.status(500).json({
            success: false,
            message: "Something went wrong while changing coupon status",
            error: error.message
        });
        return;
    }
});
exports.changeCouponStatus = changeCouponStatus;
// Controller function to create a store
const createStore = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract data from request body
        const { name, address, phone, email, latitude, longitude, radius } = req.body;
        // Validate required fields
        if (!name || !address || !phone || !email || latitude === undefined || longitude === undefined) {
            res.status(400).send({
                message: "Name, address, phone, email, latitude, and longitude are required",
                statusCode: 400,
            });
            return;
        }
        // Validate address subfields
        if (!address.flatno ||
            !address.street ||
            !address.city ||
            !address.state ||
            !address.pincode) {
            res.status(400).send({
                message: "All address fields (flatno, street, city, state, pincode) are required",
                statusCode: 400,
            });
            return;
        }
        // Validate email format (basic regex)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).send({
                message: "Invalid email format",
                statusCode: 400,
            });
            return;
        }
        // Validate phone format (basic check for digits, 10-15 characters)
        const phoneRegex = /^\d{10,15}$/;
        if (!phoneRegex.test(phone)) {
            res.status(400).send({
                message: "Invalid phone number. Must be 10-15 digits",
                statusCode: 400,
            });
            return;
        }
        // Validate radius if provided
        if (radius !== undefined && (radius <= 0 || isNaN(radius))) {
            res.status(400).send({
                message: "Radius must be a positive number",
                statusCode: 400,
            });
            return;
        }
        // Check for duplicate email
        const existingStore = yield store_model_1.Store.findOne({ email });
        if (existingStore) {
            res.status(409).send({
                message: "Email already in use",
                statusCode: 409,
            });
            return;
        }
        // Prepare store data
        const storeData = {
            name: name.trim(),
            address: {
                flatno: address.flatno.trim(),
                street: address.street.trim(),
                city: address.city.trim(),
                state: address.state.trim(),
                pincode: address.pincode.trim(),
            },
            phone: phone.trim(),
            email: email.toLowerCase(),
            latitude,
            longitude,
            radius: radius !== null && radius !== void 0 ? radius : 5, // Default from schema
            openingTime: "09-00", // Default from schema
        };
        // Create and save the store
        const newStore = yield store_model_1.Store.create(storeData);
        // Send success response
        res.status(201).send({
            message: "Store created successfully",
            statusCode: 201,
            data: newStore,
        });
    }
    catch (err) {
        // Handle unexpected errors
        console.error("Error creating store:", err);
        const errorResponse = {
            message: "Internal Server Error",
            statusCode: 500,
            stack: err.stack,
        };
        res.status(500).send(errorResponse);
    }
});
exports.createStore = createStore;
const createAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract data from request body
        const { name, email, password, role, storeId } = req.body;
        // Validate required fields
        if (!name || !email || !password || !role) {
            res.status(400).json({
                success: false,
                message: "Name, email, password, and role are required",
            });
            return;
        }
        // Validate role
        if (!Object.values(interface_1.AdminRole).includes(role)) {
            res.status(400).json({
                success: false,
                message: `Invalid role. Must be one of: ${Object.values(interface_1.AdminRole).join(", ")}`,
            });
            return;
        }
        // For StoreManager, ensure storeId is provided and valid
        if (role === interface_1.AdminRole.StoreManager && !storeId) {
            res.status(400).json({
                success: false,
                message: "storeId is required for StoreManager role",
            });
            return;
        }
        if (role === interface_1.AdminRole.StoreAdmin && !storeId) {
            res.status(400).json({
                success: false,
                message: "storeId is required for StoreAdmin role",
            });
            return;
        }
        // For SuperAdmin, ensure storeId is not provided
        if (role === interface_1.AdminRole.SuperAdmin && storeId) {
            res.status(400).json({
                success: false,
                message: "storeId should not be provided for SuperAdmin role",
            });
            return;
        }
        // Validate storeId format if provided
        if (storeId && !mongoose_1.default.Types.ObjectId.isValid(storeId)) {
            res.status(400).json({
                success: false,
                message: "Invalid storeId format",
            });
            return;
        }
        // Check if email already exists
        const existingAdmin = yield admin_model_1.Admin.findOne({ email });
        if (existingAdmin) {
            res.status(409).json({
                success: false,
                message: "Email already in use",
            });
            return;
        }
        // Hash the password
        const saltRounds = 10;
        const hashedPassword = yield bcryptjs_1.default.hash(password, saltRounds);
        // Prepare admin data
        const adminData = {
            name: name.trim(),
            email: email.toLowerCase(),
            password: hashedPassword,
            role,
            isActivate: false, // Default as per schema
            isSuperAdmin: role === interface_1.AdminRole.SuperAdmin, // Set based on role
        };
        // Add storeId for StoreManager
        if (role === interface_1.AdminRole.StoreManager && storeId) {
            adminData.storeId = new mongoose_1.default.Types.ObjectId(storeId);
        }
        // Add storeId for StoreAdmin
        if (role === interface_1.AdminRole.StoreAdmin && storeId) {
            adminData.storeId = new mongoose_1.default.Types.ObjectId(storeId);
        }
        // Create and save the admin
        const newAdmin = yield admin_model_1.Admin.create(adminData);
        // Remove password from response
        const _a = newAdmin.toObject(), { password: _ } = _a, adminResponse = __rest(_a, ["password"]);
        // Send success response
        res.status(201).json({
            success: true,
            message: `${role} created successfully`,
            data: adminResponse,
        });
    }
    catch (error) {
        // Handle unexpected errors
        console.error("Error creating admin:", error);
        res.status(500).json({
            success: false,
            message: "Server error while creating admin",
            error: error.message,
        });
    }
});
exports.createAdmin = createAdmin;
const adminLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
            return;
        }
        // Check if admin exists
        const admin = yield admin_model_1.Admin.findOne({ email }).select("+password");
        if (!admin) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
            return;
        }
        // // Check if admin is activated
        // if (!admin.isActivate && !admin.isSuperAdmin) {
        //     res.status(403).json({
        //         success: false,
        //         message: "Admin account is not activated",
        //     });
        //     return;
        // }
        // Verify password
        const isPasswordValid = yield bcryptjs_1.default.compare(password, admin.password);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
            return;
        }
        // Generate JWT token
        const token = (0, helpers_1.generateAdminToken)(admin.role, admin.email);
        // Send login alert email
        // sendAdminLoginAlert(admin.email, admin.name);
        // Send success response with token and user details
        var store = null;
        if (admin.role === interface_1.AdminRole.StoreManager) {
            store = yield store_model_1.Store.findById(admin.storeId).select("name address phone email latitude longitude radius openingTime").lean();
        }
        const time = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const tokenValidTill = new Date(time.exp * 1000); // Convert to milliseconds
        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                token,
                tokenValidTill,
                user: Object.assign(Object.assign({}, admin.toObject()), { password: undefined }),
                store
            },
        });
    }
    catch (error) {
        console.error("Error during admin login:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
    }
});
exports.adminLogin = adminLogin;
const assignStoreManager = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { adminId, storeId } = req.body;
        // Validate required fields
        if (!adminId || !storeId) {
            res.status(400).json({
                success: false,
                message: "Admin ID and Store ID are required",
            });
            return;
        }
        // Check if admin exists
        const admin = yield admin_model_1.Admin.findById(adminId);
        if (!admin) {
            res.status(404).json({
                success: false,
                message: "Admin not found",
            });
            return;
        }
        // Check if store exists
        const store = yield store_model_1.Store.findById(storeId);
        if (!store) {
            res.status(404).json({
                success: false,
                message: "Store not found",
            });
            return;
        }
        // Assign store to admin
        admin.storeId = store._id;
        yield admin.save();
        res.status(200).json({
            success: true,
            message: "Store assigned to admin successfully",
            data: admin,
        });
        return;
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
        return;
    }
});
exports.assignStoreManager = assignStoreManager;
const getAllStores = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get pagination parameters from query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        // Validate pagination parameters
        if (page < 1 || limit < 1) {
            res.status(400).json({
                success: false,
                message: "Page and limit must be positive integers",
            });
            return;
        }
        // Calculate skip for pagination
        const skip = (page - 1) * limit;
        // Fetch stores with pagination
        const stores = yield store_model_1.Store.find()
            .select("name address phone email longitude latitude radius openingTime")
            .skip(skip)
            .limit(limit)
            .lean();
        // Get total store count for pagination metadata
        const totalStores = yield store_model_1.Store.countDocuments();
        // Fetch store managers for all stores
        const storeIds = stores.map((store) => store._id);
        const admins = yield admin_model_1.Admin.find({
            role: interface_1.AdminRole.StoreManager,
            storeId: { $in: storeIds },
        })
            .select("name email isActivate storeId")
            .lean();
        // Map admins to stores
        const formattedStores = stores.map((store) => {
            const manager = admins.find((admin) => admin.storeId && admin.storeId.toString() === store._id.toString());
            return {
                _id: store._id,
                name: store.name,
                address: store.address,
                phone: store.phone,
                email: store.email,
                longitude: store.longitude,
                latitude: store.latitude,
                radius: store.radius,
                openingTime: store.openingTime,
                manager: manager
                    ? {
                        name: manager.name,
                        email: manager.email,
                    }
                    : null, // No manager found
            };
        });
        // Return paginated response
        res.status(200).json({
            success: true,
            message: "Stores retrieved successfully",
            data: {
                stores: formattedStores,
                pagination: {
                    currentPage: page,
                    limit,
                    totalStores,
                    totalPages: Math.ceil(totalStores / limit),
                },
            },
        });
    }
    catch (error) {
        console.error("Error retrieving stores:", error);
        res.status(500).json({
            success: false,
            message: "Server error while retrieving stores",
            error: error.message,
        });
    }
});
exports.getAllStores = getAllStores;
const updateStoreDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { storeId, data } = req.body;
        if (!storeId) {
            res.status(400).json({ message: "Store ID is required" });
            return;
        }
        const updatedStore = yield store_model_1.Store.findByIdAndUpdate(storeId, data, { new: true, runValidators: true });
        if (!updatedStore) {
            res.status(404).json({ message: "Store not found" });
            return;
        }
        res.status(200).json({ message: "Store updated successfully", data: updatedStore });
    }
    catch (err) {
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
});
exports.updateStoreDetails = updateStoreDetails;
const createCashback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { min_purchase_amount, cashback_amount, isActive, description } = req.body;
        // Validate required fields
        if (!min_purchase_amount || !cashback_amount || isActive === undefined || !description) {
            res.status(400).json({
                message: "min_purchase_amount, cashback_amount isActive, and description are required",
            });
            return;
        }
        const cashback = yield cashback_model_1.default.create({
            min_purchase_amount,
            description,
            cashback_amount,
            isActive,
        });
        res.status(201).json({
            message: "Cashback created successfully",
            cashback,
        });
    }
    catch (err) {
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
});
exports.createCashback = createCashback;
const getAllCashback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cashback = yield cashback_model_1.default.find({}).lean();
        if (!cashback || cashback.length === 0) {
            res.status(404).json({
                message: "No cashback found",
            });
            return;
        }
        res.status(200).json({
            message: "Cashback fetched successfully",
            cashback,
        });
    }
    catch (err) {
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
});
exports.getAllCashback = getAllCashback;
const changeCashbackActiveStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { isActive, id } = req.body;
        // Validate inputs
        if (!id) {
            res.status(400).json({
                message: "Cashback ID is required",
            });
            return;
        }
        if (isActive === undefined) {
            res.status(400).json({
                message: "Active status is required",
            });
            return;
        }
        // Find and update cashback status
        const cashback = yield cashback_model_1.default.findById(id);
        if (!cashback) {
            res.status(404).json({
                message: "Cashback not found",
            });
            return;
        }
        // Update the status
        cashback.isActive = isActive;
        yield cashback.save();
        res.status(200).json({
            message: `Cashback ${isActive ? 'activated' : 'deactivated'} successfully`,
            cashback
        });
    }
    catch (err) {
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
});
exports.changeCashbackActiveStatus = changeCashbackActiveStatus;
