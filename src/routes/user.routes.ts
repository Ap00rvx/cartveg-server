import {authenticate,getUserDetails,verifyOtp,saveUserDetails,saveFCMToken} from "../controller/user.controller";
import { authenticateUser } from "../middleware/user.middleware";
import { Router } from "express";

const router = Router();

router.post("/authenticate",authenticate);
router.post("/verify-otp",verifyOtp);
router.post("/save",authenticateUser,saveUserDetails);
router.post("/",authenticateUser,getUserDetails);
router.post("/save-fcm-token",authenticateUser,saveFCMToken);

export default router;