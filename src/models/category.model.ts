import mongoose from "mongoose";

// Category Schema
const categorySchema = new mongoose.Schema({
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
export const Category = mongoose.model("Category", categorySchema);

export default Category;