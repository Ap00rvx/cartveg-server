"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const storeManager_middleware_1 = require("../middleware/storeManager.middleware");
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const inventory_controller_1 = require("../controller/inventory.controller");
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["text/csv", "application/vnd.ms-excel", "application/csv"];
        cb(null, true);
    },
    limits: {
        fileSize: 10 * 1024 * 1024, // Limit to 10MB
    },
});
const router = (0, express_1.Router)();
// Route to get all products in the inventory
router.get("/", storeManager_middleware_1.verifyStoreManager, inventory_controller_1.getInventoryProducts);
// Route to add products to inventory
router.post("/add", storeManager_middleware_1.verifyStoreManager, inventory_controller_1.addProductToInventory);
// Route to upload inventory CSV
router.post("/upload", storeManager_middleware_1.verifyStoreManager, upload.single("file"), inventory_controller_1.uploadInventoryCsv);
// Route to update stock for a specific product
router.put("/update", storeManager_middleware_1.verifyStoreManager, inventory_controller_1.updateStock);
router.get("/download", inventory_controller_1.downloadProductsCsv); // Route to download products as CSV
router.get("/product/", storeManager_middleware_1.verifyStoreManager, inventory_controller_1.getAllProducts); // Route to get all products in the inventory
router.get("/product/:id", storeManager_middleware_1.verifyStoreManager, inventory_controller_1.getProductById); // Route to get a product by ID
// Route to update product availability
router.get("/order", storeManager_middleware_1.verifyStoreManager, inventory_controller_1.getStoreOrder); // Route to get store orders
router.put("/order/update", storeManager_middleware_1.verifyStoreManager, inventory_controller_1.changeOrderStatus); // Route to change order status
exports.default = router;
