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
exports.cancelOrder = exports.getOrderById = exports.getUserOrders = exports.createOrder = void 0;
const order_model_1 = __importDefault(require("../models/order.model"));
const interface_1 = require("../types/interface/interface");
const mongoose_1 = __importDefault(require("mongoose"));
const product_model_1 = __importDefault(require("../models/product.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const invoice_model_1 = __importDefault(require("../models/invoice.model"));
const createOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, products, isCashOnDelivery, deliveryAddress, phone, shippingAmount, appliedCoupon, // Optional field
         } = req.body;
        // Validate required fields
        if (!userId || !products || !deliveryAddress || !phone || !shippingAmount) {
            const errorResponse = {
                message: "Missing required fields",
                statusCode: 400,
                error: "Bad Request",
            };
            res.status(400).json(errorResponse);
            return;
        }
        if (phone.length !== 10) {
            const errorResponse = {
                message: "Invalid phone number",
                statusCode: 400,
                error: "Bad Request",
            };
            res.status(400).json(errorResponse);
            return;
        }
        // Generate unique orderId
        const orderId = `ORD-${new Date().getTime()}`;
        // Start a transaction session
        const session = yield mongoose_1.default.startSession();
        session.startTransaction();
        let totalAmount = 0;
        let totalItems = 0;
        let discountAmount = 0;
        try {
            // Update product stock and calculate subtotal
            for (const item of products) {
                const product = yield product_model_1.default.findById(item.productId).session(session);
                if (!product)
                    throw new Error(`Product not found: ${item.productId}`);
                if (product.isAvailable === false)
                    throw new Error(`Product is not available: ${product.name}`);
                if (product.stock < item.quantity)
                    throw new Error(`Insufficient stock for ${product.name}`);
                product.stock -= item.quantity;
                totalAmount += product.price * item.quantity;
                totalItems += item.quantity;
                if (product.stock <= product.threshold) {
                    product.isAvailable = false;
                }
                yield product.save({ session });
            }
            // Handle appliedCoupon if provided
            if (appliedCoupon) {
                const { couponId, code, discountAmount: appliedDiscount } = appliedCoupon;
                if (!couponId || !code || appliedDiscount === undefined) {
                    throw new Error("Invalid coupon data: couponId, code, and discountAmount are required if appliedCoupon is provided");
                }
                // Here you might want to validate the coupon (e.g., check if it exists and is valid)
                // For simplicity, assuming it's valid if provided
                discountAmount = appliedDiscount;
                totalAmount -= discountAmount; // Apply discount to total
                if (totalAmount < 0)
                    totalAmount = 0; // Ensure total doesn't go negative
            }
            const invoiceId = `INV-${orderId}`;
            totalAmount += shippingAmount; // Add shipping after discount
            // Create new order
            const orderDate = new Date();
            const newOrder = new order_model_1.default({
                orderId,
                userId: userId,
                products,
                orderDate,
                expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Current date + 2 days
                totalAmount,
                shippingAmount,
                totalItems,
                status: interface_1.OrderStatus.Placed,
                isCashOnDelivery,
                deliveryAddress,
                invoiceId: invoiceId,
                paymentStatus: isCashOnDelivery ? interface_1.PaymentStatus.Pending : interface_1.PaymentStatus.Paid,
                rzpOrderId: isCashOnDelivery ? undefined : "",
                rzpPaymentId: isCashOnDelivery ? undefined : "",
                appliedCoupon: appliedCoupon ? {
                    couponId: appliedCoupon.couponId,
                    code: appliedCoupon.code,
                    discountAmount: discountAmount,
                } : undefined, // Include appliedCoupon only if provided
            });
            yield newOrder.save({ session });
            // Update user order history
            const user = yield user_model_1.default.findById(userId).session(session);
            if (!user)
                throw new Error("User not found");
            user.orders = user.orders || [];
            user.orders.push(newOrder.orderId);
            yield user.save({ session });
            // Create invoice
            const invoiceData = {
                invoiceId,
                orderId,
                userDetails: {
                    name: user.name,
                    email: user.email,
                    phone: phone,
                },
                totalAmount: totalAmount,
                paymentStatus: isCashOnDelivery ? interface_1.PaymentStatus.Pending : interface_1.PaymentStatus.Paid,
                billingAddress: deliveryAddress,
                shippingAddress: deliveryAddress,
                orderDate,
                items: yield Promise.all(products.map((product) => __awaiter(void 0, void 0, void 0, function* () {
                    const productDetails = yield product_model_1.default.findById(product.productId).select("name price").lean();
                    return {
                        name: (productDetails === null || productDetails === void 0 ? void 0 : productDetails.name) || "Unknown Product",
                        quantity: product.quantity,
                        price: (productDetails === null || productDetails === void 0 ? void 0 : productDetails.price) || 0,
                    };
                }))),
                paymentMode: isCashOnDelivery ? "Cash on Delivery" : "Online Payment",
                discountAmount: discountAmount > 0 ? discountAmount : undefined, // Include discount in invoice if applied
            };
            const newInvoice = new invoice_model_1.default(invoiceData);
            yield newInvoice.save({ session });
            // Commit transaction
            yield session.commitTransaction();
            session.endSession();
            const successResponse = {
                statusCode: 201,
                message: "Order created successfully",
                data: newOrder,
            };
            res.status(201).json(successResponse);
            return;
        }
        catch (error) {
            yield session.abortTransaction();
            session.endSession();
            throw error;
        }
    }
    catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({
            message: error.message,
            statusCode: 500,
            res: `Creation of order failed due to ${error.message}`,
        });
    }
});
exports.createOrder = createOrder;
const getUserOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.query.userId;
        if (!userId) {
            const errorResponse = {
                message: "Missing required fields",
                statusCode: 400,
                error: "Bad Request",
            };
            res.status(400).json(errorResponse);
            return;
        }
        const orders = yield order_model_1.default.find({ userId }).sort({ orderDate: -1 }).populate({
            path: "products.productId", // Populate product details inside the array
            model: "Product", // Ensure it's referring to the correct model
            select: "name price image category", // Select relevant fields
        });
        const successResponse = {
            statusCode: 200,
            message: "User orders fetched successfully",
            data: orders,
        };
        res.status(200).json(successResponse);
    }
    catch (error) {
        console.error("Error fetching user orders:", error);
        res.status(500).json({
            message: error.message,
            statusCode: 500,
            res: `Fetching of user orders failed due to ${error.message}`
        });
    }
});
exports.getUserOrders = getUserOrders;
const getOrderById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orderId = req.query.orderId;
        if (!orderId) {
            const errorResponse = {
                message: "Missing required fields",
                statusCode: 400,
                error: "Bad Request",
            };
            res.status(400).json(errorResponse);
            return;
        }
        const order = yield order_model_1.default.findOne({ orderId });
        if (!order) {
            const errorResponse = {
                message: "Order not found",
                statusCode: 404,
                error: "Not Found",
            };
            res.status(404).json(errorResponse);
            return;
        }
        const successResponse = {
            statusCode: 200,
            message: "Order fetched successfully",
            data: order,
        };
        res.status(200).json(successResponse);
    }
    catch (error) {
        console.error("Error fetching order:", error);
        res.status(500).json({
            message: error.message,
            statusCode: 500,
            res: `Fetching of order failed due to ${error.message}`
        });
    }
});
exports.getOrderById = getOrderById;
const cancelOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Start a MongoDB session for transaction
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { orderId } = req.body;
        if (!orderId) {
            const errorResponse = {
                message: "Missing required fields",
                statusCode: 400,
                error: "Bad Request",
            };
            res.status(400).json(errorResponse);
            return;
        }
        const order = yield order_model_1.default.findOne({ orderId }).session(session);
        if (!order) {
            const errorResponse = {
                message: "Order not found",
                statusCode: 404,
                error: "Not Found",
            };
            res.status(404).json(errorResponse);
            yield session.abortTransaction();
            session.endSession();
            return;
        }
        if (order.status === interface_1.OrderStatus.Cancelled) {
            const errorResponse = {
                message: "Order already cancelled",
                statusCode: 400,
                error: "Bad Request",
            };
            res.status(400).json(errorResponse);
            yield session.abortTransaction();
            session.endSession();
            return;
        }
        // Restore product stock for each product in the order
        const products = order.products;
        for (const item of products) {
            const product = yield product_model_1.default.findById(item.productId).session(session);
            if (!product) {
                const errorResponse = {
                    message: `Product with ID ${item.productId} not found`,
                    statusCode: 404,
                    error: "Not Found",
                };
                res.status(404).json(errorResponse);
                yield session.abortTransaction();
                session.endSession();
                return;
            }
            // Increase the stock by the quantity that was ordered
            product.stock += item.quantity;
            yield product.save({ session });
        }
        // Update order status to cancelled
        order.status = interface_1.OrderStatus.Cancelled;
        // If payment was already made and not COD, mark for refund or track refund status
        if (!order.isCashOnDelivery && order.paymentStatus === interface_1.PaymentStatus.Paid) {
            order.paymentStatus = interface_1.PaymentStatus.Refund;
            // Additional refund logic could be implemented here
        }
        yield order.save({ session });
        // Commit the transaction
        yield session.commitTransaction();
        session.endSession();
        // Send success response
        const successResponse = {
            message: "Order cancelled successfully",
            statusCode: 200,
            orderId: order.orderId,
            refundStatus: order.paymentStatus === interface_1.PaymentStatus.Refund ? "Pending" : "Not Applicable"
        };
        res.status(200).json(successResponse);
    }
    catch (err) {
        // Abort the transaction in case of any error
        yield session.abortTransaction();
        session.endSession();
        const internalServerErrorResponse = {
            message: "Internal Server Error",
            statusCode: 500,
            stack: err.stack
        };
        res.status(500).send(internalServerErrorResponse);
    }
});
exports.cancelOrder = cancelOrder;
