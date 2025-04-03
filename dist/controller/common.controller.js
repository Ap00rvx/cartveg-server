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
exports.getInvoice = exports.getProductCategories = void 0;
const product_model_1 = __importDefault(require("../models/product.model"));
const invoice_model_1 = __importDefault(require("../models/invoice.model"));
const getProductCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get all products first
        const products = yield product_model_1.default.find({}, { category: 1, _id: 0 });
        if (products.length === 0) {
            res.status(404).json({
                message: "No products found",
                statusCode: 404,
                error: "Not Found"
            });
            return;
        }
        // Extract and normalize categories (convert to lowercase for comparison)
        const categoriesMap = new Map();
        products.forEach(product => {
            if (product.category) {
                // Store with original case but use lowercase as key for uniqueness
                const lowerCaseCategory = product.category.toLowerCase();
                // Keep the first occurrence of each category (with its original capitalization)
                if (!categoriesMap.has(lowerCaseCategory)) {
                    categoriesMap.set(lowerCaseCategory, product.category);
                }
            }
        });
        // Convert map values to array (these are the distinct categories with original casing)
        const categories = Array.from(categoriesMap.values());
        if (categories.length === 0) {
            res.status(404).json({
                message: "No categories found",
                statusCode: 404,
                error: "Not Found"
            });
            return;
        }
        // Sort categories alphabetically (optional)
        categories.sort();
        res.status(200).json({
            message: "Categories retrieved successfully",
            statusCode: 200,
            categories
        });
    }
    catch (error) {
        const errorResponse = {
            statusCode: 500,
            message: "Internal server error",
            stack: error.stack
        };
        res.status(500).json(errorResponse);
        return;
    }
});
exports.getProductCategories = getProductCategories;
const getInvoice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const invoiceId = req.query.invoiceId;
    if (!invoiceId) {
        res.status(400).json({ message: "Missing invoiceId" });
        return;
    }
    try {
        const invoice = yield invoice_model_1.default.findOne({ invoiceId });
        if (!invoice) {
            res.status(404).json({ message: "Invoice not found" });
            return;
        }
        res.status(200).json({ invoice });
    }
    catch (err) {
        const errorResponse = {
            statusCode: 500,
            message: "Internal server error",
            stack: err.stack
        };
        res.status(500).json(errorResponse);
        return;
    }
});
exports.getInvoice = getInvoice;
