"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentStatus = exports.OrderStatus = void 0;
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["Placed"] = "placed";
    OrderStatus["Shipped"] = "shipped";
    OrderStatus["Delivered"] = "delivered";
    OrderStatus["Cancelled"] = "cancelled";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["Pending"] = "pending";
    PaymentStatus["Paid"] = "paid";
    PaymentStatus["Failed"] = "failed";
    PaymentStatus["Refund"] = "refund";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
