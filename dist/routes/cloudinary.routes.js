"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cloudinary_controller_1 = require("../controller/cloudinary.controller");
const express_1 = require("express");
const router = (0, express_1.Router)();
router.post("/upload-image", cloudinary_controller_1.multerUpload, cloudinary_controller_1.uploadImage);
exports.default = router;
