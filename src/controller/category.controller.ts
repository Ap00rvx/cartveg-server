import { Request, Response } from "express";
import Category from "../models/category.model";
import Product from "../models/product.model";
import mongoose from "mongoose";
export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
    try {
     
  
  
      
  
      // Fetch categories with pagination
      const categories = await Category.find()
        .select("name image")
        .lean();
  
      // Get total category count
      const totalCategories = await Category.countDocuments();
  
      // Return response
      res.status(200).json({
        success: true,
        message: "Categories retrieved successfully",
        categories,
      });
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching categories",
        error: error.message,
      });
    }
  };

  export const createCategory = async (req: Request, res: Response): Promise<void> => {
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
      const existingCategory = await Category.findOne({ name: name.trim() });
      if (existingCategory) {
        res.status(409).json({
          success: false,
          message: "Category with this name already exists",
        });
        return;
      }
  
      // Create new category
      const category = new Category({
        name: name.trim(),
        image: image?.trim() || undefined, // Use default if not provided
      });
  
      await category.save();
  
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
    } catch (error: any) {
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
  };


  //update category 
    export const updateCategory = async (req: Request, res: Response): Promise<void> => {
        try {
       
        const { id,name, image } = req.body;
    
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
        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            {
            name: name?.trim(),
            image: image?.trim() || undefined, // Use default if not provided
            },
            { new: true, runValidators: true }
        );
    
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
        } catch (error: any) {
        console.error("Error updating category:", error);
        res.status(500).json({
            success: false,
            message: "Server error while updating category",
            error: error.message,
        });
        }
    };

    // delete category 
    export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
        try {
          const { id  } = req.body;
      
          // Validate categoryId
          if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
              success: false,
              message: "Invalid category ID format",
            });
            return;
          }
      
          // Find the category
          const category = await Category.findById(id);
          if (!category) {
            res.status(404).json({
              success: false,
              message: "Category not found",
            });
            return;
          }
      
          // Check if category is used by any products
          const productCount = await Product.countDocuments({ category: { $regex: new RegExp(`^${category.name}$`, "i") } });
          if (productCount > 0) {
            res.status(400).json({
              success: false,
              message: `Cannot delete category. It is used by ${productCount} product(s)`,
            });
            return;
          }
      
          // Delete the category
          await Category.deleteOne({ _id: id });
      
          // Return response
          res.status(200).json({
            success: true,
            message: "Category deleted successfully",
          });
        } catch (error: any) {
          console.error("Error deleting category:", error);
          res.status(500).json({
            success: false,
            message: "Server error while deleting category",
            error: error.message,
          });
        }
      };
