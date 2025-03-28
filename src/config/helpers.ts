import jwt from "jsonwebtoken";

export const generateAdminToken = (
    role:string , email: string, 
) => {
    return jwt.sign({ email, role }, process.env.JWT_SECRET as string, { expiresIn: "24h" }); // 2 hours
}
