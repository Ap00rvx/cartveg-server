import { sendNotification,createAdmin,createStore,getAllOrders,updateUserDetails,createMultipleProducts,deleteMultipleProducts,getProductById,getAllProducts,searchProducts,getAllUsers,deleteUser, createCouponCode, getAllCoupons,updateCouponDetails,changeCouponStatus,createUser} from "../controller/admin.controller";
import { Router } from "express";
import { adminMiddleware } from "../middleware/admin.middleware";
import uploadBuffer from "../config/csv-buffer";

const router = Router();


router.put("/user/update",adminMiddleware,updateUserDetails); 

router.delete("/deleteProducts", adminMiddleware,deleteMultipleProducts);
router.post("/createProducts", adminMiddleware,createMultipleProducts);

router.post("/user/create",adminMiddleware,createUser);
router.post("/send-notification", adminMiddleware,sendNotification);


router.post("/create-admin",createAdmin); 
router.post("/create-store",adminMiddleware,createStore)

router.get("/products", adminMiddleware,getAllProducts);
router.get("/p/", adminMiddleware,getProductById);
router.get("/search", adminMiddleware,searchProducts);
router.get("/users", adminMiddleware,getAllUsers);
router.get("/orders", adminMiddleware,getAllOrders);
router.delete("/user/delete",adminMiddleware,deleteUser);


router.post("/coupon/create", adminMiddleware,createCouponCode);
router.get("/coupon", adminMiddleware,getAllCoupons);
router.put("/coupon/update", adminMiddleware,updateCouponDetails);
router.put("/coupon/status", adminMiddleware,changeCouponStatus);

export default router;