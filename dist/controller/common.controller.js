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
exports.getProductCategories = void 0;
const product_model_1 = __importDefault(require("../models/product.model"));
const getProductCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = yield product_model_1.default.distinct("category");
        if (categories.length === 0) {
            res.status(400).json({ message: "No categories found" });
            return;
        }
        res.status(200).json({ categories });
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
