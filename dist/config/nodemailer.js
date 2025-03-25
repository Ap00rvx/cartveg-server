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
exports.sendAdminLoginAlert = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
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
            from: '"CartVeg" <' + process.env.APP_EMAIL + '>',
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
exports.default = sendMail;
