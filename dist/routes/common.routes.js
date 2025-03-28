"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_controller_1 = require("../controller/common.controller");
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get("/categories", common_controller_1.getProductCategories);
router.get("/invoice", common_controller_1.getInvoice);
exports.default = router;
