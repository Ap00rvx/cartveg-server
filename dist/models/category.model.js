"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Category = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// Category Schema
const categorySchema = new mongoose_1.default.Schema({
    name: {
        type: String,
        required: [true, "Category name is required"],
        trim: true,
        unique: true,
        minlength: [3, "Category name must be at least 3 characters"],
        maxlength: [50, "Category name cannot exceed 50 characters"],
    },
    image: {
        type: String,
        default: "https://res.cloudinary.com/dqgv6uuos/image/upload/v1742729276/uploads/f5krfwxraavhpzyyhzey.png",
        trim: true,
    },
}, {
    timestamps: true,
});
// Create Category Model
exports.Category = mongoose_1.default.model("Category", categorySchema);
exports.default = exports.Category;
