"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const report_controller_1 = __importDefault(require("../controller/report.controller"));
const storeadmin_middleware_1 = require("../middleware/storeadmin.middleware");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["text/csv", "application/vnd.ms-excel", "application/csv"];
        cb(null, true);
    },
    limits: {
        fileSize: 10 * 1024 * 1024, // Limit to 10MB
    },
});
router.get("/store-report", storeadmin_middleware_1.verifyStoreAdmin, report_controller_1.default.getStoreReport);
router.post("/upload-purchase-report", storeadmin_middleware_1.verifyStoreAdmin, upload.single("file"), report_controller_1.default.uploadPurchaseDoc);
router.get("/get-purchase-report", storeadmin_middleware_1.verifyStoreAdmin, report_controller_1.default.getPurchaseReport);
router.get("/download-template", report_controller_1.default.downloadPurchaseTemplate);
exports.default = router;
