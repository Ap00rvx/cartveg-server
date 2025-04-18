"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentStatus = exports.OrderStatus = exports.AdminRole = void 0;
var AdminRole;
(function (AdminRole) {
    AdminRole["SuperAdmin"] = "superadmin";
    AdminRole["StoreManager"] = "storemanager";
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
