import { Router } from "express";
import orderController from "../controller/order.controller";
import { verifyStoreManager } from "../middleware/storeManager.middleware";
const router = Router();

router.post("/create", orderController.createOrder);
router.post("/cancel",orderController.cancelOrder); 
router.put("/update-status",verifyStoreManager,orderController.updateOrderStatus); 

router.get("/user-orders/:userId",orderController.getUserOrders); 
router.get("/:orderId",orderController.getOrderById); 
// router.get("/userOrders", getUserOrders);
// router.get("/order", getOrderById);


export default router;