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
exports.saveUserDetails = exports.verifyOtp = exports.authenticate = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const otp_model_1 = __importDefault(require("../models/otp.model"));
const nodemailer_1 = __importDefault(require("../config/nodemailer"));
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
dotenv_1.default.config();
const authenticate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const email = req.body["user_email"];
    if (!email) {
        res.status(400).json({ msg: "Email is required" });
        return;
    }
    try {
        let user = yield user_model_1.default.findOne({ email });
        const otp = crypto_1.default.randomInt(100000, 999999).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes
        if (!user) {
            user = new user_model_1.default({ email });
            yield user.save();
        }
        yield otp_model_1.default.deleteMany({ email }); // Remove previous OTPs
        yield otp_model_1.default.create({ email, otp, otpExpiry });
        yield (0, nodemailer_1.default)(email, otp);
        res.status(200).json({ msg: "OTP sent successfully" });
    }
    catch (err) {
        console.error("Error authenticating user:", err);
        const response = {
            message: err.message,
            statusCode: 500,
            stack: err.stack,
        };
        res.status(500).json(response);
    }
});
exports.authenticate = authenticate;
const verifyOtp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, otp } = req.body;
    if (!email || !otp) {
        res.status(400).json({ msg: "Email and OTP are required" });
        return;
    }
    try {
        const otpRecord = yield otp_model_1.default.findOne({ email, otp });
        if (!otpRecord) {
            res.status(400).json({ msg: "Invalid OTP" });
            return;
        }
        if (new Date() > otpRecord.otpExpiry) {
            yield otp_model_1.default.deleteOne({ email, otp });
            res.status(400).json({ msg: "OTP expired" });
            return;
        }
        yield otp_model_1.default.deleteOne({ email, otp }); // Remove OTP after successful verification
        const token = jsonwebtoken_1.default.sign({ email }, process.env.JWT_SECRET, { expiresIn: "100d" });
        const user = yield user_model_1.default.findOne({ email });
        if (!user) {
            res.status(400).json({ msg: "User not found" });
            return;
        }
        user.isActivate = true;
        yield user.save();
        const successResponse = {
            message: "OTP verified successfully",
            statusCode: 200,
            data: {
                user,
                token
            },
        };
        res.status(200).json(successResponse);
    }
    catch (err) {
        console.error("Error verifying OTP:", err);
        const response = {
            message: err.message,
            statusCode: 500,
            stack: err.stack,
        };
        res.status(500).json(response);
    }
});
exports.verifyOtp = verifyOtp;
const saveUserDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { email, name, phone } = req.body;
    if (!email || !name || !phone) {
        res.status(400).json({ msg: "Email, name, and phone are required" });
        return;
    }
    const tokenEmail = (_a = req.user) === null || _a === void 0 ? void 0 : _a.email;
    if (email !== tokenEmail) {
        res.status(401).json({ msg: "Unauthorized: Email does not match" });
        return;
    }
    try {
        const user = yield user_model_1.default.findOne({ email });
        if (!user) {
            res.status(400).json({ msg: "User not found" });
            return;
        }
        user.name = name;
        user.phone = phone;
        yield user.save();
        const successResponse = {
            message: "User details saved successfully",
            statusCode: 200,
            data: user
        };
        res.status(200).json(successResponse);
    }
    catch (err) {
        console.error("Error saving user details:", err);
        const response = {
            message: err.message,
            statusCode: 500,
            stack: err.stack,
        };
        res.status(500).json(response);
    }
});
exports.saveUserDetails = saveUserDetails;
