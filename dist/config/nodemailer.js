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
exports.sendOrderCreatedMail = exports.sendMail = exports.sendAdminLoginAlert = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = __importDefault(require("../models/user.model")); // Adjust path to your User model
const admin_model_1 = require("../models/admin.model"); // Adjust path to your Admin model
const interface_1 = require("../types/interface/interface"); // Adjust path to your AdminRole enum
dotenv_1.default.config();
const transporter = nodemailer_1.default.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use `true` for port 465, `false` for all other ports
    auth: {
        user: process.env.APP_EMAIL,
        pass: process.env.APP_PASSWORD,
    },
});
const sendAdminLoginAlert = (email, device, time) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield transporter.sendMail({
            from: `"CartVeg" <${process.env.APP_EMAIL}>`,
            to: email,
            subject: "🚨 Admin Login Alert",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
                    <h2 style="color: #2c3e50; text-align: center;">🔔 Admin Login Alert</h2>
                    <p style="font-size: 16px; color: #555; text-align: center;">
                        Your admin account was accessed from a new device.
                    </p>
                    <div style="text-align: center; margin: 20px 0;">
                        <span style="font-size: 18px; font-weight: bold; color: #e74c3c; background: #fff; padding: 10px 15px; border-radius: 5px; border: 2px dashed #e74c3c;">
                            ${device}
                        </span>
                    </div>
                    <p style="text-align: center; font-size: 14px; color: #555;">
                        Date & Time: <strong>${time}</strong>
                    </p>
                    <hr style="border: 0; height: 1px; background: #ddd; margin: 20px 0;">
                    <p style="font-size: 14px; color: #777; text-align: center;">
                        If this wasn't you, please reset your password immediately.
                    </p>
                    <p style="font-size: 14px; color: #777; text-align: center;">
                        Need help? <a href="mailto:support@cartveg.com" style="color: #3498db; text-decoration: none;">Contact Support</a>
                    </p>
                </div>
            `,
        });
        console.log("Admin login alert email sent successfully.");
    }
    catch (err) {
        console.error("Error sending email:", err);
        throw new Error("Failed to send email");
    }
});
exports.sendAdminLoginAlert = sendAdminLoginAlert;
const sendMail = (email, otp) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield transporter.sendMail({
            from: `"CartVeg" <${process.env.APP_EMAIL}>`,
            to: email,
            subject: "🔐 Your CartVeg Verification Code",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
                    <h2 style="color: #2c3e50; text-align: center;">🛒 Welcome to CartVeg!</h2>
                    <p style="font-size: 16px; color: #555; text-align: center;">
                        Thank you for signing up! Use the OTP below to verify your email address.
                    </p>
                    <div style="text-align: center; margin: 20px 0;">
                        <span style="font-size: 22px; font-weight: bold; color: #e74c3c; background: #fff; padding: 10px 20px; border-radius: 5px; border: 2px dashed #e74c3c;">
                            ${otp}
                        </span>
                    </div>
                    <p style="text-align: center; color: #555;">
                        This OTP is valid for 10 minutes. Please do not share it with anyone.
                    </p>
                    <hr style="border: 0; height: 1px; background: #ddd; margin: 20px 0;">
                    <p style="font-size: 14px; color: #777; text-align: center;">
                        If you did not request this OTP, please ignore this email.
                    </p>
                    <p style="font-size: 14px; color: #777; text-align: center;">
                        Need help? <a href="mailto:support@cartveg.com" style="color: #3498db; text-decoration: none;">Contact Support</a>
                    </p>
                </div>
            `,
        });
        console.log("Email sent successfully");
    }
    catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Failed to send email");
    }
});
exports.sendMail = sendMail;
const sendOrderCreatedMail = (order) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Validate order input
        if (!order || !order.orderId || !order.items || !order.totalAmount || !order.createdAt || !order.storeId || !order.userId) {
            throw new Error("Complete order details (orderId, items, totalAmount, createdAt, storeId, userId) are required");
        }
        // Validate storeId and userId formats
        if (!mongoose_1.default.Types.ObjectId.isValid(order.storeId) || !mongoose_1.default.Types.ObjectId.isValid(order.userId)) {
            throw new Error("Invalid storeId or userId format");
        }
        // Fetch user email
        const user = yield user_model_1.default.findById(order.userId).select("email");
        if (!user || !user.email) {
            throw new Error("User not found or email not available");
        }
        // Fetch store manager and store admin emails
        const storeManager = yield admin_model_1.Admin.findOne({
            storeId: new mongoose_1.default.Types.ObjectId(order.storeId),
            role: interface_1.AdminRole.StoreManager,
        }).select("email");
        const storeAdmin = yield admin_model_1.Admin.findOne({
            storeId: new mongoose_1.default.Types.ObjectId(order.storeId),
            role: interface_1.AdminRole.StoreAdmin,
        }).select("email");
        // Collect valid emails
        const emails = [user.email];
        if (storeManager && storeManager.email) {
            emails.push(storeManager.email);
        }
        else {
            console.warn(`No active StoreManager found for storeId: ${order.storeId}`);
        }
        if (storeAdmin && storeAdmin.email) {
            emails.push(storeAdmin.email);
        }
        else {
            console.warn(`No active StoreAdmin found for storeId: ${order.storeId}`);
        }
        // Validate email formats
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = emails.filter((email) => !emailRegex.test(email));
        if (invalidEmails.length > 0) {
            throw new Error(`Invalid email addresses: ${invalidEmails.join(", ")}`);
        }
        // Format the order date
        const formattedDate = new Date(order.createdAt).toLocaleString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
        // Generate HTML for order items
        const itemsHtml = order.items
            .map((item) => `
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 10px; font-size: 14px; color: #555;">${item.name}</td>
                        <td style="padding: 10px; font-size: 14px; color: #555; text-align: center;">${item.quantity}</td>
                        <td style="padding: 10px; font-size: 14px; color: #555; text-align: right;">₹${item.price.toFixed(2)}</td>
                        <td style="padding: 10px; font-size: 14px; color: #555; text-align: right;">₹${(item.quantity * item.price).toFixed(2)}</td>
                    </tr>
                `)
            .join("");
        // Generate HTML for order items
        yield transporter.sendMail({
            from: `"CartVeg" <${process.env.APP_EMAIL}>`,
            to: emails, // Send to all collected emails
            subject: `🛍️ Your CartVeg Order #${order.orderId} Has Been Placed!`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
                    <h2 style="color: #2c3e50; text-align: center;">🛒 Thank You for Your Order!</h2>
                    <p style="font-size: 16px; color: #555; text-align: center;">
                        Your order has been successfully placed with CartVeg. Below are the details of your order.
                    </p>
                    <div style="text-align: center; margin: 20px 0;">
                        <span style="font-size: 18px; font-weight: bold; color: #e74c3c; background: #fff; padding: 10px 15px; border-radius: 5px; border: 2px dashed #e74c3c;">
                            Order #${order.orderId}
                        </span>
                    </div>
                    <p style="text-align: center; font-size: 14px; color: #555;">
                        Placed on: <strong>${formattedDate}</strong>
                    </p>
                    <h3 style="color: #2c3e50; margin: 20px 0 10px;">Order Summary</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #e74c3c; color: #fff;">
                                <th style="padding: 10px; font-size: 14px;">Item</th>
                                <th style="padding: 10px; font-size: 14px;">Qty</th>
                                <th style="padding: 10px; font-size: 14px;">Price</th>
                                <th style="padding: 10px; font-size: 14px;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                    <p style="text-align: right; font-size: 16px; color: #2c3e50; margin: 20px 0;">
                        <strong>Total: ₹${order.totalAmount.toFixed(2)}</strong>
                    </p>
                    <hr style="border: 0; height: 1px; background: #ddd; margin: 20px 0;">
                    <p style="font-size: 14px; color: #777; text-align: center;">
                        You can track your order or manage it in your CartVeg account.
                    </p>
                    <p style="font-size: 14px; color: #777; text-align: center;">
                        Need help? <a href="mailto:support@cartveg.com" style="color: #3498db; text-decoration: none;">Contact Support</a>
                    </p>
                </div>
            `,
        });
        console.log(`Order confirmation email sent successfully for order #${order.orderId} to ${emails.join(", ")}`);
    }
    catch (error) {
        console.error(`Error sending order confirmation email for order #${order.orderId}:`, error);
        throw new Error("Failed to send order confirmation email");
    }
});
exports.sendOrderCreatedMail = sendOrderCreatedMail;
exports.default = exports.sendMail;
