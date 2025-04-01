import { Router } from "express";

import { addToCart, getUserCart, removefromcart} from "../controller/cart.controller";
import { authenticateUser } from "../middleware/user.middleware";
const router = Router();

router.get("/", authenticateUser, getUserCart);
router.post("/add", authenticateUser, addToCart);
router.delete("/remove", authenticateUser, removefromcart);

export default router;
