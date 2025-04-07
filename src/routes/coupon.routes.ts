
import { Router } from "express";
import { getActiveCoupons,applyCoupon,removeCoupon} from "../controller/coupon.controller";

const router = Router();

router.get("/", getActiveCoupons);
router.post("/apply", applyCoupon);
router.post("/remove", removeCoupon);


export default router;



