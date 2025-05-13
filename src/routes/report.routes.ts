import { Router } from "express";
import reportController from "../controller/report.controller";
import { verifyStoreAdmin } from "../middleware/storeadmin.middleware";
import multer from "multer";
const router = Router();
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
router.get("/store-report", verifyStoreAdmin,reportController.getStoreReport); 
router.post("/upload-purchase-report",verifyStoreAdmin,upload.single("file"),reportController.uploadPurchaseDoc); 
router.get("/get-purchase-report",verifyStoreAdmin,reportController.getPurchaseReport);
router.get("/download-template",reportController.downloadPurchaseTemplate);


export default router;
