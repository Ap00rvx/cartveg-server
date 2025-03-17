import {uploadImage,multerUpload} from '../controller/cloudinary.controller'

import { Router } from "express";

const router = Router();

router.post("/upload-image",multerUpload,uploadImage);

export default router;