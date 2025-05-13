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
const mongoose_1 = __importDefault(require("mongoose"));
const coupon_model_1 = __importDefault(require("../models/coupon.model"));
const inventory_model_1 = require("../models/inventory.model");
const invoice_model_1 = __importDefault(require("../models/invoice.model"));
const order_model_1 = __importDefault(require("../models/order.model"));
const product_model_1 = __importDefault(require("../models/product.model"));
const store_model_1 = require("../models/store.model");
const user_model_1 = __importDefault(require("../models/user.model"));
const wallet_model_1 = require("../models/wallet.model");
const report_models_1 = __importDefault(require("../models/report.models"));
const interface_1 = require("../types/interface/interface");
const nodemailer_1 = require("../config/nodemailer");
// Helper function to calculate order totals
function calculateOrderTotals(products, session) {
    return __awaiter(this, void 0, void 0, function* () {
        let totalAmount = 0;
        let totalItems = 0;
        const itemsForInvoice = [];
        for (const item of products) {
            const product = yield product_model_1.default.findById(item.productId).session(session);
            if (!product) {
                throw new Error(`Product with ID ${item.productId} not found`);
            }
            totalAmount += product.price * item.quantity;
            totalItems += item.quantity;
            itemsForInvoice.push({
                name: product.name,
                quantity: item.quantity,
                price: product.price,
            });
        }
        return { totalAmount, totalItems, itemsForInvoice };
    });
}
// Order Controller
class OrderController {
    /**
     * Create a new order (Transaction-based)
     * @param req Express request object
     * @param res Express response object
     */
    createOrder(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const session = yield mongoose_1.default.startSession();
            session.startTransaction();
            const { userId, products, storeId, isCashOnDelivery, deliveryAddress, appliedCoupon, walletAmount = 0, } = req.body;
            try {
                // Validation
                if (!userId ||
                    !products ||
                    !products.length ||
                    !storeId ||
                    !deliveryAddress ||
                    isCashOnDelivery === undefined) {
                    throw new Error("Missing required fields: userId, products, storeId, deliveryAddress, isCashOnDelivery");
                }
                if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
                    throw new Error("Invalid user ID");
                }
                // Fetch user
                const user = yield user_model_1.default.findById(userId).session(session);
                if (!user) {
                    throw new Error("User not found");
                }
                // Validate store
                const store = yield store_model_1.Store.findById(storeId).session(session);
                if (!store) {
                    throw new Error("Store not found");
                }
                // Validate inventory
                const inventory = yield inventory_model_1.Inventory.findOne({ storeId }).session(session);
                if (!inventory) {
                    throw new Error("Inventory not found for this store");
                }
                for (const item of products) {
                    if (!item.productId || !item.quantity || item.quantity < 1) {
                        throw new Error("Invalid product details: productId and quantity are required");
                    }
                    const inventoryProduct = inventory.products.find((p) => p.productId.toString() === item.productId.toString());
                    if (!inventoryProduct) {
                        throw new Error(`Product ${item.productId} not found in store inventory`);
                    }
                    if (inventoryProduct.quantity < item.quantity || !inventoryProduct.availability) {
                        throw new Error(`Insufficient stock for product ${item.productId}`);
                    }
                }
                // Calculate totals
                const { totalAmount, totalItems, itemsForInvoice } = yield calculateOrderTotals(products, session);
                // Apply coupon discount
                let discountAmount = 0;
                let coupon = null;
                if (appliedCoupon && appliedCoupon.couponId) {
                    coupon = yield coupon_model_1.default.findById(appliedCoupon.couponId).session(session);
                    if (!coupon) {
                        throw new Error("Coupon not found");
                    }
                    if (!coupon.isActive) {
                        throw new Error("Coupon is not active");
                    }
                    if (coupon.isDeleted) {
                        throw new Error("Coupon is deleted");
                    }
                    if (coupon.expiry < new Date()) {
                        throw new Error("Coupon has expired");
                    }
                    if (coupon.usedUsers.length >= coupon.maxUsage) {
                        throw new Error("Coupon has reached maximum usage");
                    }
                    if (totalAmount < coupon.minValue) {
                        throw new Error(`Order total (${totalAmount}) is less than minimum value (${coupon.minValue}) for coupon`);
                    }
                    if (coupon.usedUsers.includes(userId)) {
                        throw new Error("Coupon already used by this user");
                    }
                    discountAmount = coupon.offValue;
                    if (discountAmount > totalAmount) {
                        throw new Error("Discount amount exceeds total amount");
                    }
                    coupon.usedUsers.push(userId);
                    yield coupon.save({ session });
                }
                // Validate and apply wallet amount
                let walletAmountUsed = 0;
                if (walletAmount > 0) {
                    const wallet = yield wallet_model_1.UserWallet.findOne({ userId }).session(session);
                    if (!wallet) {
                        throw new Error("Wallet not found for this user");
                    }
                    if (wallet.current_amount < walletAmount) {
                        throw new Error(`Insufficient wallet balance. Available: ${wallet.current_amount}, Requested: ${walletAmount}`);
                    }
                    const finalAmountAfterDiscount = totalAmount - discountAmount;
                    walletAmountUsed = Math.min(walletAmount, finalAmountAfterDiscount);
                    if (walletAmountUsed <= 0) {
                        throw new Error("Wallet amount cannot cover any part of the order after discounts");
                    }
                    wallet.current_amount -= walletAmountUsed;
                    wallet.transaction_history.push({
                        amount: walletAmountUsed,
                        type: "debit",
                        date: new Date(),
                        description: `Order payment for order ORD-${Date.now()}`,
                        transactionId: new mongoose_1.default.Types.ObjectId(),
                    });
                    yield wallet.save({ session });
                }
                // Generate IDs
                const timestamp = Date.now();
                const orderId = `ORD-${timestamp}`;
                const invoiceId = `INV-ORD-${timestamp}`;
                // Create order
                const orderData = {
                    orderId,
                    userId: new mongoose_1.default.Types.ObjectId(userId),
                    products,
                    storeId: new mongoose_1.default.Types.ObjectId(storeId),
                    totalAmount: totalAmount - discountAmount - walletAmountUsed,
                    shippingAmount: 50,
                    totalItems,
                    isCashOnDelivery,
                    deliveryAddress,
                    invoiceId,
                    appliedCoupon: appliedCoupon
                        ? {
                            couponId: appliedCoupon.couponId,
                            code: coupon ? coupon.couponCode : appliedCoupon.code,
                            discountAmount,
                        }
                        : undefined,
                    wallet_amount_used: walletAmountUsed,
                    status: interface_1.OrderStatus.Placed,
                    paymentStatus: isCashOnDelivery ? interface_1.PaymentStatus.Pending : interface_1.PaymentStatus.Pending,
                    rzpOrderId: isCashOnDelivery ? undefined : `RZP-${timestamp}`,
                    rzpPaymentId: isCashOnDelivery ? undefined : undefined,
                    orderDate: new Date(),
                    expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                };
                const order = new order_model_1.default(orderData);
                yield order.save({ session });
                // Update user orders
                if (!user.orders) {
                    user.orders = [];
                }
                user.orders.push(orderId);
                yield user.save({ session });
                // Update inventory
                for (const item of products) {
                    const inventoryProduct = inventory.products.find((p) => p.productId.toString() === item.productId.toString());
                    if (inventoryProduct) {
                        inventoryProduct.quantity -= item.quantity;
                        inventoryProduct.availability = inventoryProduct.quantity > 0;
                    }
                }
                yield inventory.save({ session });
                // Update ZoneDailyProfitLossModel
                const orderDate = order.orderDate;
                const formattedDate = `${String(orderDate.getDate()).padStart(2, "0")}-${String(orderDate.getMonth() + 1).padStart(2, "0")}-${String(orderDate.getFullYear() % 100).padStart(2, "0")}`;
                console.log("Formatted date:", formattedDate);
                const report = yield report_models_1.default.findOne({
                    store_id: order.storeId,
                    date: formattedDate,
                }).session(session);
                if (report) {
                    report.total_sale_amount += order.totalAmount;
                    if (isCashOnDelivery) {
                        report.cash_on_delivery_amount += order.totalAmount;
                    }
                    else {
                        report.online_payment_amount += order.totalAmount;
                    }
                    report.total_orders += 1;
                    report.avg_order_value = report.total_sale_amount / report.total_orders;
                    const productSales = new Map();
                    for (const item of products) {
                        const productId = item.productId.toString();
                        productSales.set(productId, (productSales.get(productId) || 0) + item.quantity);
                    }
                    let maxQuantity = 0;
                    let mostSellingProductId;
                    for (const [productId, quantity] of productSales) {
                        if (quantity > maxQuantity) {
                            maxQuantity = quantity;
                            mostSellingProductId = productId;
                        }
                    }
                    if (mostSellingProductId) {
                        report.most_selling_product_id = new mongoose_1.default.Types.ObjectId(mostSellingProductId).toString();
                        report.most_selling_quantity = maxQuantity;
                    }
                    report.net_profit_or_loss =
                        report.total_sale_amount -
                            report.total_fixed_cost -
                            report.labour_cost -
                            report.packaging_cost;
                    report.status = report.net_profit_or_loss >= 0 ? "Profit" : "Loss";
                    yield report.save({ session });
                    console.log("REPORT SAVED", report);
                }
                else {
                    const newReport = new report_models_1.default({
                        store_id: storeId,
                        date: formattedDate,
                        total_sale_amount: order.totalAmount,
                        total_purchase_cost: 0,
                        total_fixed_cost: 0,
                        cash_on_delivery_amount: isCashOnDelivery ? order.totalAmount : 0,
                        online_payment_amount: isCashOnDelivery ? 0 : order.totalAmount,
                        labour_cost: 0,
                        packaging_cost: 0,
                        net_profit_or_loss: order.totalAmount,
                        status: order.totalAmount >= 0 ? "Profit" : "Loss",
                        total_orders: 1,
                        avg_order_value: order.totalAmount,
                        most_selling_product_id: (_a = products[0]) === null || _a === void 0 ? void 0 : _a.productId,
                        most_selling_quantity: ((_b = products[0]) === null || _b === void 0 ? void 0 : _b.quantity) || 0,
                        created_at: new Date().toISOString(),
                    });
                    yield newReport.save({ session });
                    console.log("New report created:", newReport);
                }
                // Create invoice
                const invoiceData = {
                    invoiceId,
                    orderId,
                    userDetails: {
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                    },
                    totalAmount: totalAmount - discountAmount - walletAmountUsed,
                    paymentStatus: isCashOnDelivery ? interface_1.PaymentStatus.Pending : interface_1.PaymentStatus.Pending,
                    shippingAmount: 50,
                    discount: discountAmount,
                    walletAmount: walletAmountUsed,
                    billingAddress: deliveryAddress,
                    shippingAddress: deliveryAddress,
                    orderDate: new Date(),
                    items: itemsForInvoice,
                    paymentMode: isCashOnDelivery
                        ? "Cash on Delivery"
                        : walletAmountUsed >= totalAmount - discountAmount
                            ? "Wallet"
                            : "Online Payment",
                };
                const invoice = new invoice_model_1.default(invoiceData);
                yield invoice.save({ session });
                // Send order confirmation email
                try {
                    yield (0, nodemailer_1.sendOrderCreatedMail)({
                        orderId: order.orderId,
                        items: itemsForInvoice,
                        totalAmount: order.totalAmount,
                        createdAt: order.orderDate,
                        storeId: order.storeId.toString(),
                        userId: order.userId.toString(),
                    });
                }
                catch (emailError) {
                    console.error(`Failed to send order confirmation email for order #${order.orderId}:`, emailError);
                }
                yield session.commitTransaction();
                res.status(201).json({
                    success: true,
                    data: { order, invoice },
                    message: "Order and invoice created successfully",
                });
            }
            catch (error) {
                // Revert coupon
                if (appliedCoupon && appliedCoupon.couponId) {
                    const coupon = yield coupon_model_1.default.findById(appliedCoupon.couponId).session(session);
                    if (coupon && coupon.usedUsers.includes(userId)) {
                        coupon.usedUsers = coupon.usedUsers.filter((id) => id !== userId);
                        yield coupon.save({ session });
                    }
                }
                // Revert wallet
                if (walletAmount > 0) {
                    const wallet = yield wallet_model_1.UserWallet.findOne({ userId }).session(session);
                    if (wallet &&
                        wallet.transaction_history.some((t) => t.description.includes(`Order payment for order `))) {
                        wallet.current_amount += walletAmount;
                        wallet.transaction_history = wallet.transaction_history.filter((t) => !t.description.includes(`Order payment for order `));
                        yield wallet.save({ session });
                    }
                }
                yield session.abortTransaction();
                res.status(400).json({
                    success: false,
                    message: error.message || "Failed to create order",
                });
            }
            finally {
                session.endSession();
            }
        });
    }
    /**
     * Cancel an order (Transaction-based)
     * @param req Express request object
     * @param res Express response object
     */
    cancelOrder(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield mongoose_1.default.startSession();
            session.startTransaction();
            try {
                const { orderId } = req.params;
                // Find order
                const order = yield order_model_1.default.findOne({ orderId }).session(session);
                if (!order) {
                    throw new Error("Order not found");
                }
                // Check if order can be canceled
                if (order.status !== interface_1.OrderStatus.Placed) {
                    throw new Error(`Order cannot be canceled in ${order.status} status`);
                }
                // Restore inventory
                const inventory = yield inventory_model_1.Inventory.findOne({ storeId: order.storeId }).session(session);
                if (!inventory) {
                    throw new Error("Inventory not found for this store");
                }
                for (const item of order.products) {
                    const inventoryProduct = inventory.products.find((p) => p.productId.toString() === item.productId.toString());
                    if (inventoryProduct) {
                        inventoryProduct.quantity += item.quantity;
                        inventoryProduct.availability = inventoryProduct.quantity > 0;
                    }
                    else {
                        throw new Error(`Product ${item.productId} not found in inventory`);
                    }
                }
                yield inventory.save({ session });
                // Update order status
                order.status = interface_1.OrderStatus.Cancelled;
                order.paymentStatus = interface_1.PaymentStatus.Cancelled;
                yield order.save({ session });
                // Update invoice
                const invoice = yield invoice_model_1.default.findOne({ orderId }).session(session);
                if (invoice) {
                    invoice.paymentStatus = interface_1.PaymentStatus.Cancelled;
                    yield invoice.save({ session });
                }
                else {
                    throw new Error("Invoice not found for this order");
                }
                // Update ZoneDailyProfitLossModel
                const orderDate = order.orderDate;
                const formattedDate = `${String(orderDate.getDate()).padStart(2, "0")}-${String(orderDate.getMonth() + 1).padStart(2, "0")}-${String(orderDate.getFullYear() % 100).padStart(2, "0")}`;
                console.log("Formatted date:", formattedDate);
                const report = yield report_models_1.default.findOne({
                    store_id: order.storeId,
                    date: formattedDate,
                }).session(session);
                if (report) {
                    report.total_sale_amount -= order.totalAmount;
                    report.total_orders -= 1;
                    report.avg_order_value = report.total_orders > 0 ? report.total_sale_amount / report.total_orders : 0;
                    const productSales = new Map();
                    const allOrders = yield order_model_1.default.find({
                        storeId: order.storeId,
                        orderDate: {
                            $gte: orderDate,
                            $lt: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000),
                        },
                    }).session(session);
                    for (const ord of allOrders) {
                        for (const item of ord.products) {
                            const productId = item.productId.toString();
                            productSales.set(productId, (productSales.get(productId) || 0) + item.quantity);
                        }
                    }
                    let maxQuantity = 0;
                    let mostSellingProductId;
                    for (const [productId, quantity] of productSales) {
                        if (quantity > maxQuantity) {
                            maxQuantity = quantity;
                            mostSellingProductId = productId;
                        }
                    }
                    if (mostSellingProductId) {
                        report.most_selling_product_id = new mongoose_1.default.Types.ObjectId(mostSellingProductId).toString();
                        report.most_selling_quantity = maxQuantity;
                    }
                    else {
                        report.most_selling_product_id = "";
                        report.most_selling_quantity = 0;
                    }
                    report.net_profit_or_loss =
                        report.total_sale_amount -
                            report.total_fixed_cost -
                            report.labour_cost -
                            report.packaging_cost;
                    report.status = report.net_profit_or_loss >= 0 ? "Profit" : "Loss";
                    yield report.save({ session });
                }
                yield session.commitTransaction();
                res.status(200).json({
                    success: true,
                    data: order,
                    message: "Order canceled successfully",
                });
            }
            catch (error) {
                yield session.abortTransaction();
                res.status(400).json({
                    success: false,
                    message: error.message || "Failed to cancel order",
                });
            }
            finally {
                session.endSession();
            }
        });
    }
    /**
     * Update order status (Transaction-based)
     * @param req Express request object
     * @param res Express response object
     */
    updateOrderStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield mongoose_1.default.startSession();
            session.startTransaction();
            try {
                const { orderId } = req.params;
                const { status } = req.body;
                // Validate status
                if (!Object.values(interface_1.OrderStatus).includes(status)) {
                    throw new Error(`Invalid order status: ${status}`);
                }
                // Find order
                const order = yield order_model_1.default.findOne({ orderId }).session(session);
                if (!order) {
                    throw new Error("Order not found");
                }
                // Validate status transition
                const validTransitions = {
                    [interface_1.OrderStatus.Placed]: [interface_1.OrderStatus.Confirmed, interface_1.OrderStatus.Cancelled],
                    [interface_1.OrderStatus.Confirmed]: [interface_1.OrderStatus.Shipped],
                    [interface_1.OrderStatus.Shipped]: [interface_1.OrderStatus.Delivered],
                    [interface_1.OrderStatus.Delivered]: [],
                    [interface_1.OrderStatus.Cancelled]: [],
                };
                if (!validTransitions[order.status].includes(status)) {
                    throw new Error(`Cannot transition from ${order.status} to ${status}`);
                }
                // Handle cancellation
                if (status === interface_1.OrderStatus.Cancelled) {
                    const inventory = yield inventory_model_1.Inventory.findOne({ storeId: order.storeId }).session(session);
                    if (!inventory) {
                        throw new Error("Inventory not found for this store");
                    }
                    for (const item of order.products) {
                        const inventoryProduct = inventory.products.find((p) => p.productId.toString() === item.productId.toString());
                        if (inventoryProduct) {
                            inventoryProduct.quantity += item.quantity;
                            inventoryProduct.availability = inventoryProduct.quantity > 0;
                        }
                        else {
                            throw new Error(`Product ${item.productId} not found in inventory`);
                        }
                    }
                    yield inventory.save({ session });
                    const orderDate = order.orderDate;
                    const formattedDate = `${String(orderDate.getDate()).padStart(2, "0")}-${String(orderDate.getMonth() + 1).padStart(2, "0")}-${String(orderDate.getFullYear() % 100).padStart(2, "0")}`;
                    console.log("Formatted date:", formattedDate);
                    const report = yield report_models_1.default.findOne({
                        store_id: order.storeId,
                        date: formattedDate,
                    }).session(session);
                    if (report) {
                        report.total_sale_amount -= order.totalAmount;
                        report.total_orders -= 1;
                        report.avg_order_value =
                            report.total_orders > 0 ? report.total_sale_amount / report.total_orders : 0;
                        const productSales = new Map();
                        const allOrders = yield order_model_1.default.find({
                            storeId: order.storeId,
                            orderDate: {
                                $gte: orderDate,
                                $lt: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000),
                            },
                        }).session(session);
                        for (const ord of allOrders) {
                            for (const item of ord.products) {
                                const productId = item.productId.toString();
                                productSales.set(productId, (productSales.get(productId) || 0) + item.quantity);
                            }
                        }
                        let maxQuantity = 0;
                        let mostSellingProductId;
                        for (const [productId, quantity] of productSales) {
                            if (quantity > maxQuantity) {
                                maxQuantity = quantity;
                                mostSellingProductId = productId;
                            }
                        }
                        if (mostSellingProductId) {
                            report.most_selling_product_id = new mongoose_1.default.Types.ObjectId(mostSellingProductId).toString();
                            report.most_selling_quantity = maxQuantity;
                        }
                        else {
                            report.most_selling_product_id = "";
                            report.most_selling_quantity = 0;
                        }
                        report.net_profit_or_loss =
                            report.total_sale_amount -
                                report.total_fixed_cost -
                                report.labour_cost -
                                report.packaging_cost;
                        report.status = report.net_profit_or_loss >= 0 ? "Profit" : "Loss";
                        yield report.save({ session });
                    }
                }
                // Update order and payment status
                order.status = status;
                if (status === interface_1.OrderStatus.Delivered && !order.isCashOnDelivery) {
                    order.paymentStatus = interface_1.PaymentStatus.Paid;
                }
                else if (status === interface_1.OrderStatus.Cancelled) {
                    order.paymentStatus = interface_1.PaymentStatus.Cancelled;
                }
                yield order.save({ session });
                // Update invoice
                const invoice = yield invoice_model_1.default.findOne({ orderId }).session(session);
                if (invoice) {
                    if (status === interface_1.OrderStatus.Delivered && !order.isCashOnDelivery) {
                        invoice.paymentStatus = interface_1.PaymentStatus.Paid;
                    }
                    else if (status === interface_1.OrderStatus.Cancelled) {
                        invoice.paymentStatus = interface_1.PaymentStatus.Cancelled;
                    }
                    yield invoice.save({ session });
                }
                else {
                    throw new Error("Invoice not found for this order");
                }
                yield session.commitTransaction();
                res.status(200).json({
                    success: true,
                    data: order,
                    message: "Order status updated successfully",
                });
            }
            catch (error) {
                yield session.abortTransaction();
                res.status(400).json({
                    success: false,
                    message: error.message || "Failed to update order status",
                });
            }
            finally {
                session.endSession();
            }
        });
    }
    /**
     * Get order by ID (Transaction-based)
     * @param req Express request object
     * @param res Express response object
     */
    getOrderById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield mongoose_1.default.startSession();
            session.startTransaction();
            try {
                const { orderId } = req.params;
                if (!orderId) {
                    throw new Error("Order ID is required");
                }
                const order = yield order_model_1.default.findOne({ orderId })
                    .populate({
                    path: "products.productId",
                    select: "name price unit",
                    model: "Product",
                })
                    .populate({
                    path: "storeId",
                    model: "Store",
                    select: "name address longitude latitude radius",
                })
                    .populate({
                    path: "userId",
                    select: "name email",
                })
                    .session(session);
                if (!order) {
                    throw new Error("Order not found");
                }
                yield session.commitTransaction();
                res.status(200).json({
                    success: true,
                    data: order,
                    message: "Order fetched successfully",
                });
            }
            catch (error) {
                yield session.abortTransaction();
                res.status(400).json({
                    success: false,
                    message: error.message || "Failed to fetch order",
                });
            }
            finally {
                session.endSession();
            }
        });
    }
    /**
     * Get all orders for a user (Transaction-based)
     * @param req Express request object
     * @param res Express response object
     */
    getUserOrders(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield mongoose_1.default.startSession();
            session.startTransaction();
            try {
                const { userId } = req.params;
                if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
                    throw new Error("Invalid user ID");
                }
                const orders = yield order_model_1.default.find({ userId: new mongoose_1.default.Types.ObjectId(userId) })
                    .populate({
                    path: "products.productId",
                    select: "name price unit",
                    model: "Product",
                })
                    .populate({
                    path: "storeId",
                    model: "Store",
                    select: "name address longitude latitude radius",
                })
                    .populate({
                    path: "userId",
                    select: "name email",
                })
                    .session(session);
                yield session.commitTransaction();
                res.status(200).json({
                    success: true,
                    message: orders.length > 0 ? "Orders fetched successfully" : "No orders found for this user",
                    orders,
                });
            }
            catch (error) {
                yield session.abortTransaction();
                res.status(400).json({
                    success: false,
                    message: error.message || "Failed to fetch user orders",
                });
            }
            finally {
                session.endSession();
            }
        });
    }
}
exports.default = new OrderController();
