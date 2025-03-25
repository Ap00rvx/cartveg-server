"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAdminToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const generateAdminToken = (role, email) => {
    return jsonwebtoken_1.default.sign({ email, role }, process.env.JWT_SECRET, { expiresIn: "2h" }); // 2 hours
};
exports.generateAdminToken = generateAdminToken;
