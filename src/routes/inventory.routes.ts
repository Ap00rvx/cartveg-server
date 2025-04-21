import { verifyStoreManager } from "../middleware/storeManager.middleware";
import { Router } from "express";

import { addProductToInventory, updateStock,getInventoryProducts,getAllProducts,getProductById,downloadProductsCsv} from "../controller/inventory.controller";

const router = Router();

// Route to get all products in the inventory

router.get("/", verifyStoreManager, getInventoryProducts);

// Route to add products to inventory
router.post("/add", verifyStoreManager, addProductToInventory);

// Route to update stock for a specific product
router.put("/update", verifyStoreManager, updateStock);
router.get("/download", downloadProductsCsv); // Route to download products as CSV
router.get("/product/", verifyStoreManager, getAllProducts); // Route to get all products in the inventory
// Route to get a product by ID
router.get("/product/:id", verifyStoreManager, getProductById); // Route to get a product by ID
// Route to update product availability

export default router;