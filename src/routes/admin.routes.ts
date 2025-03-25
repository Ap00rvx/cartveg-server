import { updateProductAvailability,updateProductDetails,updateProductStock,createAdminUser,adminLogin,createMultipleProducts,getAllProducts} from "../controller/admin.controller";
import { Router } from "express";
import { adminMiddleware } from "../middleware/admin.middleware";
const router = Router();

router.put("/updateProductStock", adminMiddleware,updateProductStock);
router.put("/updateProductDetails",adminMiddleware, updateProductDetails);
router.put("/updateProductAvailability", adminMiddleware,updateProductAvailability);


router.post("/createAdminUser", adminMiddleware,createAdminUser);
router.post("/createProducts", adminMiddleware,createMultipleProducts);
router.post("/login", adminLogin);

router.get("/products", adminMiddleware,getAllProducts);



export default router;