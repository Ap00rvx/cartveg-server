import {authenticate,verifyOtp,saveUserDetails} from "../controller/user.controller";
import { authenticateUser } from "../middleware/user.middleware";
import { Router } from "express";

const router = Router();

router.post("/authenticate",authenticate);
router.post("/verify-otp",verifyOtp);
router.post("/save",authenticateUser,saveUserDetails);

export default router;