import Product from "../models/product.model";
import { Request, Response } from "express";
import User from "../models/user.model";
import bcrypt from "bcryptjs";
import {generateAdminToken} from "../config/helpers" ;
import { sendAdminLoginAlert } from "../config/nodemailer";
import { InterServerError, SuccessResponse } from "../types/types/types";
import { SortOrder } from "mongoose";
import { IAddress, IUser } from "../types/interface/interface";
import cache from "../config/cache";
import Papa from "papaparse";
import Order from "../models/order.model";
import admin from "firebase-admin"
// Create Multiple Products
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
export const updateProductStock = async (req: Request, res: Response): Promise<void> => {
    try {
        const { productId, updatedStockValue } = req.body;

        if (!productId || !updatedStockValue) {
            res.status(400).json({ message: "productId and quantity are required" });
            return;
        }

        // Find product by ID
        const product = await Product.findById(productId);
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }

        // Update stock
        if(updatedStockValue < product.threshold){
            product.isAvailable = false;
            product.stock = updatedStockValue;
        }
        else{
            product.stock = updatedStockValue;
            product.isAvailable = true;
        }
        await product.save();

        res.status(200).json({ message: "Stock updated successfully", data: product });
    } catch (err: any) {
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
}
export const updateProductDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { productId, updatedDetails } = req.body;

        if (!productId || !updatedDetails) {
            res.status(400).json({ message: "productId and updatedDetails are required" });
            return;
        }

        // Find product by ID
        const product = await Product.findById(productId);
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
                (product as any)[key] = updatedDetails[key];
            }
        }

        await product.save();

        res.status(200).json({ message: "Product details updated successfully", data: product });
    } catch (err: any) {
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
}
export const updateProductAvailability = async (req: Request, res: Response): Promise<void> => {
    try{
        const { productId, isAvailable } = req.body;

        if (!productId || isAvailable === undefined) {
            res.status(400).json({ message: "productId and isAvailable are required" });
            return;
        }

        // Find product by ID
        const product = await Product.findById(productId);
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }

        // Update availability
        product.isAvailable = isAvailable;
        await product.save();

        res.status(200).json({ message: "Availability updated successfully", data: product });

    }catch(err: any){
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
}
export  const updateProductThreshold = async (req: Request, res: Response): Promise<void> => {
    try {
        const { productId, threshold } = req.body;

        if (!productId || threshold === undefined) {
            res.status(400).json({ message: "productId and threshold are required" });
            return;
        }
        // return error if threshold is negative or string 
        if(threshold < 0 || typeof threshold === "string"){
            res.status(400).json({ message: "Threshold must be a non-negative number" });
            return;
        }

        // Find product by ID
        const product = await Product.findById(productId);
        if (!product) {
            res.status(404).json({ message: "Product not found" });
            return;
        }

        // Update threshold
        product.threshold = threshold;
        if(product.stock < threshold){
            product.isAvailable = false;
        }
        else{
            product.isAvailable = true;
        }

        await product.save();

        
        //update new cache 
        const products = await Product.find({});
        cache.set("allProducts", products);

        

        res.status(200).json({ message: "Threshold updated successfully", data: product });
        return 
    }catch(err:any ){
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }

}
export const createAdminUser  = async (req: Request, res: Response): Promise<void> => {
    try{
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            res.status(400).json({ message: "email, password, and name are required" });
            return;
        }

        // Check if user already exists
        const user  = await User.find({
            email: email
        }); 
        if(user.length > 0){
            res.status(400).json({ message: "User already exists" });
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({
            email,
            password: hashedPassword,
            name,
            role: "admin"
        });

        await newUser.save();

        res.status(201).json({ message: "Admin user created successfully", data: newUser });
    }
    catch(err: any){
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
}
export const adminLogin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ message: "email and password are required" });
            return;
        }

        // Find user by email
        const user = await User.findOne({ email });
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
        const isMatch = await bcrypt.compare(password, user.password as string );
        const token = await generateAdminToken(user.role as string, user.email as string);
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
        } , token, valid_till});
    } catch (err: any) {
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

export const uploadCSV = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check if file is uploaded
        if (!req.file) {
             res.status(400).json({ message: "No file uploaded" });
             return 
        }

        // Validate access token
        const accessToken = req.headers["access_token"];
        if (!accessToken || accessToken !== process.env.ACCESS_TOKEN) {
             res.status(403).json({ message: "Unauthorized: Invalid Access Token" });
             return
        }

        // Validate file type
        const allowedMimeTypes = ["text/csv", "application/vnd.ms-excel"];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
             res.status(400).json({ message: "Invalid file type. Only CSV files are allowed." });
             return
        }

        // Convert CSV buffer to string
        const csvBuffer = req.file.buffer.toString("utf-8");

        // Parse CSV to JSON
        const { data } = Papa.parse(csvBuffer, {
            header: true, // Treat first row as headers
            skipEmptyLines: true,
            dynamicTyping: true, // Convert numbers to actual numbers
        });

        // Send response
        res.status(200).json({
            message: "CSV processed successfully",
            data, // Parsed JSON data
        });

    } catch (err: unknown) {
        console.error("CSV Processing Error:", err);
        res.status(500).json({
            statusCode: 500,
            message: "Internal Server Error",
            stack: process.env.NODE_ENV === "development" ? (err as Error).stack : undefined,
        });
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
        const {fcm, title, body, } = req.body;
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
        await admin.messaging().send(message);
        res.status(200).json({ message: "Notification sent successfully" });
    }catch(err:any){
        console.error("Error sending notification:", err);
        res.status(500).json({
            message: "Internal server error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }

    
}