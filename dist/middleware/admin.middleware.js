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
exports.adminMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = __importDefault(require("../models/user.model"));
const adminMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const bearerToken = req.headers.authorization;
        if (!bearerToken) {
            res.status(401).json({ msg: "Unauthorized: No token provided" });
            return;
        }
        const token = bearerToken.split(" ")[1];
        if (!token) {
            res.status(401).json({ msg: "Unauthorized: Invalid token format" });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = yield user_model_1.default.findOne({ email: decoded.email });
        if (!user || user.role !== "admin") {
            res.status(401).json({ msg: "Unauthorized: Admin access required" });
            return;
        }
        next();
    }
    catch (error) {
        res.status(500).json({
            message: "Internal server error while verifying token",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
});
exports.adminMiddleware = adminMiddleware;
