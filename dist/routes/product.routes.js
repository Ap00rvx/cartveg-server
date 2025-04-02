"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_controller_1 = require("../controller/product.controller");
const router = (0, express_1.Router)();
router.get("/", product_controller_1.getProducts);
router.get("/list", product_controller_1.getSearchProductList); // 
router.get("/search", product_controller_1.searchProducts);
router.get("/ids", product_controller_1.getAvailableProductIds);
exports.default = router;
