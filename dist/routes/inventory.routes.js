"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storeManager_middleware_1 = require("../middleware/storeManager.middleware");
const express_1 = require("express");
const inventory_controller_1 = require("../controller/inventory.controller");
const router = (0, express_1.Router)();
// Route to get all products in the inventory
router.get("/", storeManager_middleware_1.verifyStoreManager, inventory_controller_1.getInventoryProducts);
// Route to add products to inventory
router.post("/add", storeManager_middleware_1.verifyStoreManager, inventory_controller_1.addProductToInventory);
// Route to update stock for a specific product
router.put("/update", storeManager_middleware_1.verifyStoreManager, inventory_controller_1.updateStock);
router.get("/product/", storeManager_middleware_1.verifyStoreManager, inventory_controller_1.getAllProducts); // Route to get all products in the inventory
// Route to get a product by ID
router.get("/product/:id", storeManager_middleware_1.verifyStoreManager, inventory_controller_1.getProductById); // Route to get a product by ID
// Route to update product availability
exports.default = router;
