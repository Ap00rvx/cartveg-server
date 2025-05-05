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
exports.getActiveCashbacks = exports.removeAddress = exports.addAddress = exports.saveUserDetails = exports.getUserDetails = exports.saveFCMToken = exports.verifyOtp = exports.resendOtp = exports.authenticate = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const otp_model_1 = __importDefault(require("../models/otp.model"));
const nodemailer_1 = __importDefault(require("../config/nodemailer"));
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const cashback_model_1 = __importDefault(require("../models/cashback.model"));
dotenv_1.default.config();
/**
 * Calculates distance between two geographic points using the Haversine formula.
 * @param lat1 - Latitude of the first point (user's address).
 * @param lon1 - Longitude of the first point (user's address).
 * @param lat2 - Latitude of the second point (store).
 * @param lon2 - Longitude of the second point (store).
 * @returns Distance in kilometers.
 */
const haversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180; // Convert latitude difference to radians
    const dLon = (lon2 - lon1) * Math.PI / 180; // Convert longitude difference to radians
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
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
const authenticate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const email = req.body["user_email"]; // Extract email from request body
    if (!email) {
        // Validate email presence
        res.status(400).json({ msg: "Email is required" });
        return;
    }
    try {
        let user = yield user_model_1.default.findOne({ email }); // Check if user exists in database
        const otp = crypto_1.default.randomInt(100000, 999999).toString(); // Generate 6-digit OTP
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // Set OTP expiry to 10 minutes
        if (!user) {
            // If user doesn't exist, create a new one
            user = new user_model_1.default({ email });
            yield user.save(); // Save new user to database
        }
        yield otp_model_1.default.deleteMany({ email }); // Remove any existing OTPs for this email
        yield otp_model_1.default.create({ email, otp, otpExpiry }); // Store new OTP in database
        yield (0, nodemailer_1.default)(email, otp); // Send OTP to user's email
        res.status(200).json({ msg: "OTP sent successfully" }); // Respond with success
    }
    catch (err) {
        console.error("Error authenticating user:", err); // Log error for debugging
        const response = {
            message: err.message,
            statusCode: 500,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined, // Include stack trace in development
        };
        res.status(500).json(response); // Send error response
    }
});
exports.authenticate = authenticate;
/**
 * Resends an OTP to the user's email.
 * @param req - Express request object containing user email.
 * @param res - Express response object.
 */
const resendOtp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const email = req.body["user_email"]; // Extract email from request body
    if (!email) {
        // Validate email presence
        res.status(400).json({ msg: "Email is required" });
        return;
    }
    try {
        const otp = crypto_1.default.randomInt(100000, 999999).toString(); // Generate new 6-digit OTP
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // Set OTP expiry to 10 minutes
        yield otp_model_1.default.deleteMany({ email }); // Remove existing OTPs for this email
        yield otp_model_1.default.create({ email, otp, otpExpiry }); // Store new OTP in database
        yield (0, nodemailer_1.default)(email, otp); // Send OTP to user's email
        res.status(200).json({ msg: "OTP resent successfully", email }); // Respond with success
    }
    catch (err) {
        console.error("Error resending OTP:", err); // Log error
        const response = {
            message: err.message,
            statusCode: 500,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        };
        res.status(500).json(response); // Send error response
    }
});
exports.resendOtp = resendOtp;
/**
 * Verifies the OTP provided by the user and issues a JWT token.
 * @param req - Express request object containing email and OTP.
 * @param res - Express response object.
 */
const verifyOtp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, otp } = req.body; // Extract email and OTP from request body
    if (!email || !otp) {
        // Validate required fields
        res.status(400).json({ msg: "Email and OTP are required" });
        return;
    }
    try {
        const otpRecord = yield otp_model_1.default.findOne({ email, otp }); // Find OTP record in database
        if (!otpRecord) {
            // Check if OTP is valid
            res.status(400).json({ msg: "Invalid OTP" });
            return;
        }
        if (new Date() > otpRecord.otpExpiry) {
            // Check if OTP has expired
            yield otp_model_1.default.deleteOne({ email, otp }); // Remove expired OTP
            res.status(400).json({ msg: "OTP expired" });
            return;
        }
        yield otp_model_1.default.deleteOne({ email, otp }); // Remove OTP after verification
        const token = jsonwebtoken_1.default.sign({ email }, process.env.JWT_SECRET, { expiresIn: "100d" }); // Generate JWT token
        const user = yield user_model_1.default.findOne({ email }); // Fetch user details
        if (!user) {
            // Ensure user exists
            res.status(400).json({ msg: "User not found" });
            return;
        }
        user.isActivate = true; // Activate user account
        yield user.save(); // Save updated user
        const successResponse = {
            message: "OTP verified successfully",
            statusCode: 200,
            data: { user, token }, // Return user and token
        };
        res.status(200).json(successResponse); // Send success response
    }
    catch (err) {
        console.error("Error verifying OTP:", err); // Log error
        const response = {
            message: err.message,
            statusCode: 500,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        };
        res.status(500).json(response); // Send error response
    }
});
exports.verifyOtp = verifyOtp;
/**
 * Saves an FCM token for push notifications.
 * @param req - Express request object containing FCM token.
 * @param res - Express response object.
 */
const saveFCMToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const fcm = req.body.fcm; // Extract FCM token from request body
    if (!fcm) {
        // Validate FCM token presence
        res.status(400).json({ msg: "FCM token is required" });
        return;
    }
    const tokenEmail = (_a = req.user) === null || _a === void 0 ? void 0 : _a.email; // Get email from JWT token
    if (!tokenEmail) {
        // Check if user is authenticated
        res.status(401).json({ msg: "Unauthorized" });
        return;
    }
    try {
        const user = yield user_model_1.default.findOne({ email: tokenEmail }); // Find user by email
        if (!user) {
            // Ensure user exists
            res.status(400).json({ msg: "User not found" });
            return;
        }
        const tokens = user.fcmTokens || []; // Get existing FCM tokens
        if (tokens.includes(fcm)) {
            // Check if token already exists
            const successResponse = {
                message: "FCM token already exists",
                statusCode: 200,
                data: user,
            };
            res.status(200).json(successResponse);
            return;
        }
        tokens.push(fcm); // Add new FCM token
        user.fcmTokens = tokens; // Update user's FCM tokens
        yield user.save(); // Save updated user
        const successResponse = {
            message: "FCM token saved successfully",
            statusCode: 200,
            data: user,
        };
        res.status(200).json(successResponse); // Send success response
    }
    catch (err) {
        console.error("Error saving FCM token:", err); // Log error
        const response = {
            message: err.message,
            statusCode: 500,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        };
        res.status(500).json(response); // Send error response
    }
});
exports.saveFCMToken = saveFCMToken;
///asjkdbasjkdajksbak 
/**
 * Fetches the authenticated user's details.
 * @param req - Express request object.
 * @param res - Express response object.
 */
const getUserDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const tokenEmail = (_a = req.user) === null || _a === void 0 ? void 0 : _a.email; // Get email from JWT token
        if (!tokenEmail) {
            // Check if user is authenticated
            res.status(401).json({ msg: "Unauthorized" });
            return;
        }
        const user = yield user_model_1.default.findOne({ email: tokenEmail }); // Find user by email
        if (!user) {
            // Ensure user exists
            res.status(400).json({ msg: "User not found" });
            return;
        }
        const successResponse = {
            message: "User details fetched successfully",
            statusCode: 200,
            data: user,
        };
        res.status(200).json(successResponse); // Send success response
    }
    catch (err) {
        console.error("Error fetching user details:", err); // Log error
        const response = {
            message: err.message,
            statusCode: 500,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        };
        res.status(500).json(response); // Send error response
    }
});
exports.getUserDetails = getUserDetails;
/**
 * Saves or updates user details (name, phone, DOB).
 * @param req - Express request object containing user details.
 * @param res - Express response object.
 */
const saveUserDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { email, name, phone, dob } = req.body; // Extract details from request body
    if (!email || !name || !phone) {
        // Validate required fields
        res.status(400).json({ msg: "Email, name, and phone are required" });
        return;
    }
    const tokenEmail = (_a = req.user) === null || _a === void 0 ? void 0 : _a.email; // Get email from JWT token
    if (email !== tokenEmail) {
        // Ensure email matches authenticated user
        res.status(401).json({ msg: "Unauthorized: Email does not match" });
        return;
    }
    try {
        const user = yield user_model_1.default.findOne({ email }); // Find user by email
        if (!user) {
            // Ensure user exists
            res.status(400).json({ msg: "User not found" });
            return;
        }
        user.name = name; // Update name
        user.phone = phone; // Update phone
        if (dob)
            user.dob = new Date(dob); // Update DOB if provided
        yield user.save(); // Save updated user
        const successResponse = {
            message: "User details saved successfully",
            statusCode: 200,
            data: user,
        };
        res.status(200).json(successResponse); // Send success response
    }
    catch (err) {
        console.error("Error saving user details:", err); // Log error
        const response = {
            message: err.message,
            statusCode: 500,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        };
        res.status(500).json(response); // Send error response
    }
});
exports.saveUserDetails = saveUserDetails;
/**
 * Adds a new address to the user's address list.
 * @param req - Express request object containing address details.
 * @param res - Express response object.
 */
const addAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { flatno, street, city, state, pincode, latitude, longitude } = req.body; // Extract address fields
    if (!flatno || !street || !city || !state || !pincode || !latitude || !longitude) {
        // Validate required fields
        res.status(400).json({ msg: "All address fields are required" });
        return;
    }
    const tokenEmail = (_a = req.user) === null || _a === void 0 ? void 0 : _a.email; // Get email from JWT token
    if (!tokenEmail) {
        // Check if user is authenticated
        res.status(401).json({ msg: "Unauthorized" });
        return;
    }
    try {
        const user = yield user_model_1.default.findOne({ email: tokenEmail }); // Find user by email
        if (!user) {
            // Ensure user exists
            res.status(400).json({ msg: "User not found" });
            return;
        }
        const newAddress = { flatno, street, city, state, pincode, latitude, longitude }; // Create new address object
        user.addresses = user.addresses || []; // Initialize addresses array if undefined
        user.addresses.push(newAddress); // Add new address to array
        yield user.save(); // Save updated user
        const successResponse = {
            message: "Address added successfully",
            statusCode: 200,
            data: user,
        };
        res.status(200).json(successResponse); // Send success response
    }
    catch (err) {
        console.error("Error adding address:", err); // Log error
        const response = {
            message: err.message,
            statusCode: 500,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        };
        res.status(500).json(response); // Send error response
    }
});
exports.addAddress = addAddress;
const removeAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { index } = req.body; // Extract address ID from request body
        if (index === undefined) {
            // Validate address ID presence
            res.status(400).json({ msg: "Address index is required" });
            return;
        }
        const tokenEmail = (_a = req.user) === null || _a === void 0 ? void 0 : _a.email; // Get email from JWT token
        if (!tokenEmail) {
            // Check if user is authenticated
            res.status(401).json({ msg: "Unauthorized" });
            return;
        }
        const user = yield user_model_1.default.findOne({ email: tokenEmail }); // Find user by email
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
        yield user.save(); // Save updated user
        const successResponse = {
            message: "Address removed successfully",
            statusCode: 200,
            data: user,
        };
        res.status(200).json(successResponse); // Send success response
    }
    catch (err) {
        console.error("Error removing address:", err); // Log error
        const response = {
            message: err.message,
            statusCode: 500,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        };
        res.status(500).json(response); // Send error response
    }
});
exports.removeAddress = removeAddress;
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
const getActiveCashbacks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const activeCashbacks = yield cashback_model_1.default.find({
            isActive: true,
        }); // Filter active cashbacks
        const successResponse = {
            message: " cashbacks fetched successfully",
            statusCode: 200,
            data: activeCashbacks,
        };
        res.status(200).json(successResponse); // Send success response
    }
    catch (err) {
        console.error("Error fetching active cashbacks:", err); // Log error
        const response = {
            message: err.message,
            statusCode: 500,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        };
        res.status(500).json(response); // Send error response
    }
});
exports.getActiveCashbacks = getActiveCashbacks;
