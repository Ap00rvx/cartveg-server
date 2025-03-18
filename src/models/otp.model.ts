import mongoose, { Document, Schema, Model } from "mongoose";

// Define TypeScript interface for OTP
export interface IOtp extends Document {
    email: string;
    otp: string;
    otpExpiry: Date;
}

// Mongoose Schema
const OtpSchema: Schema = new Schema<IOtp>({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    otpExpiry: { type: Date, required: true, expires: 600 }, // Auto-delete after 10 minutes
});

// Create Mongoose Model
const Otp: Model<IOtp> = mongoose.model<IOtp>("Otp", OtpSchema);

export default Otp;
