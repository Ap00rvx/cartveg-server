"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_controller_1 = require("../controller/admin.controller");
const express_1 = require("express");
const admin_middleware_1 = require("../middleware/admin.middleware");
const storeadmin_middleware_1 = require("../middleware/storeadmin.middleware");
const router = (0, express_1.Router)();
router.put("/user/update", admin_middleware_1.adminMiddleware, admin_controller_1.updateUserDetails);
router.delete("/deleteProducts", admin_middleware_1.adminMiddleware, admin_controller_1.deleteMultipleProducts);
router.post("/createProducts", admin_middleware_1.adminMiddleware, admin_controller_1.createMultipleProducts);
router.post("/user/create", admin_middleware_1.adminMiddleware, admin_controller_1.createUser);
router.post("/send-notification", storeadmin_middleware_1.verifyStoreAdmin, admin_controller_1.sendNotification);
router.get("/analysis", admin_middleware_1.adminMiddleware, admin_controller_1.getSuperAdminAnalysis);
router.post("/create-admin", admin_middleware_1.adminMiddleware, admin_controller_1.createAdmin);
router.post("/create-store", admin_middleware_1.adminMiddleware, admin_controller_1.createStore);
router.post("/assign-store-manager", admin_middleware_1.adminMiddleware, admin_controller_1.assignStoreManager);
router.put("/update-store", admin_middleware_1.adminMiddleware, admin_controller_1.updateStoreDetails);
router.post("/app/create", admin_middleware_1.adminMiddleware, admin_controller_1.createAppDetails);
router.put("/app/update", admin_middleware_1.adminMiddleware, admin_controller_1.updateAppDetails);
router.post("/login", admin_controller_1.adminLogin);
router.get("/admins", admin_middleware_1.adminMiddleware, admin_controller_1.getAllAdmins);
router.put("/admin/update", admin_middleware_1.adminMiddleware, admin_controller_1.updateAdmin); // Route to update a category
router.get("/products", admin_middleware_1.adminMiddleware, admin_controller_1.getAllProducts);
router.get("/p/", admin_middleware_1.adminMiddleware, admin_controller_1.getProductById);
router.get("/products/search", admin_controller_1.searchProducts);
router.get("/users", admin_middleware_1.adminMiddleware, admin_controller_1.getAllUsers);
router.get("/orders", admin_middleware_1.adminMiddleware, admin_controller_1.getAllOrders);
router.put("/update/order", admin_middleware_1.adminMiddleware, admin_controller_1.changeOrderStatus);
router.get("/stores", admin_middleware_1.adminMiddleware, admin_controller_1.getAllStores);
router.delete("/user/delete", admin_middleware_1.adminMiddleware, admin_controller_1.deleteUser);
router.post("/coupon/create", admin_middleware_1.adminMiddleware, admin_controller_1.createCouponCode);
router.get("/coupon", admin_middleware_1.adminMiddleware, admin_controller_1.getAllCoupons);
router.put("/coupon/update", admin_middleware_1.adminMiddleware, admin_controller_1.updateCouponDetails);
router.put("/coupon/status", admin_middleware_1.adminMiddleware, admin_controller_1.changeCouponStatus);
router.post("/cashback/create", admin_middleware_1.adminMiddleware, admin_controller_1.createCashback);
router.get("/cashback", admin_middleware_1.adminMiddleware, admin_controller_1.getAllCashback);
router.put("/cashback/status", admin_middleware_1.adminMiddleware, admin_controller_1.changeCashbackActiveStatus);
router.get("/orders/id", admin_controller_1.getOrderByOrderId);
router.post("/wallet/add", admin_middleware_1.adminMiddleware, admin_controller_1.manualWalletCredit);
exports.default = router;
/// route 
