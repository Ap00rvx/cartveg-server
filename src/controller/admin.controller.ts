import Product from "../models/product.model";
import { Request, Response } from "express";
import User from "../models/user.model";
import bcrypt from "bcryptjs";
import {generateAdminToken} from "../config/helpers" ;
import { sendAdminLoginAlert } from "../config/nodemailer";
import { InterServerError, SuccessResponse } from "../types/types/types";
import { SortOrder } from "mongoose";
import cache from "../config/cache";
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
export const getAllProducts = async(req: Request, res: Response): Promise<void> => {
    try {
        //fetch products with pagination too
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
               
               };
               if (category) {
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




    }
    catch(err: any){
        console.error("Error fetching products:", err);
        const response: InterServerError = {
            message: err.message,
            statusCode: 500,
            stack: err.stack,
        };
        res.status(500).json(response);
    }
}
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
        product.stock = updatedStockValue;
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
export const getAllUsers = async(req: Request, res: Response): Promise<void> => {
    try {
        const query = req.query.role as string;
        if (query) {
            if(query !== "admin" && query !== "user"){
                res.status(400).json({ message: "Invalid role query" });
                return;
            }
            else {
                if(query  === "admin"){
                    const users = await User.find({ role: "admin" }).select("-password");
                    res.status(200).json({
                        statusCode: 200,
                        message: "Admin users retrieved successfully",
                        data: users,
                    });
                    return;
                }
                else{
                    
                    const users = await User.find({ role: { $ne: "admin" } }).select("-password");
                    res.status(200).json({
                        statusCode: 200,
                        message: "Users retrieved successfully",
                        data: users,
                    });
                    return;
                }
            }
        }
        const users = await User.find({}).select("-password");
        res.status(200).json({
            statusCode: 200,
            message: "Users retrieved successfully",
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
}