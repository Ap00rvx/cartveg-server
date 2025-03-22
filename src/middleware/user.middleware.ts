import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

interface AuthRequest extends Request {
    user?: any; // Modify based on your user type
}

// Middleware to verify JWT token from cookies
export const authenticateUser = (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
        const token =  req.headers.authorization?.split(" ")[1];

        if (!token) {
            res.status(401).json({ msg: "Unauthorized: No token provided" });
            return;
        }

        // Verify JWT'
        console.log("Token:", token);
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        console.log("Decoded token:", decoded);
        (req as any).user = decoded; // Attach user data to request

        next(); // Proceed to the next middleware or route
    } catch (err) {
        res.status(401).json({ msg: "Unauthorized: Invalid or expired token" });
    }
};
