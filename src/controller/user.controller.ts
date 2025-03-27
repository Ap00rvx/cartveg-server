import User from "../models/user.model";
import Otp from "../models/otp.model";
import { Request, Response } from 'express';
import sendMail from "../config/nodemailer";
import { InterServerError ,SuccessResponse} from "../types/types/types";
import crypto from "crypto";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";



dotenv.config();

export const authenticate = async (req: Request, res: Response): Promise<void> => {
    const email = req.body["user_email"];
    if (!email ) {
        res.status(400).json({ msg: "Email is required" });
        return;
    }

    try {
        let user = await User.findOne({ email });
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

        if (!user) {


            user = new User({ email });
            await user.save();
        }

        await Otp.deleteMany({ email }); // Remove previous OTPs
        await Otp.create({ email, otp, otpExpiry });

        await sendMail(email, otp);
        res.status(200).json({ msg: "OTP sent successfully" });
    } catch (err: any) {
        console.error("Error authenticating user:", err);
        const response: InterServerError = {
            message: err.message,
            statusCode: 500,
            stack: err.stack,
        };
        res.status(500).json(response);
    }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
    const { email, otp } = req.body;
    if (!email || !otp) {
        res.status(400).json({ msg: "Email and OTP are required" });
        return;
    }

    try {
        const otpRecord = await Otp.findOne({ email, otp });

        if (!otpRecord) {
            res.status(400).json({ msg: "Invalid OTP" });
            return;
        }

        if (new Date() > otpRecord.otpExpiry) {
            await Otp.deleteOne({ email, otp });
            res.status(400).json({ msg: "OTP expired" });
            return;
        }

        await Otp.deleteOne({ email, otp }); // Remove OTP after successful verification

        const token = jwt.sign({ email }, process.env.JWT_SECRET as string, { expiresIn: "100d" });

        
       
        const user = await User.findOne({ email });
        if (!user) {
            res.status(400).json({ msg: "User not found" });
            return;
        }

        user.isActivate= true;
        await user.save();
        const successResponse:SuccessResponse = {
            message : "OTP verified successfully",
            statusCode : 200,
            data : {
                user,
                token
            },
             
        }
        res.status(200).json(  successResponse);
    } catch (err: any) {
        console.error("Error verifying OTP:", err);
        const response: InterServerError = {
            message: err.message,
            statusCode: 500,
            stack: err.stack,
        };
        res.status(500).json(response);
    }
};

export const saveUserDetails = async (req: Request, res: Response): Promise<void> => {
    const { email, name, phone } = req.body;
    if (!email || !name || !phone) {
        res.status(400).json({ msg: "Email, name, and phone are required" });
        return;
    }
    const tokenEmail = (req as any).user?.email; 
    if (email !== tokenEmail) {
        res.status(401).json({ msg: "Unauthorized: Email does not match" });
        return;
    }
    try {
        const user = await User.findOne({ email });
        if (!user) {
            res.status(400).json({ msg: "User not found" });
            return;
        }
        user.name = name; 
        user.phone = phone;

        await user.save();

        const successResponse:SuccessResponse = {
            message : "User details saved successfully",
            statusCode : 200,
            data : user
        }
        res.status(200).json(  successResponse);
    } catch (err: any) {
        console.error("Error saving user details:", err);
        const response: InterServerError = {
            message: err.message,
            statusCode: 500,
            stack: err.stack,
        };
        res.status(500).json(response);

    }}
