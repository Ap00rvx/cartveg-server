import { verifyStoreManager } from "../middleware/storeManager.middleware";
import { Router } from "express";
import multer from "multer";
import { addProductToInventory, updateStock,getInventoryProducts,getAllProducts,getProductById,downloadProductsCsv,uploadInventoryCsv,getStoreOrder,changeOrderStatus} from "../controller/inventory.controller";
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
      const allowedTypes = ["text/csv", "application/vnd.ms-excel", "application/csv"];
      
      cb(null, true);
    },
    limits: {

      fileSize: 10 * 1024 * 1024, // Limit to 10MB
    },
  });
const router = Router();

// Route to get all products in the inventory

router.get("/", verifyStoreManager, getInventoryProducts);

// Route to add products to inventory
router.post("/add", verifyStoreManager, addProductToInventory);
// Route to upload inventory CSV
router.post("/upload", verifyStoreManager, upload.single("file"), uploadInventoryCsv);

// Route to update stock for a specific product
router.put("/update", verifyStoreManager, updateStock);
router.get("/download", downloadProductsCsv); // Route to download products as CSV
router.get("/product/", verifyStoreManager, getAllProducts); // Route to get all products in the inventory
router.get("/product/:id", verifyStoreManager, getProductById); // Route to get a product by ID
// Route to update product availability

router.get("/order", verifyStoreManager, getStoreOrder); // Route to get store orders

router.put("/order/update", verifyStoreManager, changeOrderStatus); // Route to change order status
export default router;