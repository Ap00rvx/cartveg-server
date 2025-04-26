import {authenticate,getUserDetails,verifyOtp,saveUserDetails,saveFCMToken,resendOtp,getActiveCashbacks,addAddress,removeAddress} from "../controller/user.controller";
import { authenticateUser } from "../middleware/user.middleware";
import { Router } from "express";

const router = Router();

router.post("/authenticate",authenticate);
router.post("/verify-otp",verifyOtp);
router.post("/save",authenticateUser,saveUserDetails);
router.post("/add-address",authenticateUser,addAddress);
router.delete("/remove-address",authenticateUser,addAddress);
router.get("/",authenticateUser,getUserDetails);
router.get("/cashbacks",getActiveCashbacks); 
router.post("/save-fcm-token",authenticateUser,saveFCMToken);

router.post("/resend-otp",resendOtp);

export default router;