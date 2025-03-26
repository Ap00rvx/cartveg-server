import { updateProductAvailability,updateProductThreshold,updateProductDetails,updateUserDetails,updateProductStock,createAdminUser,adminLogin,createMultipleProducts,getAllProducts,searchProducts,getAllUsers,deleteUser} from "../controller/admin.controller";
import { Router } from "express";
import { adminMiddleware } from "../middleware/admin.middleware";
const router = Router();

router.put("/updateProductStock", adminMiddleware,updateProductStock);
router.put("/updateProductDetails",adminMiddleware, updateProductDetails);
router.put("/updateProductThreshold", adminMiddleware,updateProductThreshold);
router.put("/updateProductAvailability", adminMiddleware,updateProductAvailability);
router.put("/user/update",adminMiddleware,updateUserDetails); 


router.post("/createAdminUser", adminMiddleware,createAdminUser);
router.post("/createProducts", adminMiddleware,createMultipleProducts);
router.post("/login", adminLogin);

router.get("/products", adminMiddleware,getAllProducts);
router.get("/search", adminMiddleware,searchProducts);
router.get("/users", adminMiddleware,getAllUsers);

router.delete("/user/delete",adminMiddleware,deleteUser);



export default router;