import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use `true` for port 465, `false` for all other ports
    auth: {
        user: process.env.APP_EMAIL as string,
        pass: process.env.APP_PASSWORD as string,
    },
});

const sendMail = async (email: string, otp: string): Promise<void> => {
    try {
        await transporter.sendMail({
            from: '"CartVeg"',
            to: email,
            subject: "Verification OTP",
            text: `This is your one-time password: ${otp}`,
        });
        console.log("Email sent successfully");
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Failed to send email");
    }
};

export default sendMail;