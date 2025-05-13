"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponType = exports.PaymentStatus = exports.OrderStatus = exports.AdminRole = void 0;
var AdminRole;
(function (AdminRole) {
    AdminRole["SuperAdmin"] = "superadmin";
    AdminRole["StoreManager"] = "storemanager";
    AdminRole["StoreAdmin"] = "storeadmin";
})(AdminRole || (exports.AdminRole = AdminRole = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["Placed"] = "placed";
    OrderStatus["Shipped"] = "shipped";
    OrderStatus["Delivered"] = "delivered";
    OrderStatus["Cancelled"] = "cancelled";
    OrderStatus["Confirmed"] = "confirmed";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["Pending"] = "pending";
    PaymentStatus["Paid"] = "paid";
    PaymentStatus["Failed"] = "failed";
    PaymentStatus["Refund"] = "refund";
    PaymentStatus["Cancelled"] = "cancelled";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var CouponType;
(function (CouponType) {
    CouponType["MaxUsage"] = "MaxUsage";
    CouponType["MinOrders"] = "MinOrders";
})(CouponType || (exports.CouponType = CouponType = {}));
