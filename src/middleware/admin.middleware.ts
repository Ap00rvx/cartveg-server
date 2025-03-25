import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "../models/user.model";

interface DecodedToken extends JwtPayload {
  role?: string;
  email ? : string;
}

export const adminMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bearerToken = req.headers.authorization;

    if (!bearerToken) {
      res.status(401).json({ msg: "Unauthorized: No token provided" });
      return;
    }

    const token = bearerToken.split(" ")[1];

    if (!token) {
      res.status(401).json({ msg: "Unauthorized: Invalid token format" });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;

    const user = await User.findOne({ email: decoded.email });

    if (!user || user.role !== "admin") {
      res.status(401).json({ msg: "Unauthorized: Admin access required" });
      return;}
      

    next();
  } catch (error:any ) {
    res.status(500).json({
      message: "Internal server error while verifying token",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
