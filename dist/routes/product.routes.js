"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_controller_1 = require("../controller/product.controller");
const router = (0, express_1.Router)();
router.get("/", product_controller_1.getProductsByLocation);
router.get("/store", product_controller_1.getStoreDetailsWithLatlong); //
router.get("/list", product_controller_1.getAllProductsWithAvailability); // 
router.get("/category", product_controller_1.getAvailableProductsWithCategory); //
// router.get("/search", searchProducts);
// router.get("/ids",getAvailableProductIds);
exports.default = router;
