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
exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getAllCategories = void 0;
const category_model_1 = __importDefault(require("../models/category.model"));
const product_model_1 = __importDefault(require("../models/product.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const getAllCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Fetch categories with pagination
        const categories = yield category_model_1.default.find()
            .select("name image")
            .lean();
        // Get total category count
        const totalCategories = yield category_model_1.default.countDocuments();
        // Return response
        res.status(200).json({
            success: true,
            message: "Categories retrieved successfully",
            categories,
        });
    }
    catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching categories",
            error: error.message,
        });
    }
});
exports.getAllCategories = getAllCategories;
const createCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, image } = req.body;
        // Validate name
        if (!name || typeof name !== "string" || name.trim().length < 3) {
            res.status(400).json({
                success: false,
                message: "Category name is required and must be at least 3 characters",
            });
            return;
        }
        // Validate image (if provided)
        if (image && (typeof image !== "string" || !image.trim())) {
            res.status(400).json({
                success: false,
                message: "Image must be a valid URL string",
            });
            return;
        }
        // Check for duplicate category
        const existingCategory = yield category_model_1.default.findOne({ name: name.trim() });
        if (existingCategory) {
            res.status(409).json({
                success: false,
                message: "Category with this name already exists",
            });
            return;
        }
        // Create new category
        const category = new category_model_1.default({
            name: name.trim(),
            image: (image === null || image === void 0 ? void 0 : image.trim()) || undefined, // Use default if not provided
        });
        yield category.save();
        // Return response
        res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: {
                _id: category._id,
                name: category.name,
                image: category.image,
            },
        });
    }
    catch (error) {
        console.error("Error creating category:", error);
        if (error.code === 11000) { // MongoDB duplicate key error
            res.status(409).json({
                success: false,
                message: "Category with this name already exists",
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Server error while creating category",
            error: error.message,
        });
    }
});
exports.createCategory = createCategory;
//update category 
const updateCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, name, image } = req.body;
        // Validate category ID
        if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid category ID",
            });
            return;
        }
        // Validate name
        if (name && (typeof name !== "string" || name.trim().length < 3)) {
            res.status(400).json({
                success: false,
                message: "Category name must be at least 3 characters",
            });
            return;
        }
        // Validate image (if provided)
        if (image && (typeof image !== "string" || !image.trim())) {
            res.status(400).json({
                success: false,
                message: "Image must be a valid URL string",
            });
            return;
        }
        // Find and update category
        const updatedCategory = yield category_model_1.default.findByIdAndUpdate(id, {
            name: name === null || name === void 0 ? void 0 : name.trim(),
            image: (image === null || image === void 0 ? void 0 : image.trim()) || undefined, // Use default if not provided
        }, { new: true, runValidators: true });
        // Check if category was found and updated
        if (!updatedCategory) {
            res.status(404).json({
                success: false,
                message: "Category not found",
            });
            return;
        }
        // Return response
        res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: updatedCategory,
        });
    }
    catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({
            success: false,
            message: "Server error while updating category",
            error: error.message,
        });
    }
});
exports.updateCategory = updateCategory;
// delete category 
const deleteCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.body;
        // Validate categoryId
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid category ID format",
            });
            return;
        }
        // Find the category
        const category = yield category_model_1.default.findById(id);
        if (!category) {
            res.status(404).json({
                success: false,
                message: "Category not found",
            });
            return;
        }
        // Check if category is used by any products
        const productCount = yield product_model_1.default.countDocuments({ category: { $regex: new RegExp(`^${category.name}$`, "i") } });
        if (productCount > 0) {
            res.status(400).json({
                success: false,
                message: `Cannot delete category. It is used by ${productCount} product(s)`,
            });
            return;
        }
        // Delete the category
        yield category_model_1.default.deleteOne({ _id: id });
        // Return response
        res.status(200).json({
            success: true,
            message: "Category deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({
            success: false,
            message: "Server error while deleting category",
            error: error.message,
        });
    }
});
exports.deleteCategory = deleteCategory;
