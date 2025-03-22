"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Middleware to verify JWT token from cookies
const authenticateUser = (req, res, next) => {
    var _a;
    try {
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
        if (!token) {
            res.status(401).json({ msg: "Unauthorized: No token provided" });
            return;
        }
        // Verify JWT'
        console.log("Token:", token);
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        console.log("Decoded token:", decoded);
        req.user = decoded; // Attach user data to request
        next(); // Proceed to the next middleware or route
    }
    catch (err) {
        res.status(401).json({ msg: "Unauthorized: Invalid or expired token" });
    }
};
exports.authenticateUser = authenticateUser;
