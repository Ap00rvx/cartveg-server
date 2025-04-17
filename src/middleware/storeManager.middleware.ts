import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.model"; // Adjust path to your Admin model
import { AdminRole } from "../types/interface/interface"; // Adjust path to your AdminRole enum
import mongoose  from "mongoose";
// Interface for JWT payload
interface JwtPayload {
  id: string;
  email: string;
  role: AdminRole;
}

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Middleware to verify StoreManager authorization
export const verifyStoreManager = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as JwtPayload;

    // Find admin by ID
    const admin = await Admin.findById(decoded.id).select("role isSuperAdmin storeId isActivate");
    if (!admin) {
      res.status(401).json({
        success: false,
        message: "Admin not found",
      });
      return;
    }

    // Check if admin is activated
    if (!admin.isActivate) {
      res.status(403).json({
        success: false,
        message: "Admin account is not activated",
      });
      return;
    }

    // Allow SuperAdmin to proceed without storeId check
    if (admin.isSuperAdmin || admin.role === AdminRole.SuperAdmin) {
      req.user = decoded;
      next();
      return;
    }

    // Verify StoreManager role
    if (admin.role !== AdminRole.StoreManager) {
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
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
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
  } catch (error: any) {
    console.error("Error in verifyStoreManager middleware:", error);
    if (error.name === "JsonWebTokenError") {
      res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    } else if (error.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        message: "Token expired",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Server error during authorization",
        error: error.message,
      });
    }
  }
};