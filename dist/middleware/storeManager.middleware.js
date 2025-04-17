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
exports.verifyStoreManager = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const admin_model_1 = require("../models/admin.model"); // Adjust path to your Admin model
const interface_1 = require("../types/interface/interface"); // Adjust path to your AdminRole enum
const mongoose_1 = __importDefault(require("mongoose"));
// Middleware to verify StoreManager authorization
const verifyStoreManager = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                message: "Authorization token missing or invalid",
            });
            return;
        }
        const token = authHeader.split(" ")[1];
        // Verify JWT
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "your-secret-key");
        // Find admin by ID
        const admin = yield admin_model_1.Admin.findOne({ email: decoded.email }).select("role isSuperAdmin storeId isActivate");
        if (!admin) {
            res.status(401).json({
                success: false,
                message: "Admin not found",
            });
            return;
        }
        // // Check if admin is activated
        // if (!admin.isActivate) {
        //   res.status(403).json({
        //     success: false,
        //     message: "Admin account is not activated",
        //   });
        //   return;
        // }
        // Allow SuperAdmin to proceed without storeId check
        if (admin.isSuperAdmin || admin.role === interface_1.AdminRole.SuperAdmin) {
            req.user = decoded;
            next();
            return;
        }
        // Verify StoreManager role
        if (admin.role !== interface_1.AdminRole.StoreManager) {
            res.status(403).json({
                success: false,
                message: "Access denied: Only StoreManagers or SuperAdmins allowed",
            });
            return;
        }
        // Get storeId from request (body, params, or query)
        const storeId = req.body.storeId || req.params.storeId || req.query.storeId;
        if (!storeId) {
            res.status(400).json({
                success: false,
                message: "storeId is required for StoreManager actions",
            });
            return;
        }
        // Validate storeId format
        if (!mongoose_1.default.Types.ObjectId.isValid(storeId)) {
            res.status(400).json({
                success: false,
                message: "Invalid storeId format",
            });
            return;
        }
        // Verify StoreManager's storeId matches
        if (!admin.storeId || admin.storeId.toString() !== storeId) {
            res.status(403).json({
                success: false,
                message: "Access denied: StoreManager not authorized for this store",
            });
            return;
        }
        // Attach user to request for downstream use
        req.user = decoded;
        next();
    }
    catch (error) {
        console.error("Error in verifyStoreManager middleware:", error);
        if (error.name === "JsonWebTokenError") {
            res.status(401).json({
                success: false,
                message: "Invalid token",
            });
        }
        else if (error.name === "TokenExpiredError") {
            res.status(401).json({
                success: false,
                message: "Token expired",
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: "Server error during authorization",
                error: error.message,
            });
        }
    }
});
exports.verifyStoreManager = verifyStoreManager;
