import { Router } from "express";
import { createCategory, getAllCategories,updateCategory,deleteCategory } from "../controller/category.controller";
import { adminMiddleware } from "../middleware/admin.middleware";


const router = Router();

// Route to get all categories
router.get("/", getAllCategories);

// Route to create a new category
router.post("/", adminMiddleware, createCategory);
router.put("/", adminMiddleware, updateCategory); // Route to update a category
router.delete("/", adminMiddleware, deleteCategory); // Route to delete a category


export default router;

