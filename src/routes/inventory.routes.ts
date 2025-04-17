import { verifyStoreManager } from "../middleware/storeManager.middleware";
import { Router } from "express";

import { addProductToInventory, updateStock,getInventoryProducts} from "../controller/inventory.controller";

const router = Router();

// Route to get all products in the inventory

router.get("/", verifyStoreManager, getInventoryProducts);

// Route to add products to inventory
router.post("/add", verifyStoreManager, addProductToInventory);

// Route to update stock for a specific product
router.put("/update", verifyStoreManager, updateStock);

// Route to update product availability




export default router;