"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const category_controller_1 = require("../controller/category.controller");
const admin_middleware_1 = require("../middleware/admin.middleware");
const router = (0, express_1.Router)();
// Route to get all categories
router.get("/", category_controller_1.getAllCategories);
// Route to create a new category
router.post("/", admin_middleware_1.adminMiddleware, category_controller_1.createCategory);
router.put("/", admin_middleware_1.adminMiddleware, category_controller_1.updateCategory); // Route to update a category
router.delete("/", admin_middleware_1.adminMiddleware, category_controller_1.deleteCategory); // Route to delete a category
exports.default = router;
