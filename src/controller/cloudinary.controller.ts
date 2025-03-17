import cloudinary from 'cloudinary';
import { Request, Response } from 'express';
import multer from 'multer';

const cloudname:string= process.env.CLOUD_NAME as string;
const apikey:string  = process.env.CLOUD_API_KEY as string;
const apisecret:string = process.env.CLOUD_API_SECRET as string;

cloudinary.v2.config({
    cloud_name: cloudname,
    api_key: apikey,
    api_secret: apisecret,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

export const uploadImage = async (req: Request, res: Response) => {
    try {
      // Validate Secret Token
      const token = req.headers["access_token"];
      console.log(token);
      if (!token || token !== process.env.ACCESS_TOKEN) {
         res.status(403).json({ error: "Unauthorized: Invalid token" });
         return;
      }
  
      // Check if file is uploaded
      if (!req.file) {
         res.status(400).json({ error: "No file uploaded" });
         return ; 
      }
  
      // Convert buffer to base64 string for Cloudinary upload
      const fileBuffer = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  
      
      const result = await cloudinary.v2.uploader.upload(fileBuffer, {
        folder: "uploads/",
        resource_type: "image",
      });
  
       res.status(200).json({
        message: "Upload successful",
        url: result.secure_url,
      });
      return; 
  
    } catch (error) {
       res.status(500).json({ error: "Upload failed", details: error });
       return 
    }
  };
  
  // Multer Middleware
  export const multerUpload = upload.single("image");


  