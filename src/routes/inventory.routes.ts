import { verifyStoreManager } from "../middleware/storeManager.middleware";
import { Router } from "express";

import { addProductToInventory, updateStock,updateProductAvailability,updateProductThreshold} from "../controller/inventory.controller";

const router = Router();

// Route to add products to inventory
router.post("/add", verifyStoreManager, addProductToInventory);

// Route to update stock for a specific product
router.put("/update", verifyStoreManager, updateStock);

// Route to update product availability

router.put("/availability", verifyStoreManager, updateProductAvailability);

// Route to update product threshold

router.put("/threshold", verifyStoreManager, updateProductThreshold);


export default router;