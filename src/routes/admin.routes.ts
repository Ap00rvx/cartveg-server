import { sendNotification,createAdmin,createStore,getAllOrders,updateUserDetails,createMultipleProducts,deleteMultipleProducts,getProductById,getAllProducts,searchProducts,getAllUsers,deleteUser,getAllStores, updateStoreDetails,createCouponCode, getAllCoupons,updateCouponDetails,changeCouponStatus,createUser, adminLogin, assignStoreManager, createCashback,changeCashbackActiveStatus,getAllCashback,getAllAdmins,updateAdmin,createAppDetails,updateAppDetails,changeOrderStatus,getSuperAdminAnalysis} from "../controller/admin.controller";
import { Router } from "express";
import { adminMiddleware } from "../middleware/admin.middleware";
import uploadBuffer from "../config/csv-buffer";
import { verifyStoreAdmin } from "../middleware/storeadmin.middleware";

const router = Router();


router.put("/user/update",adminMiddleware,updateUserDetails); 

router.delete("/deleteProducts", adminMiddleware,deleteMultipleProducts);
router.post("/createProducts", adminMiddleware,createMultipleProducts);

router.post("/user/create",adminMiddleware,createUser);
router.post("/send-notification", verifyStoreAdmin,sendNotification);
router.get("/analysis", adminMiddleware,getSuperAdminAnalysis);

router.post("/create-admin",adminMiddleware,createAdmin); 
router.post("/create-store",adminMiddleware,createStore)
router.post("/assign-store-manager",adminMiddleware,assignStoreManager); 
router.put("/update-store",adminMiddleware,updateStoreDetails);

router.post("/app/create",adminMiddleware,createAppDetails);
router.put("/app/update",adminMiddleware,updateAppDetails);

router.post("/login",adminLogin);
router.get("/admins", adminMiddleware,getAllAdmins);
router.put("/admin/update", adminMiddleware,updateAdmin); // Route to update a category

router.get("/products", adminMiddleware,getAllProducts);
router.get("/p/", adminMiddleware,getProductById);
router.get("/search", adminMiddleware,searchProducts);
router.get("/users", adminMiddleware,getAllUsers);
router.get("/orders", adminMiddleware,getAllOrders);
router.put("/update/order", adminMiddleware,changeOrderStatus);


router.get("/stores", adminMiddleware,getAllStores);
router.delete("/user/delete",adminMiddleware,deleteUser);


router.post("/coupon/create", adminMiddleware,createCouponCode);
router.get("/coupon", adminMiddleware,getAllCoupons);
router.put("/coupon/update", adminMiddleware,updateCouponDetails);
router.put("/coupon/status", adminMiddleware,changeCouponStatus);

router.post("/cashback/create", adminMiddleware,createCashback);
router.get("/cashback", adminMiddleware,getAllCashback);
router.put("/cashback/status", adminMiddleware,changeCashbackActiveStatus);

export default router;


/// route 