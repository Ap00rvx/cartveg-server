import Product from "../models/product.model";
import { Request, Response } from "express";
import User from "../models/user.model";
import bcrypt from "bcryptjs";
import {generateAdminToken} from "../config/helpers" ;
import { sendAdminLoginAlert } from "../config/nodemailer";
import { InterServerError, SuccessResponse } from "../types/types/types";
import { SortOrder } from "mongoose";
import { IAddress, IStore, IUser, PaymentStatus } from "../types/interface/interface";
import cache from "../config/cache";
import Papa from "papaparse";
import Order from "../models/order.model";
import admin from "firebase-admin"
import { OrderStatus } from "../types/interface/interface";
import {Parser} from "json2csv"; 
import mongoose from "mongoose";
import Coupon from "../models/coupon.model";
import { Admin } from "../models/admin.model";
import { AdminRole,IAdmin } from "../types/interface/interface";
import { Store } from "../models/store.model";
import jwt from "jsonwebtoken";
import { ICashback } from "../types/interface/i.cashback";
import Cashback from "../models/cashback.model";
import { IAppDetails } from "../types/interface/i.app-details";
import { AppDetails } from "../models/app.model";
import ZoneDailyProfitLossModel from "../models/report.models";

export const createMultipleProducts = async (req: Request, res: Response): Promise<void> => {
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
            const { name, description, price, category, origin, shelfLife,actualPrice } = product;

            if (!name || !description || !price || !category  || !origin || !shelfLife || !actualPrice ) {
                res.status(400).json({
                    statusCode: 400,
                    message: "All product fields are required.",
                });
                return;
            }

            if (price < 0 ) {
                res.status(400).json({
                    statusCode: 400,
                    message: "Price  must be non-negative values.",
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


export const deleteMultipleProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const  ids  = req.body;

        // Check if ids array exists and is not empty
        if (!Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({
                statusCode: 400,
                message: "Request body must contain an array of product IDs.",
            });
            return;
        }

        // Delete products from database
        const result = await Product.deleteMany({ _id: { $in: ids } }); //$in is used to match any of the values in the array

        // Success Response
        res.status(200).json({
            statusCode: 200,
            message: "Products deleted successfully",
            data: result,
        });
    } catch (error: any) {
        console.error("Error deleting multiple products:", error);
        res.status(500).json({
            statusCode: 500,
            message: "Internal server error",
            stack: error.stack
        });
    }
}
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        // Extract query parameters with defaults
        let { page = "1", limit = "10", sort = "createdAt", order = "desc", category, query, isAvailable } = req.query;

        // Convert query params to numbers where needed
        const pageNumber = Math.max(1, parseInt(page as string, 10));
        const limitNumber = Math.max(1, parseInt(limit as string, 10));
        const skip = (pageNumber - 1) * limitNumber;

        // Sorting configuration
        const sortOrder: SortOrder = order === "asc" ? 1 : -1;
        const sortQuery: { [key: string]: SortOrder } = { [sort as string]: sortOrder };

        // Construct filtering criteria
        const filter: any = {};

        if (isAvailable !== undefined) {
            filter.isAvailable = isAvailable === "1";
        }

        if (query) {
            filter.name = { $regex: new RegExp(query as string, "i") }; // Case-insensitive search in name
        }

        if (category) {
            filter.category = { $regex: new RegExp(category as string, "i") }; // Case-insensitive category search
        }

        // Fetch products with filtering, sorting, and pagination
        const products = await Product.find(filter)
            .sort(sortQuery)
            .skip(skip)
            .limit(limitNumber);

        // Count total products for pagination metadata
        const totalProducts = await Product.countDocuments(filter);
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

    } catch (err: any) {
        console.error("Error fetching products:", err);
        res.status(500).json({
            statusCode: 500,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
};
export const getProductById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id  = req.query.id; 
        if (!id) {
            res.status(400).json({ message: "Product ID is required" });
            return;
        }
        const product = await Product.findById(id);
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }
        res.status(200).json({ message: "Product retrieved successfully", data: product });
        return 

    }catch(err: any){
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }

}

export const searchProducts = async (req: Request, res: Response): Promise<void> => {
    try{
        const query = (req.query.query as string)?.trim().toLowerCase();

        if (!query) {
            res.status(400).json({ message: "Query parameter is required" });
            return;
        }

        // Check cache first
        const cachedProducts = cache.get("allProducts") as any[];
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
            
        });
        cache.set("allProducts", products);

        // Filter results
        const filteredProducts = products.filter(product =>
            product.name.toLowerCase().includes(query)
        ).slice(0, 20);

        res.status(200).json({ statusCode: 200, data: filteredProducts });
    }
    catch(err:any){
        res.status(500).json({
            statusCode: 500,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }

}
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = req.query.role as string;
        const page = parseInt(req.query.page as string) || 1;  // Default to page 1
        const limit = parseInt(req.query.limit as string) || 10; // Default to 10 users per page
        const skip = (page - 1) * limit; // Calculate how many documents to skip

        let filter = {};
        
        if (query ) {
            if (query !== "admin" && query !== "user") {
                res.status(400).json({ message: "Invalid role query" });
                return;
            }
            filter = query === "admin" ? { role: "admin" } : { role: { $ne: "admin" } };
        }

        // Get total user count
        const totalUsers = await User.countDocuments(filter);
        const users = await User.find(filter).select("-password").skip(skip).limit(limit);

        res.status(200).json({
            statusCode: 200,
            message: "Users retrieved successfully",
            currentPage: page,
            totalPages: Math.ceil(totalUsers / limit),
            totalUsers,
            data: users,
        });
    } catch (error: any) {
        console.error("Error fetching users:", error);
        res.status(500).json({
            statusCode: 500,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
    }
};
export const updateUserDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, data }: { id: string; data: Partial<IUser> } = req.body;

        if (!id) {
            res.status(400).json({ statusCode: 400, message: "User ID is required" });
            return;
        }

        const { addresses, name, phone, dob, isActivate } = data;

        const updatedUser = await User.findByIdAndUpdate(
            id,
            {
                ...(name && { name }),
                ...(phone && { phone }),
                ...(dob && { dob }),
                ...(typeof isActivate === "boolean" && { isActivate }),
                ...(addresses && { addresses: addresses as IAddress[] }),
            },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            res.status(404).json({ statusCode: 404, message: "User not found" });
            return;
        }

        res.status(200).json({
            statusCode: 200,
            message: "User updated successfully",
            user: updatedUser,
        });
    } catch (err: any) {
        res.status(500).json({
            statusCode: 500,
            message: "Internal server error",
            stack: err.stack
        });
    }
};
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
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
        const user = await User.findById(id);

        if (!user) {
            res.status(404).json({
                statusCode: 404,
                message: "User not found",
            });
            return;
        }

        // Delete the user
        await User.findByIdAndDelete(id);

        res.status(200).json({
            statusCode: 200,
            message: "User deleted successfully",
        });

    } catch (err: any) {
        console.error("Error deleting user:", err);
        res.status(500).json({
            statusCode: 500,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
}

export const changeOrderStatus = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId, newStatus, storeId } = req.body;

    // Validate inputs
    if (!orderId || !newStatus || !storeId) {
      throw new Error("orderId, newStatus, and storeId are required");
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      throw new Error("Invalid StoreiD format");
    }

    // Validate newStatus
    const validStatuses = Object.values(OrderStatus);
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }

    // Find the order
    const order = await Order.findOne({
      orderId,
      storeId: new mongoose.Types.ObjectId(storeId),
    }).session(session);

    if (!order) {
      throw new Error("Order not found");
    }

    // Check if order is already cancelled
    if (order.status === OrderStatus.Cancelled) {
      throw new Error("Cannot change status of a cancelled order");
    }

    // Define allowed status transitions
    const allowedTransitions: { [key in OrderStatus]: OrderStatus[] } = {
      [OrderStatus.Placed]: [
        OrderStatus.Confirmed,
        OrderStatus.Shipped,
        OrderStatus.Cancelled,
      ],
      [OrderStatus.Confirmed]: [OrderStatus.Shipped, OrderStatus.Cancelled],
      [OrderStatus.Shipped]: [OrderStatus.Delivered, OrderStatus.Cancelled],
      [OrderStatus.Delivered]: [OrderStatus.Cancelled],
      [OrderStatus.Cancelled]: [],
    };

    // Validate status transition
    if (!allowedTransitions[order.status].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${order.status} to ${newStatus}`);
    }

    // If the new status is Cancelled, update ZoneDailyProfitLossModel
    if (newStatus === OrderStatus.Cancelled) {
      const orderDate = order.orderDate;
      // Format orderDate to "DD-MM-YY" to match ZoneDailyProfitLossModel
      const formattedOrderDate = `${String(orderDate.getDate()).padStart(2, '0')}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getFullYear() % 100).padStart(2, '0')}`;

      const report = await ZoneDailyProfitLossModel.findOne({
        store_id: storeId,
        date: formattedOrderDate,
      }).session(session);

      if (report) {
        report.total_sale_amount -= order.totalAmount;
        report.total_orders -= 1;
        report.avg_order_value = report.total_orders > 0 ? report.total_sale_amount / report.total_orders : 0;

        // Recalculate most sold product
        const productSales = new Map<string, number>();
        const allOrders = await Order.find({
          storeId: storeId,
          orderDate: {
            $gte: new Date(orderDate.setHours(0, 0, 0, 0)),
            $lt: new Date(orderDate.setHours(23, 59, 59, 999)),
          },
          status: { $ne: OrderStatus.Cancelled }, // Exclude cancelled orders
        }).session(session);

        for (const ord of allOrders) {
          for (const item of ord.products) {
            const productId = item.productId.toString();
            productSales.set(productId, (productSales.get(productId) || 0) + item.quantity);
          }
        }
        let maxQuantity = 0;
        let mostSellingProductId: string | undefined;
        for (const [productId, quantity] of productSales) {
          if (quantity > maxQuantity) {
            maxQuantity = quantity;
            mostSellingProductId = productId;
          }
        }
        if (mostSellingProductId) {
          report.most_selling_product_id = new mongoose.Types.ObjectId(mostSellingProductId).toString();
          report.most_selling_quantity = maxQuantity;
        } else {
          report.most_selling_product_id = "";
          report.most_selling_quantity = 0;
        }

        await report.save({ session });
      }
    }

    // Update the order status
    order.status = newStatus;
    await order.save({ session });

    // Populate product details for response
    const updatedOrder = await Order.findOne({
      orderId,
      storeId,
    })
      .populate("products.productId", "name description unit category origin shelfLife image price actualPrice", "Product")
      .lean()
      .populate("storeId", "name address phone email openingTime", "Store")
      .session(session);

    await session.commitTransaction();
    res.status(200).json({
      success: true,
      message: `Order status updated to ${newStatus}`,
      data: updatedOrder,
    });
  } catch (err: any) {
    await session.abortTransaction();
    console.error("Error updating order status:", err);
    res.status(500).json({
      success: false,
      message: "Server error while updating order status",
      error: err.message,
    });
  } finally {
    session.endSession();
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, name, phone, addresses } = req.body as Partial<IUser>;

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
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: "User already exists" });
            return;
        }

        // Create a new user
        const newUser = new User({
            email,
            name,
            phone,
            addresses: addresses || [], // Ensure addresses is an array
            role: "user",
        });

        await newUser.save();

        res.status(201).json({ message: "User created successfully", data: newUser });

    } catch (err: unknown) {
        console.error("User Creation Error:", err);
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? (err as Error).stack : undefined,
        });
    }
};
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        // Extract page and limit from query params, with default values
        let page = parseInt(req.query.page as string) || 1;
        let limit = parseInt(req.query.limit as string) || 10;
        let userId = req.query.userId as string;
        let sortBy = req.query.sortBy as string; // Can be "price" or "date"
        let sortOrder = req.query.sortOrder as string; // Can be "asc" or "desc"
        
        if (page < 1) page = 1;
        if (limit < 1) limit = 10;
        
        // Calculate the number of documents to skip
        const skip = (page - 1) * limit;
        
        // Default sorting (latest orders first)
        const sortFilter: { [key: string]: SortOrder } = { orderDate: -1 };
        
        // Apply user-defined sorting if valid
        if (sortBy && (sortBy === "price" || sortBy === "date")) {
            sortFilter[sortBy === "date" ? "orderDate" : "totalAmount"] = sortOrder === "asc" ? 1 : -1;
        }

        // Fetch orders with pagination
        const orders = await Order.find(
            userId ? { userId } : {} // Filter by userId if provided
        )
        .sort(
            sortFilter   
        ) 
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email phone") 
        .populate({
            path: "products.productId", // Populate product details inside the array
            model: "Product", // Ensure it's referring to the correct model
            select: "name price image stock category", // Select relevant fields
        })
        .populate("storeId", "name address phone email openingTime", "Store")
        .exec();

        // Get total count of orders
        const totalOrders = await Order.countDocuments();

        res.status(200).json({
            message: "Orders fetched successfully",
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            totalOrders,
            orders,
        });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
export const sendNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { fcmTokens, title, body } = req.body;
        if (!fcmTokens || !Array.isArray(fcmTokens) || fcmTokens.length === 0 || !title || !body) {
            res.status(400).json({ message: "Array of FCM tokens, title, and body are required" });
            return;
        }

        const messages = fcmTokens.map((token: string) => ({
            notification: {
                title,
                body,
            },
            token,
        }));

        const batchResponse = await admin.messaging().sendEachForMulticast({ tokens: fcmTokens, notification: { title, body } });

        const successCount = batchResponse.successCount;
        const failureCount = batchResponse.failureCount;
        const responses = batchResponse.responses.map((resp, idx) => ({
            token: fcmTokens[idx],
            success: resp.success,
            error: resp.error ? resp.error.message : null,
        }));

        res.status(200).json({
            message: `Notifications sent: ${successCount} succeeded, ${failureCount} failed`,
            details: responses,
        });
    } catch (err: any) {
        console.error("Error sending notifications:", err);
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
}
 
export const createCouponCode = async(req: Request, res: Response): Promise<void> => {
    try {
        const { code, expiry, minValue, maxUsage, offValue } = req.body;
        
        // Validate required fields
        if(!code || !expiry || !minValue || !maxUsage || !offValue) {
             res.status(400).json({
                success: false,
                message: "All fields are required: code, expiry, minValue, maxUsage, offValue"
            });
            return
        }
        
        // Check if coupon code already exists
        const existingCoupon = await Coupon.findOne({ code });
        if(existingCoupon) {
             res.status(400).json({
                success: false,
                message: "Coupon code already exists"
            });
            return
        }
        
        // Create new coupon
        const coupon = await Coupon.create({
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
        }); return; 
    } catch(error:any ) {
        console.error("Error creating coupon:", error);
         res.status(500).json({
            success: false,
            message: "Something went wrong while creating coupon",
            error: error.message
        });
        return; 
    }
};

export const getAllCoupons = async(req: Request, res: Response): Promise<void> => {
    try {
        const coupons = await Coupon.find({}).lean();
        
        if(!coupons || coupons.length === 0) {
             res.status(404).json({
                success: false,
                message: "No coupons found"
            });
            return
        }
        
         res.status(200).json({
            success: true,
            message: "Coupons fetched successfully",
            coupons
        }); return; 
    } catch(error:any ) {
        console.error("Error fetching coupons:", error);
         res.status(500).json({
            success: false,
            message: "Something went wrong while fetching coupons",
            error: error.message
        });
        return; 
    }
}

export const updateCouponDetails = async(req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.query;
        const { code, expiry, minValue, maxUsage, offValue } = req.body;
        
        // Check if coupon exists
        const coupon = await Coupon.findById(id);
        if (!coupon) {
             res.status(404).json({
                success: false,
                message: "Coupon not found"
            });return
        }
        
        // Create update object with only provided fields
        const updateData: any = {};
        if (code !== undefined) updateData.couponCode = code;
        if (expiry !== undefined) updateData.expiry = new Date(expiry);
        if (minValue !== undefined) updateData.minValue = minValue;
        if (maxUsage !== undefined) updateData.maxUsage = maxUsage;
        if (offValue !== undefined) updateData.offValue = offValue;
        
        // If code is being updated, check if new code already exists
        if (code && code !== coupon.couponCode) {
            const existingCoupon = await Coupon.findOne({ code });
            if (existingCoupon) {
                 res.status(400).json({
                    success: false,
                    message: "Coupon code already exists"
                });return
            }
        }
        
        // Update the coupon with only the provided fields
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );
        
         res.status(200).json({
            success: true,
            message: "Coupon updated successfully",
            coupon: updatedCoupon
        });return
    } catch (error:any) {
        console.error("Error updating coupon:", error);
         res.status(500).json({
            success: false,
            message: "Something went wrong while updating coupon",
            error: error.message
        });return
    }
};

export const changeCouponStatus = async(req: Request, res: Response): Promise<void> => {
    try {
        const id = req.query.id;
        const { isActive } = req.body;
        
        // Validate inputs
        if (!id) {
             res.status(400).json({
                success: false,
                message: "Coupon ID is required"
            });return
        }
        
        if (isActive === undefined) {
             res.status(400).json({
                success: false,
                message: "Active status is required"
            });return
        }
        
        // Find and update coupon status
        const coupon = await Coupon.findById(id);
        
        if (!coupon) {
             res.status(404).json({
                success: false,
                message: "Coupon not found"
            });return
        }
        
        // Update the status
        coupon.isActive = isActive;
        await coupon.save();
        
         res.status(200).json({
            success: true,
            message: `Coupon ${isActive ? 'activated' : 'deactivated'} successfully`,
            coupon
        });return
    } catch (error:any ) {
        console.error("Error changing coupon status:", error);
         res.status(500).json({
            success: false,
            message: "Something went wrong while changing coupon status",
            error: error.message
        });return
    }
};

interface CreateStoreRequest {
    name: string;
    address: {
      flatno: string;
      street: string;
      city: string;
      state: string;
      pincode: string;
    };
    phone: string;
    email: string;
    latitude: number;
    longitude: number;
    radius?: number;
  }
  
  // Controller function to create a store
  export const createStore = async (req: Request, res: Response): Promise<void> => {
    try {
      // Extract data from request body
      const { name, address, phone, email, latitude, longitude, radius }: CreateStoreRequest = req.body;
  
      // Validate required fields
      if (!name || !address || !phone || !email || latitude === undefined || longitude === undefined) {
        res.status(400).send({
          message: "Name, address, phone, email, latitude, and longitude are required",
          statusCode: 400,
        });
        return;
      }
  
      // Validate address subfields
      if (
        !address.flatno ||
        !address.street ||
        !address.city ||
        !address.state ||
        !address.pincode
      ) {
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
      const existingStore = await Store.findOne({ email });
      if (existingStore) {
        res.status(409).send({
          message: "Email already in use",
          statusCode: 409,
        });
        return;
      }
  
      // Prepare store data
      const storeData: IStore = {
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
        radius: radius ?? 5, // Default from schema
        openingTime: "09-00", // Default from schema
      };
  
      // Create and save the store
      const newStore = await Store.create(storeData);
  
      // Send success response
      res.status(201).send({
        message: "Store created successfully",
        statusCode: 201,
        data: newStore,
      });
    } catch (err: any) {
      // Handle unexpected errors
      console.error("Error creating store:", err);
      const errorResponse: InterServerError = {
        message: "Internal Server Error",
        statusCode: 500,
        stack: err.stack,
      };
      res.status(500).send(errorResponse);
    }
  };
interface CreateAdminRequest {
    name: string;
    email: string;
    password: string;
    role: AdminRole;
    storeId?: string; // Optional, required only for StoreManager
  }
export const createAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
      // Extract data from request body
      const { name, email, password, role, storeId }: CreateAdminRequest = req.body;
  
      // Validate required fields
      if (!name || !email || !password || !role) {
        res.status(400).json({
          success: false,
          message: "Name, email, password, and role are required",
        });
        return;
      }
  
      // Validate role
      if (!Object.values(AdminRole).includes(role)) {
        res.status(400).json({
          success: false,
          message: `Invalid role. Must be one of: ${Object.values(AdminRole).join(", ")}`,
        });
        return;
      }
  
      // For StoreManager, ensure storeId is provided and valid
      if (role === AdminRole.StoreManager && !storeId) {
        res.status(400).json({
          success: false,
          message: "storeId is required for StoreManager role",
        });
        return;
      }

      if(role === AdminRole.StoreAdmin && !storeId) {
        res.status(400).json({
          success: false,
          message: "storeId is required for StoreAdmin role",
        });
        return;
      }
  
      // For SuperAdmin, ensure storeId is not provided
      if (role === AdminRole.SuperAdmin && storeId) {
        res.status(400).json({
          success: false,
          message: "storeId should not be provided for SuperAdmin role",
        });
        return;
      }
  
      // Validate storeId format if provided
      if (storeId && !mongoose.Types.ObjectId.isValid(storeId)) {
        res.status(400).json({
          success: false,
          message: "Invalid storeId format",
        });
        return;
      }
  
      // Check if email already exists
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        res.status(409).json({
          success: false,
          message: "Email already in use",
        });
        return;
      }
  
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
  
      // Prepare admin data
      const adminData: Partial<IAdmin> = {
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
        isActivate: false, // Default as per schema
        isSuperAdmin: role === AdminRole.SuperAdmin, // Set based on role
      };
  
      // Add storeId for StoreManager
      if (role === AdminRole.StoreManager && storeId) {
        adminData.storeId = new mongoose.Types.ObjectId(storeId);
      }

        // Add storeId for StoreAdmin
        if (role === AdminRole.StoreAdmin && storeId) {
            adminData.storeId = new mongoose.Types.ObjectId(storeId);
        }


      // Create and save the admin
      const newAdmin = await Admin.create(adminData);
  
      // Remove password from response
      const { password: _, ...adminResponse } = newAdmin.toObject();
  
      // Send success response
      res.status(201).json({
        success: true,
        message: `${role} created successfully`,
        data: adminResponse,
      });
    } catch (error: any) {
      // Handle unexpected errors
      console.error("Error creating admin:", error);
      res.status(500).json({
        success: false,
        message: "Server error while creating admin",
        error: error.message,
      });
    }
  };

export const adminLogin =  async (req: Request, res: Response): Promise<void> => {
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
        const admin = await Admin.findOne({ email }).select("+password");
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
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
            return;
        }

        // Generate JWT token
        const token = generateAdminToken(admin.role, admin.email);

        // Send login alert email
        // sendAdminLoginAlert(admin.email, admin.name);

        // Send success response with token and user details

        var store = null ; 
        if (admin.role === AdminRole.StoreManager) {
            store = await Store.findById( admin.storeId ).select("name address phone email latitude longitude radius openingTime").lean();

        }
        const time =  jwt.verify(token, process.env.JWT_SECRET as string) as { exp: number };
        const tokenValidTill = new Date(time.exp * 1000); // Convert to milliseconds
        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                token,
                tokenValidTill,
                user: {
                    ...admin.toObject(),
                    password: undefined, // Exclude password from response
                },
                store
            },
        });
    } catch (error:any) {
        console.error("Error during admin login:", error);
         res.status(500).json({
            success: false,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
    }
}

export const assignStoreManager = async (req: Request, res: Response): Promise<void> => {
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
        const admin = await Admin.findById(adminId);
        if (!admin) {
            res.status(404).json({
                success: false,
                message: "Admin not found",
            });
            return;
        }

        // Check if store exists
        const store = await Store.findById(storeId);
        if (!store) {
            res.status(404).json({
                success: false,
                message: "Store not found",
            });
            return;
        }

        // Assign store to admin
        admin.storeId = store._id;
        await admin.save();

         res.status(200).json({
            success: true,
            message: "Store assigned to admin successfully",
            data: admin,
        });return
    } catch (error:any) {
         res.status(500).json({
            success: false,
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        });return
    }
}

export const getAllStores = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get pagination parameters from query
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
  
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
      const stores = await Store.find()
        .select("name address phone email longitude latitude radius openingTime")
        .skip(skip)
        .limit(limit)
        .lean();
  
      // Get total store count for pagination metadata
      const totalStores = await Store.countDocuments();
  
      // Fetch store managers for all stores
      const storeIds = stores.map((store) => store._id);
      const admins = await Admin.find({
        role: AdminRole.StoreManager,
        storeId: { $in: storeIds },
      })
        .select("name email isActivate storeId")
        .lean();
  
      // Map admins to stores
      const formattedStores = stores.map((store) => {
        const manager = admins.find(
          (admin) => admin.storeId && admin.storeId.toString() === store._id.toString()
        );
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
    } catch (error: any) {
      console.error("Error retrieving stores:", error);
      res.status(500).json({
        success: false,
        message: "Server error while retrieving stores",
        error: error.message,
      });
    }
  };

export const updateStoreDetails= async (req: Request, res: Response): Promise<void> => {
    try {
        const { storeId, data }: { storeId: string; data: Partial<IStore> } = req.body;

        if (!storeId) {
            res.status(400).json({ message: "Store ID is required" });
            return;
        }

        const updatedStore = await Store.findByIdAndUpdate(
            storeId,
            data,
            { new: true, runValidators: true }
        );

        if (!updatedStore) {
            res.status(404).json({ message: "Store not found" });
            return;
        }

        res.status(200).json({ message: "Store updated successfully", data: updatedStore });
    } catch (err: any) {
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
}

export const createCashback = async (req: Request, res: Response): Promise<void> => {
    try{
        const {
            min_purchase_amount,
            cashback_amount,
            isActive,
            description

        } = req.body as Partial<ICashback>;
        // Validate required fields
        if (!min_purchase_amount || !cashback_amount || isActive === undefined || !description) {
            res.status(400).json({
                message: "min_purchase_amount, cashback_amount isActive, and description are required",
            });
            return;
        }
        const cashback = await Cashback.create({
            min_purchase_amount,
            description,
            cashback_amount,
            isActive,
        }); 

        res.status(201).json({
            message: "Cashback created successfully",
            cashback,
        });

    }catch(err:any){  
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
}

export const getAllCashback = async (req: Request, res: Response): Promise<void> => {
    try{
        const cashback = await Cashback.find({}).lean();
        if(!cashback || cashback.length === 0) {
            res.status(404).json({
                message: "No cashback found",
            });
            return
        }
        res.status(200).json({
            message: "Cashback fetched successfully",
            cashback,
        });
    }catch(err:any){
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
}

export const changeCashbackActiveStatus = async (req: Request, res: Response): Promise<void> => {
    try{
    
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
        const cashback = await Cashback.findById(id);
        
        if (!cashback) {
            res.status(404).json({
                message: "Cashback not found",
            });
            return;
        }
        
        // Update the status
        cashback.isActive = isActive;
        await cashback.save();
        
        res.status(200).json({
            message: `Cashback ${isActive ? 'activated' : 'deactivated'} successfully`,
            cashback
        });

    }catch(err:any){
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
}
interface PaginationQuery {
    page?: string;
    limit?: string;
    role?: AdminRole;
    isActive?: string;
  }
  
export const getAllAdmins = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = '1', limit = '10', role, isActive }: PaginationQuery = req.query;
      
      // Parse pagination parameters
      const pageNumber = parseInt(page, 10);
      const pageSize = parseInt(limit, 10);
      const skip = (pageNumber - 1) * pageSize;
  
      // Build query
      const query: any = {};
      if (role) query.role = role;
      if (isActive !== undefined) query.isActivate = isActive === 'true';
  
      // Execute query with pagination
      const [admins, total] = await Promise.all([
        Admin.find(query)
          .select('-password')
          .skip(skip)
          .limit(pageSize)
          .populate('storeId', 'name')
          .lean(),
        Admin.countDocuments(query)
      ]);
  
      // Calculate pagination metadata
      const totalPages = Math.ceil(total / pageSize);
  
      res.status(200).json({
        success: true,
        data: admins,
        pagination: {
          currentPage: pageNumber,
          pageSize,
          totalItems: total,
          totalPages
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching admins',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
  
  // Update admin details
  export const updateAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.query;
      const updateData: Partial<IAdmin> = req.body;
  
      // Prevent updating certain fields
      const restrictedFields = ['password', 'isSuperAdmin', 'createdAt', 'updatedAt'];
      restrictedFields.forEach(field => delete updateData[field as keyof IAdmin]);
  
      // Validate role if provided
      if (updateData.role && !Object.values(AdminRole).includes(updateData.role)) {
        res.status(400).json({
          success: false,
          message: 'Invalid admin role'
        });
        return;
      }
  
      // If updating role to SuperAdmin, remove storeId requirement
      if (updateData.role === AdminRole.SuperAdmin) {
        updateData.storeId = undefined;
      }
  
      // Find and update admin
      const updatedAdmin = await Admin.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select('-password');
  
      if (!updatedAdmin) {
        res.status(404).json({
          success: false,
          message: 'Admin not found'
        });
        return;
      }
  
      res.status(200).json({
        success: true,
        data: updatedAdmin,
        message: 'Admin updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating admin',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  export const createAppDetails = async (req: Request, res: Response): Promise<void> => {
    try{
        const { appName, deliveryTime, bannerImages, privacyPolicy,termsAndConditions,aboutUs,address,contactno,email,refAmount } = req.body as Partial<IAppDetails>;
        const appDetails = await AppDetails.create({
            appName,
            deliveryTime,
            bannerImages,
            privacyPolicy,
            termsAndConditions,
            aboutUs,
            address,
            contactno,
            email,
            refAmount
        });
        res.status(201).json({
            message: "App details created successfully",
            appDetails,
        });
        // Validate required fields
    }catch(err:any){
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
  }

export const updateAppDetails = async (req: Request, res: Response): Promise<void> => {
    try{
        const { appName, deliveryTime, bannerImages, privacyPolicy,termsAndConditions,aboutUs,address,contactno,email,refAmount } = req.body as Partial<IAppDetails>;
       //update only provided fields 
        const updateData: Partial<IAppDetails> = {};
        // if (appName) updateData.appName = appName;
        if (deliveryTime) updateData.deliveryTime = deliveryTime;
        if (bannerImages) updateData.bannerImages = bannerImages;
        if (privacyPolicy) updateData.privacyPolicy = privacyPolicy;
        if (termsAndConditions) updateData.termsAndConditions = termsAndConditions;
        if (aboutUs) updateData.aboutUs = aboutUs;
        if (address) updateData.address = address;
        if (contactno) updateData.contactno = contactno;
        if(email) updateData.email = email;
        if(refAmount) updateData.refAmount = refAmount;


        // Find and update app details
        const appDetails = await AppDetails.findOneAndUpdate({appName},{
            ...updateData
        });


        res.status(200).json({
            message: "App details updated successfully",
            appDetails,
        });
    }catch(err:any){
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
}