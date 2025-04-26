import mongoose from "mongoose";
import User from "../models/user.model";
import Otp from "../models/otp.model";
import {Store} from "../models/store.model";
import {Inventory} from "../models/inventory.model";
import Product from "../models/product.model";
import { Request, Response } from "express";
import sendMail from "../config/nodemailer";
import { InterServerError, SuccessResponse } from "../types/types/types";
import crypto from "crypto";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import Cashback from "../models/cashback.model";

dotenv.config();

/**
 * Calculates distance between two geographic points using the Haversine formula.
 * @param lat1 - Latitude of the first point (user's address).
 * @param lon1 - Longitude of the first point (user's address).
 * @param lat2 - Latitude of the second point (store).
 * @param lon2 - Longitude of the second point (store).
 * @returns Distance in kilometers.
 */
const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180; // Convert latitude difference to radians
  const dLon = (lon2 - lon1) * Math.PI / 180; // Convert longitude difference to radians
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2); // Haversine formula part a
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // Haversine formula part c
  return R * c; // Return distance in kilometers
};

/**
 * Authenticates a user by sending an OTP to their email.
 * @param req - Express request object containing user email.
 * @param res - Express response object.
 */
export const authenticate = async (req: Request, res: Response): Promise<void> => {
  const email = req.body["user_email"]; // Extract email from request body
  if (!email) {
    // Validate email presence
    res.status(400).json({ msg: "Email is required" });
    return;
  }

  try {
    let user = await User.findOne({ email }); // Check if user exists in database
    const otp = crypto.randomInt(100000, 999999).toString(); // Generate 6-digit OTP
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // Set OTP expiry to 10 minutes

    if (!user) {
      // If user doesn't exist, create a new one
      user = new User({ email });
      await user.save(); // Save new user to database
    }

    await Otp.deleteMany({ email }); // Remove any existing OTPs for this email
    await Otp.create({ email, otp, otpExpiry }); // Store new OTP in database

    await sendMail(email, otp); // Send OTP to user's email
    res.status(200).json({ msg: "OTP sent successfully" }); // Respond with success
  } catch (err: any) {
    console.error("Error authenticating user:", err); // Log error for debugging
    const response: InterServerError = {
      message: err.message,
      statusCode: 500,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined, // Include stack trace in development
    };
    res.status(500).json(response); // Send error response
  }
};

/**
 * Resends an OTP to the user's email.
 * @param req - Express request object containing user email.
 * @param res - Express response object.
 */
export const resendOtp = async (req: Request, res: Response): Promise<void> => {
  const email = req.body["user_email"]; // Extract email from request body
  if (!email) {
    // Validate email presence
    res.status(400).json({ msg: "Email is required" });
    return;
  }

  try {
    const otp = crypto.randomInt(100000, 999999).toString(); // Generate new 6-digit OTP
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // Set OTP expiry to 10 minutes

    await Otp.deleteMany({ email }); // Remove existing OTPs for this email
    await Otp.create({ email, otp, otpExpiry }); // Store new OTP in database

    await sendMail(email, otp); // Send OTP to user's email
    res.status(200).json({ msg: "OTP resent successfully", email }); // Respond with success
  } catch (err: any) {
    console.error("Error resending OTP:", err); // Log error
    const response: InterServerError = {
      message: err.message,
      statusCode: 500,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    };
    res.status(500).json(response); // Send error response
  }
};

/**
 * Verifies the OTP provided by the user and issues a JWT token.
 * @param req - Express request object containing email and OTP.
 * @param res - Express response object.
 */
export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body; // Extract email and OTP from request body
  if (!email || !otp) {
    // Validate required fields
    res.status(400).json({ msg: "Email and OTP are required" });
    return;
  }

  try {
    const otpRecord = await Otp.findOne({ email, otp }); // Find OTP record in database

    if (!otpRecord) {
      // Check if OTP is valid
      res.status(400).json({ msg: "Invalid OTP" });
      return;
    }

    if (new Date() > otpRecord.otpExpiry) {
      // Check if OTP has expired
      await Otp.deleteOne({ email, otp }); // Remove expired OTP
      res.status(400).json({ msg: "OTP expired" });
      return;
    }

    await Otp.deleteOne({ email, otp }); // Remove OTP after verification

    const token = jwt.sign({ email }, process.env.JWT_SECRET as string, { expiresIn: "100d" }); // Generate JWT token

    const user = await User.findOne({ email }); // Fetch user details
    if (!user) {
      // Ensure user exists
      res.status(400).json({ msg: "User not found" });
      return;
    }

    user.isActivate = true; // Activate user account
    await user.save(); // Save updated user
    const successResponse: SuccessResponse = {
      message: "OTP verified successfully",
      statusCode: 200,
      data: { user, token }, // Return user and token
    };
    res.status(200).json(successResponse); // Send success response
  } catch (err: any) {
    console.error("Error verifying OTP:", err); // Log error
    const response: InterServerError = {
      message: err.message,
      statusCode: 500,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    };
    res.status(500).json(response); // Send error response
  }
};

/**
 * Saves an FCM token for push notifications.
 * @param req - Express request object containing FCM token.
 * @param res - Express response object.
 */
export const saveFCMToken = async (req: Request, res: Response) => {
  const fcm = req.body.fcm; // Extract FCM token from request body
  if (!fcm) {
    // Validate FCM token presence
    res.status(400).json({ msg: "FCM token is required" });
    return;
  }
  const tokenEmail = (req as any).user?.email; // Get email from JWT token
  if (!tokenEmail) {
    // Check if user is authenticated
    res.status(401).json({ msg: "Unauthorized" });
    return;
  }
  try {
    const user = await User.findOne({ email: tokenEmail }); // Find user by email
    if (!user) {
      // Ensure user exists
      res.status(400).json({ msg: "User not found" });
      return;
    }
    const tokens = user.fcmTokens || []; // Get existing FCM tokens

    if (tokens.includes(fcm)) {
      // Check if token already exists
      const successResponse: SuccessResponse = {
        message: "FCM token already exists",
        statusCode: 200,
        data: user,
      };
      res.status(200).json(successResponse);
      return;
    }
    tokens.push(fcm); // Add new FCM token
    user.fcmTokens = tokens; // Update user's FCM tokens
    await user.save(); // Save updated user

    const successResponse: SuccessResponse = {
      message: "FCM token saved successfully",
      statusCode: 200,
      data: user,
    };
    res.status(200).json(successResponse); // Send success response
  } catch (err: any) {
    console.error("Error saving FCM token:", err); // Log error
    const response: InterServerError = {
      message: err.message,
      statusCode: 500,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    };
    res.status(500).json(response); // Send error response
  }
};

/**
 * Fetches the authenticated user's details.
 * @param req - Express request object.
 * @param res - Express response object.
 */
export const getUserDetails = async (req: Request, res: Response) => {
  try {
    const tokenEmail = (req as any).user?.email; // Get email from JWT token
    if (!tokenEmail) {
      // Check if user is authenticated
      res.status(401).json({ msg: "Unauthorized" });
      return;
    }
    const user = await User.findOne({ email: tokenEmail }); // Find user by email
    if (!user) {
      // Ensure user exists
      res.status(400).json({ msg: "User not found" });
      return;
    }
    const successResponse: SuccessResponse = {
      message: "User details fetched successfully",
      statusCode: 200,
      data: user,
    };
    res.status(200).json(successResponse); // Send success response
  } catch (err: any) {
    console.error("Error fetching user details:", err); // Log error
    const response: InterServerError = {
      message: err.message,
      statusCode: 500,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    };
    res.status(500).json(response); // Send error response
  }
};

/**
 * Saves or updates user details (name, phone, DOB).
 * @param req - Express request object containing user details.
 * @param res - Express response object.
 */
export const saveUserDetails = async (req: Request, res: Response): Promise<void> => {
  const { email, name, phone, dob } = req.body; // Extract details from request body
  if (!email || !name || !phone) {
    // Validate required fields
    res.status(400).json({ msg: "Email, name, and phone are required" });
    return;
  }
  const tokenEmail = (req as any).user?.email; // Get email from JWT token
  if (email !== tokenEmail) {
    // Ensure email matches authenticated user
    res.status(401).json({ msg: "Unauthorized: Email does not match" });
    return;
  }
  try {
    const user = await User.findOne({ email }); // Find user by email
    if (!user) {
      // Ensure user exists
      res.status(400).json({ msg: "User not found" });
      return;
    }
    user.name = name; // Update name
    user.phone = phone; // Update phone
    if (dob) user.dob = new Date(dob); // Update DOB if provided
    await user.save(); // Save updated user

    const successResponse: SuccessResponse = {
      message: "User details saved successfully",
      statusCode: 200,
      data: user,
    };
    res.status(200).json(successResponse); // Send success response
  } catch (err: any) {
    console.error("Error saving user details:", err); // Log error
    const response: InterServerError = {
      message: err.message,
      statusCode: 500,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    };
    res.status(500).json(response); // Send error response
  }
};

/**
 * Adds a new address to the user's address list.
 * @param req - Express request object containing address details.
 * @param res - Express response object.
 */
export const addAddress = async (req: Request, res: Response): Promise<void> => {
  const { flatno, street, city, state, pincode, latitude, longitude } = req.body; // Extract address fields
  if (!flatno || !street || !city || !state || !pincode || !latitude || !longitude) {
    // Validate required fields
    res.status(400).json({ msg: "All address fields are required" });
    return;
  }
  const tokenEmail = (req as any).user?.email; // Get email from JWT token
  if (!tokenEmail) {
    // Check if user is authenticated
    res.status(401).json({ msg: "Unauthorized" });
    return;
  }
  try {
    const user = await User.findOne({ email: tokenEmail }); // Find user by email
    if (!user) {
      // Ensure user exists
      res.status(400).json({ msg: "User not found" });
      return;
    }
    const newAddress = { flatno, street, city, state, pincode, latitude, longitude }; // Create new address object
    user.addresses = user.addresses || []; // Initialize addresses array if undefined
    user.addresses.push(newAddress); // Add new address to array
    await user.save(); // Save updated user

    const successResponse: SuccessResponse = {
      message: "Address added successfully",
      statusCode: 200,
      data: user,
    };
    res.status(200).json(successResponse); // Send success response
  } catch (err: any) {
    console.error("Error adding address:", err); // Log error
    const response: InterServerError = {
      message: err.message,
      statusCode: 500,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    };
    res.status(500).json(response); // Send error response
  }
};
export const removeAddress  = async (req: Request, res: Response): Promise<void> => {
  try{
    const {index} = req.body; // Extract address ID from request body
    if (index === undefined) {
      // Validate address ID presence
      res.status(400).json({ msg: "Address index is required" });
      return;
    }
    const tokenEmail = (req as any).user?.email; // Get email from JWT token
    if (!tokenEmail) {
      // Check if user is authenticated
      res.status(401).json({ msg: "Unauthorized" });
      return;
    }
    const user = await User.findOne({ email: tokenEmail }); // Find user by email
    if (!user) {
      // Ensure user exists
      res.status(400).json({ msg: "User not found" });
      return;
    }
    if (!user.addresses || user.addresses.length <= index) {
      // Validate address ID
      res.status(400).json({ msg: "Invalid address index" });
      return;
    }
    user.addresses.splice(index, 1); // Remove address from array
    await user.save(); // Save updated user

    const successResponse: SuccessResponse = {
      message: "Address removed successfully",
      statusCode: 200,
      data: user,
    };

    res.status(200).json(successResponse); // Send success response

  }catch(err:any){
    console.error("Error removing address:", err); // Log error
    const response: InterServerError = {
      message: err.message,
      statusCode: 500,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    };
    res.status(500).json(response); // Send error response
  }

};
/**
 * Fetches products from stores within delivery radius of the user's selected address.
 * @param req - Express request object containing address index.
 * @param res - Express response object.
 */
// export const getNearbyStoreProducts = async (req: Request, res: Response): Promise<void> => {
//   const { addressIndex } = req.body; // Extract address index from request body
//   if (addressIndex === undefined) {
//     // Validate address index
//     res.status(400).json({ msg: "Address index is required" });
//     return;
//   }
//   const tokenEmail = (req as any).user?.email; // Get email from JWT token
//   if (!tokenEmail) {
//     // Check if user is authenticated
//     res.status(401).json({ msg: "Unauthorized" });
//     return;
//   }
//   try {
//     const user = await User.findOne({ email: tokenEmail }); // Find user by email
//     if (!user) {
//       // Ensure user exists
//       res.status(400).json({ msg: "User not found" });
//       return;
//     }
//     if (!user.addresses || user.addresses.length <= addressIndex) {
//       // Validate address index
//       res.status(400).json({ msg: "Invalid address index" });
//       return;
//     }
//     const selectedAddress = user.addresses[addressIndex]; // Get selected address
//     const stores = await Store.find(); // Fetch all stores

//     const nearbyStores = stores.filter((store: { latitude: any; longitude: any; radius: number; }) =>
//       haversine(
//         selectedAddress.latitude,
//         selectedAddress.longitude,
//         store.latitude,
//         store.longitude
//       ) <= store.radius
//     ); // Filter stores within delivery radius

//     if (nearbyStores.length === 0) {
//       // Check if any stores are available
//       res.status(200).json({
//         message: "No stores available for delivery at this address",
//         statusCode: 200,
//         data: [],
//       });
//       return;
//     }

//     const storeIds = nearbyStores.map((store: { _id: any; }) => store._id); // Get IDs of nearby stores
//     const inventories = await Inventory.find({ storeId: { $in: storeIds }, isAvailable: true })
//       .populate({
//         path: "productId",
//         select: "name description category image unit origin shelfLife", // Populate product details
//       }); // Fetch available inventory for nearby stores

//     const products = inventories.map((inventory: { storeId: any; productId: any; stock: any; sellingPrice: any; actualPrice: any; }) => ({
//       storeId: inventory.storeId,
//       product: inventory.productId,
//       stock: inventory.stock,
//       sellingPrice: inventory.sellingPrice,
//       actualPrice: inventory.actualPrice,
//     })); // Format response data

//     const successResponse: SuccessResponse = {
//       message: "Products fetched successfully",
//       statusCode: 200,
//       data: {
//         stores: nearbyStores,
//         products,
//       },
//     };
//     res.status(200).json(successResponse); // Send success response
//   } catch (err: any) {
//     console.error("Error fetching nearby store products:", err); // Log error
//     const response: InterServerError = {
//       message: err.message,
//       statusCode: 500,
//       stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
//     };
//     res.status(500).json(response); // Send error response
//   }
// };

export const getActiveCashbacks = async (req: Request, res: Response): Promise<void> => {
  
  try {
   
    const activeCashbacks = await Cashback.find({
      isActive: true,
      
    }) // Filter active cashbacks

    const successResponse: SuccessResponse = {
      message: " cashbacks fetched successfully",
      statusCode: 200,
      data: activeCashbacks,
    };
    res.status(200).json(successResponse); // Send success response
  } catch (err: any) {
    console.error("Error fetching active cashbacks:", err); // Log error
    const response: InterServerError = {
      message: err.message,
      statusCode: 500,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    };
    res.status(500).json(response); // Send error response
  }
}