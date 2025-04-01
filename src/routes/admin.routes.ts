import { updateProductAvailability,updateProductThreshold,sendNotification,getAllOrders,updateProductDetails,uploadCSV,updateUserDetails,updateProductStock,createAdminUser,adminLogin,createMultipleProducts,deleteMultipleProducts,getProductById,exportProductCSV,getAllProducts,searchProducts,getAllUsers,deleteUser,createUser,updateOrderStatus} from "../controller/admin.controller";
import { Router } from "express";
import { adminMiddleware } from "../middleware/admin.middleware";
import uploadBuffer from "../config/csv-buffer";

const router = Router();

router.put("/updateProductStock", adminMiddleware,updateProductStock);
router.put("/updateProductDetails",adminMiddleware, updateProductDetails);
router.put("/updateProductThreshold", adminMiddleware,updateProductThreshold);
router.put("/updateProductAvailability", adminMiddleware,updateProductAvailability);
router.put("/user/update",adminMiddleware,updateUserDetails); 


router.post("/createAdminUser", adminMiddleware,createAdminUser);
router.delete("/deleteProducts", adminMiddleware,deleteMultipleProducts);
router.post("/createProducts", adminMiddleware,createMultipleProducts);
router.post("/upload-csv",uploadBuffer,uploadCSV)
router.get("/product-csv",exportProductCSV);
router.post("/user/create",adminMiddleware,createUser);
router.post("/send-notification", adminMiddleware,sendNotification);
router.post("/update/order", adminMiddleware,updateOrderStatus);
router.post("/login", adminLogin);

router.get("/products", adminMiddleware,getAllProducts);
router.get("/p/", adminMiddleware,getProductById);
router.get("/search", adminMiddleware,searchProducts);
router.get("/users", adminMiddleware,getAllUsers);
router.get("/orders", adminMiddleware,getAllOrders);
router.delete("/user/delete",adminMiddleware,deleteUser);



export default router;