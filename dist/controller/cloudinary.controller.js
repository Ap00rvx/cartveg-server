"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.multerUpload = exports.uploadImage = void 0;
const cloudinary_1 = __importDefault(require("cloudinary"));
const multer_1 = __importDefault(require("multer"));
const cloudname = process.env.CLOUD_NAME;
const apikey = process.env.CLOUD_API_KEY;
const apisecret = process.env.CLOUD_API_SECRET;
cloudinary_1.default.v2.config({
    cloud_name: cloudname,
    api_key: apikey,
    api_secret: apisecret,
});
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage });
const uploadImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            return;
        }
        // Convert buffer to base64 string for Cloudinary upload
        const fileBuffer = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
        const result = yield cloudinary_1.default.v2.uploader.upload(fileBuffer, {
            folder: "uploads/",
            resource_type: "image",
        });
        res.status(200).json({
            message: "Upload successful",
            url: result.secure_url,
        });
        return;
    }
    catch (error) {
        res.status(500).json({ error: "Upload failed", details: error });
        return;
    }
});
exports.uploadImage = uploadImage;
// Multer Middleware
exports.multerUpload = upload.single("image");
