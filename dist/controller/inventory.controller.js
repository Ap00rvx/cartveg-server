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
exports.uploadInventoryCsv = exports.downloadProductsCsv = exports.changeOrderStatus = exports.getStoreOrder = exports.getProductById = exports.getAllProducts = exports.updateStock = exports.getInventoryProducts = exports.addProductToInventory = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const inventory_model_1 = require("../models/inventory.model"); // Adjust path to your Inventory model
const store_model_1 = require("../models/store.model"); // Adjust path to your Store model
const product_model_1 = __importDefault(require("../models/product.model")); // Adjust path to your Product model (assumed)
const interface_1 = require("../types/interface/interface");
const order_model_1 = __importDefault(require("../models/order.model"));
const papaparse_1 = __importDefault(require("papaparse"));
const report_models_1 = __importDefault(require("../models/report.models"));
// Controller to add multiple products to inventory
const addProductToInventory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { storeId, products } = req.body;
        // Validate required fields
        if (!storeId || !products || !Array.isArray(products) || products.length === 0) {
            res.status(400).json({
                success: false,
                message: "storeId and a non-empty products array are required",
            });
            return;
        }
        // Validate MongoDB ObjectId for storeId
        if (!mongoose_1.default.Types.ObjectId.isValid(storeId)) {
            res.status(400).json({
                success: false,
                message: "Invalid storeId format",
            });
            return;
        }
        // Validate each product entry
        for (const product of products) {
            if (!product.productId || product.quantity === undefined || product.threshold === undefined) {
                res.status(400).json({
                    success: false,
                    message: "Each product must have productId, quantity, and threshold",
                });
                return;
            }
            if (!mongoose_1.default.Types.ObjectId.isValid(product.productId)) {
                res.status(400).json({
                    success: false,
                    message: `Invalid productId format: ${product.productId}`,
                });
                return;
            }
            if (product.quantity < 0 || product.threshold < 0) {
                res.status(400).json({
                    success: false,
                    message: `Quantity and threshold must be non-negative for productId: ${product.productId}`,
                });
                return;
            }
        }
        // Check if store exists
        const store = yield store_model_1.Store.findById(storeId);
        if (!store) {
            res.status(404).json({
                success: false,
                message: "Store not found",
            });
            return;
        }
        // Check if all products exist
        const productIds = products.map((p) => p.productId);
        const existingProducts = yield product_model_1.default.find({ _id: { $in: productIds } });
        if (existingProducts.length !== productIds.length) {
            const missingIds = productIds.filter((id) => !existingProducts.some((p) => p._id.toString() === id));
            res.status(404).json({
                success: false,
                message: `Products not found: ${missingIds.join(", ")}`,
            });
            return;
        }
        // Find or create inventory for the store
        let inventory = yield inventory_model_1.Inventory.findOne({ storeId });
        if (!inventory) {
            // Create new inventory if none exists
            inventory = new inventory_model_1.Inventory({
                storeId: new mongoose_1.default.Types.ObjectId(storeId),
                products: [],
            });
        }
        // Process each product
        for (const product of products) {
            const productIndex = inventory.products.findIndex((p) => p.productId.toString() === product.productId);
            if (productIndex !== -1) {
                // Update existing product
                inventory.products[productIndex] = {
                    productId: new mongoose_1.default.Types.ObjectId(product.productId),
                    quantity: product.quantity,
                    threshold: product.threshold,
                    availability: (_a = product.availability) !== null && _a !== void 0 ? _a : true,
                };
            }
            else {
                // Add new product
                inventory.products.push({
                    productId: new mongoose_1.default.Types.ObjectId(product.productId),
                    quantity: product.quantity,
                    threshold: product.threshold,
                    availability: (_b = product.availability) !== null && _b !== void 0 ? _b : true,
                });
            }
        }
        // Save the inventory
        yield inventory.save();
        res.status(200).json({
            success: true,
            message: "Products added/updated in inventory successfully",
            data: inventory,
        });
    }
    catch (error) {
        console.error("Error adding products to inventory:", error);
        res.status(500).json({
            success: false,
            message: "Server error while adding products to inventory",
            error: error.message,
        });
    }
});
exports.addProductToInventory = addProductToInventory;
const getInventoryProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // Get storeId from query params
        console.log(req.query);
        const storeId = req.query.storeId;
        // Get pagination parameters
        const page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
        // Validate pagination parameters
        if (page < 1 || limit < 1) {
            res.status(400).json({
                success: false,
                message: "Page and limit must be positive integers",
            });
            return;
        }
        // Validate storeId
        if (!storeId) {
            res.status(400).json({
                success: false,
                message: "storeId is required",
            });
            return;
        }
        // Validate MongoDB ObjectId
        if (!mongoose_1.default.Types.ObjectId.isValid(storeId)) {
            res.status(400).json({
                success: false,
                message: "Invalid storeId format",
            });
            return;
        }
        // Find inventory document
        const inventory = yield inventory_model_1.Inventory.findOne({ storeId }).lean();
        // Check if inventory exists
        if (!inventory) {
            res.status(404).json({
                success: false,
                message: "Inventory not found for this store",
            });
            return;
        }
        // Calculate total items and pages for pagination
        const totalProducts = ((_a = inventory.products) === null || _a === void 0 ? void 0 : _a.length) || 0;
        const totalPages = Math.ceil(totalProducts / limit);
        // Apply pagination to products array
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedProducts = ((_b = inventory.products) === null || _b === void 0 ? void 0 : _b.slice(startIndex, endIndex)) || [];
        // Get product IDs for the current page
        const productIds = paginatedProducts.map(product => product.productId);
        // Fetch product details in bulk
        const productDetails = yield product_model_1.default.find({ _id: { $in: productIds } }, 'name description unit category origin shelfLife image price actualPrice').lean();
        // Create lookup map for quick access to product details
        const productDetailsMap = new Map();
        productDetails.forEach(product => {
            productDetailsMap.set(product._id.toString(), product);
        });
        // Format response to combine inventory and product details
        const formattedProducts = paginatedProducts.map((product) => {
            const productId = product.productId.toString();
            const details = productDetailsMap.get(productId);
            return {
                productId: product.productId,
                quantity: product.quantity,
                threshold: product.threshold,
                availability: product.availability,
                details: details ? {
                    name: details.name,
                    description: details.description,
                    unit: details.unit,
                    category: details.category,
                    origin: details.origin,
                    shelfLife: details.shelfLife,
                    image: details.image,
                    price: details.price,
                    actualPrice: details.actualPrice,
                } : null,
            };
        });
        // Create pagination info
        const pagination = {
            currentPage: page,
            totalPages,
            limit,
            totalProducts,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        };
        // Return formatted response with pagination
        res.status(200).json({
            success: true,
            message: "Inventory products retrieved successfully",
            data: {
                storeId,
                pagination,
                products: formattedProducts,
            },
        });
    }
    catch (error) {
        const err = error;
        console.error("Error retrieving inventory products:", err);
        res.status(500).json({
            success: false,
            message: "Server error while retrieving inventory products",
            error: err.message,
        });
    }
});
exports.getInventoryProducts = getInventoryProducts;
// Controller to update stock in inventory (unchanged)
const updateStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { storeId, productId, quantity, threshold, availability } = req.body;
        // Validate required fields
        if (!storeId || !productId) {
            res.status(400).json({
                success: false,
                message: "storeId and productId are required",
            });
            return;
        }
        // Validate MongoDB ObjectIds
        if (!mongoose_1.default.Types.ObjectId.isValid(storeId) || !mongoose_1.default.Types.ObjectId.isValid(productId)) {
            res.status(400).json({
                success: false,
                message: "Invalid storeId or productId format",
            });
            return;
        }
        // Validate quantity and threshold if provided
        if (quantity !== undefined && quantity < 0) {
            res.status(400).json({
                success: false,
                message: "Quantity cannot be negative",
            });
            return;
        }
        if (threshold !== undefined && threshold < 0) {
            res.status(400).json({
                success: false,
                message: "Threshold cannot be negative",
            });
            return;
        }
        // Check if inventory exists
        const inventory = yield inventory_model_1.Inventory.findOne({ storeId });
        if (!inventory) {
            res.status(404).json({
                success: false,
                message: "Inventory not found for this store",
            });
            return;
        }
        // Find product in inventory
        const productIndex = inventory.products.findIndex((p) => p.productId.toString() === productId);
        if (productIndex === -1) {
            res.status(404).json({
                success: false,
                message: "Product not found in inventory",
            });
            return;
        }
        // Update product fields if provided
        if (quantity !== undefined) {
            inventory.products[productIndex].quantity = quantity;
        }
        if (threshold !== undefined) {
            inventory.products[productIndex].threshold = threshold;
        }
        if (availability !== undefined) {
            inventory.products[productIndex].availability = availability;
        }
        if (availability === undefined && quantity !== undefined && (quantity === 0 || quantity < inventory.products[productIndex].threshold)) {
            inventory.products[productIndex].availability = false; // Set availability to false if quantity is 0 or below threshold
        }
        else if (availability === undefined && quantity !== undefined && quantity > inventory.products[productIndex].threshold) {
            inventory.products[productIndex].availability = true; // Set availability to true if quantity is above threshold
        }
        // Save the updated inventory
        yield inventory.save();
        res.status(200).json({
            success: true,
            message: "Stock updated successfully",
            data: inventory,
        });
    }
    catch (error) {
        console.error("Error updating stock:", error);
        res.status(500).json({
            success: false,
            message: "Server error while updating stock",
            error: error.message,
        });
    }
});
exports.updateStock = updateStock;
const getAllProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get pagination and store parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const storeId = req.query.storeId;
        // Validate storeId
        if (!storeId || !mongoose_1.default.Types.ObjectId.isValid(storeId)) {
            res.status(400).json({
                success: false,
                message: "Valid storeId is required",
            });
            return;
        }
        // Validate pagination
        if (page < 1 || limit < 1) {
            res.status(400).json({
                success: false,
                message: "Page and limit must be positive integers",
            });
            return;
        }
        // Calculate skip for pagination
        const skip = (page - 1) * limit;
        // Fetch products with pagination
        const products = yield product_model_1.default.find({})
            .select("name description unit category origin shelfLife image price actualPrice")
            .skip(skip)
            .limit(limit)
            .lean();
        // Get total product count
        const totalProducts = yield product_model_1.default.countDocuments();
        if (!products || products.length === 0) {
            res.status(404).json({
                success: false,
                message: "No products found",
            });
            return;
        }
        // Fetch inventory for the store
        const inventory = yield inventory_model_1.Inventory.findOne({ storeId }).lean();
        // Map products with inventory details
        const productsWithInventory = products.map((product) => {
            var _a, _b;
            // Find inventory details for this product
            const inventoryItem = (_a = inventory === null || inventory === void 0 ? void 0 : inventory.products) === null || _a === void 0 ? void 0 : _a.find((item) => item.productId.toString() === product._id.toString());
            // Default inventory values if not found
            const quantity = (inventoryItem === null || inventoryItem === void 0 ? void 0 : inventoryItem.quantity) || 0;
            const threshold = (inventoryItem === null || inventoryItem === void 0 ? void 0 : inventoryItem.threshold) || 0;
            const availability = (_b = inventoryItem === null || inventoryItem === void 0 ? void 0 : inventoryItem.availability) !== null && _b !== void 0 ? _b : false;
            // Compute inventory status
            let inventoryStatus;
            if (!availability || quantity <= 0) {
                inventoryStatus = "outOfStock";
            }
            else if (quantity <= threshold) {
                inventoryStatus = "lowStock";
            }
            else if (quantity > threshold && !availability) {
                inventoryStatus = "notAvailable";
            }
            else {
                inventoryStatus = "inStock";
            }
            return Object.assign(Object.assign({}, product), { inventory: {
                    quantity,
                    threshold,
                    availability,
                    inventoryStatus,
                } });
        });
        // Return response
        res.status(200).json({
            success: true,
            message: "Products retrieved successfully",
            data: {
                products: productsWithInventory,
                pagination: {
                    currentPage: page,
                    limit,
                    totalProducts,
                    totalPages: Math.ceil(totalProducts / limit),
                },
            },
        });
    }
    catch (error) {
        console.error("Error retrieving products:", error);
        res.status(500).json({
            success: false,
            message: "Server error while retrieving products",
            error: error.message,
        });
    }
});
exports.getAllProducts = getAllProducts;
const getProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const productId = req.params.id;
        // Validate productId
        if (!productId || !mongoose_1.default.Types.ObjectId.isValid(productId)) {
            res.status(400).json({
                success: false,
                message: "Invalid productId format",
            });
            return;
        }
        // Fetch product by ID
        const product = yield product_model_1.default.findById(productId).lean();
        if (!product) {
            res.status(404).json({
                success: false,
                message: "Product not found",
            });
            return;
        }
        // Return response
        res.status(200).json({
            success: true,
            message: "Product retrieved successfully",
            data: product,
        });
    }
    catch (error) {
        console.error("Error retrieving product:", error);
        res.status(500).json({
            success: false,
            message: "Server error while retrieving product",
            error: error.message,
        });
    }
});
exports.getProductById = getProductById;
const getStoreOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const storeId = req.query.storeId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        // Validate storeId
        if (!storeId) {
            res.status(400).json({
                success: false,
                message: "storeId is required",
            });
            return;
        }
        // Validate MongoDB ObjectId
        if (!mongoose_1.default.Types.ObjectId.isValid(storeId)) {
            res.status(400).json({
                success: false,
                message: "Invalid storeId format",
            });
            return;
        }
        // Fetch orders for the store with pagination
        const orders = yield order_model_1.default.find({
            storeId: new mongoose_1.default.Types.ObjectId(storeId),
        })
            .populate("products.productId", "name description unit category origin shelfLife image price actualPrice", "Product")
            .skip(skip)
            .limit(limit)
            .lean();
        // Get total order count for the store
        const totalOrders = yield order_model_1.default.countDocuments({
            storeId: new mongoose_1.default.Types.ObjectId(storeId),
        });
        // Calculate total pages
        const totalPages = Math.ceil(totalOrders / limit);
        res.status(200).json({
            success: true,
            data: {
                orders,
                totalOrders,
                currentPage: page,
                totalPages,
            },
        });
    }
    catch (err) {
        console.error("Error retrieving store orders:", err);
        res.status(500).json({
            success: false,
            message: "Server error while retrieving store orders",
            error: err.message,
        });
    }
}); // Adjust path to your Order model
exports.getStoreOrder = getStoreOrder;
const changeOrderStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { orderId, newStatus, storeId } = req.body;
        // Validate inputs
        if (!orderId || !newStatus || !storeId) {
            throw new Error("orderId, newStatus, and storeId are required");
        }
        // Validate MongoDB ObjectId
        if (!mongoose_1.default.Types.ObjectId.isValid(storeId)) {
            throw new Error("Invalid StoreiD format");
        }
        // Validate newStatus
        const validStatuses = Object.values(interface_1.OrderStatus);
        if (!validStatuses.includes(newStatus)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
        }
        // Find the order
        const order = yield order_model_1.default.findOne({
            orderId,
            storeId: new mongoose_1.default.Types.ObjectId(storeId),
        }).session(session);
        if (!order) {
            throw new Error("Order not found");
        }
        // Check if order is already cancelled
        if (order.status === interface_1.OrderStatus.Cancelled) {
            throw new Error("Cannot change status of a cancelled order");
        }
        // Define allowed status transitions
        const allowedTransitions = {
            [interface_1.OrderStatus.Placed]: [
                interface_1.OrderStatus.Confirmed,
                interface_1.OrderStatus.Shipped,
                interface_1.OrderStatus.Cancelled,
            ],
            [interface_1.OrderStatus.Confirmed]: [interface_1.OrderStatus.Shipped, interface_1.OrderStatus.Cancelled],
            [interface_1.OrderStatus.Shipped]: [interface_1.OrderStatus.Delivered, interface_1.OrderStatus.Cancelled],
            [interface_1.OrderStatus.Delivered]: [interface_1.OrderStatus.Cancelled],
            [interface_1.OrderStatus.Cancelled]: [],
        };
        // Validate status transition
        if (!allowedTransitions[order.status].includes(newStatus)) {
            throw new Error(`Invalid status transition from ${order.status} to ${newStatus}`);
        }
        // If the new status is Cancelled, update ZoneDailyProfitLossModel
        if (newStatus === interface_1.OrderStatus.Cancelled) {
            const orderDate = order.orderDate;
            // Format orderDate to "DD-MM-YY" to match ZoneDailyProfitLossModel
            const formattedOrderDate = `${String(orderDate.getDate()).padStart(2, '0')}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getFullYear() % 100).padStart(2, '0')}`;
            const report = yield report_models_1.default.findOne({
                store_id: storeId,
                date: formattedOrderDate,
            }).session(session);
            if (report) {
                report.total_sale_amount -= order.totalAmount;
                report.total_orders -= 1;
                report.avg_order_value = report.total_orders > 0 ? report.total_sale_amount / report.total_orders : 0;
                // Recalculate most sold product
                const productSales = new Map();
                const allOrders = yield order_model_1.default.find({
                    storeId: storeId,
                    orderDate: {
                        $gte: new Date(orderDate.setHours(0, 0, 0, 0)),
                        $lt: new Date(orderDate.setHours(23, 59, 59, 999)),
                    },
                    status: { $ne: interface_1.OrderStatus.Cancelled }, // Exclude cancelled orders
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
                yield report.save({ session });
            }
        }
        // Update the order status
        order.status = newStatus;
        yield order.save({ session });
        // Populate product details for response
        const updatedOrder = yield order_model_1.default.findOne({
            orderId,
            storeId,
        })
            .populate("products.productId", "name description unit category origin shelfLife image price actualPrice", "Product")
            .lean()
            .session(session);
        yield session.commitTransaction();
        res.status(200).json({
            success: true,
            message: `Order status updated to ${newStatus}`,
            data: updatedOrder,
        });
    }
    catch (err) {
        yield session.abortTransaction();
        console.error("Error updating order status:", err);
        res.status(500).json({
            success: false,
            message: "Server error while updating order status",
            error: err.message,
        });
    }
    finally {
        session.endSession();
    }
});
exports.changeOrderStatus = changeOrderStatus;
const downloadProductsCsv = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get store parameter
        const storeId = req.query.storeId;
        // Validate storeId
        if (!storeId || !mongoose_1.default.Types.ObjectId.isValid(storeId)) {
            res.status(400).json({
                success: false,
                message: "Valid storeId is required",
            });
            return;
        }
        // Fetch all products (no pagination)
        const products = yield product_model_1.default.find({})
            .select("name") // Only fetch name
            .lean();
        if (!products || products.length === 0) {
            res.status(404).json({
                success: false,
                message: "No products found",
            });
            return;
        }
        // Fetch inventory for the store
        const inventory = yield inventory_model_1.Inventory.findOne({ storeId }).lean();
        // Map products with inventory details
        const csvData = products.map((product) => {
            var _a, _b, _c, _d, _e, _f, _g;
            return ({
                "productId": product._id.toString(),
                name: product.name,
                quantity: ((_b = (_a = inventory === null || inventory === void 0 ? void 0 : inventory.products) === null || _a === void 0 ? void 0 : _a.find((item) => item.productId.toString() === product._id.toString())) === null || _b === void 0 ? void 0 : _b.quantity) || 0,
                threshold: ((_d = (_c = inventory === null || inventory === void 0 ? void 0 : inventory.products) === null || _c === void 0 ? void 0 : _c.find((item) => item.productId.toString() === product._id.toString())) === null || _d === void 0 ? void 0 : _d.threshold) || 0,
                availability: ((_g = (_f = (_e = inventory === null || inventory === void 0 ? void 0 : inventory.products) === null || _e === void 0 ? void 0 : _e.find((item) => item.productId.toString() === product._id.toString())) === null || _f === void 0 ? void 0 : _f.availability) !== null && _g !== void 0 ? _g : false).toString(),
            });
        });
        // Generate CSV using PapaParse
        const csvContent = papaparse_1.default.unparse(csvData, {
            header: true,
            columns: ["productId", "name", "quantity", "threshold", "availability"],
        });
        // Set response headers for CSV download
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=products.csv");
        // Send CSV content
        res.status(200).send(csvContent);
    }
    catch (error) {
        console.error("Error generating products CSV:", error);
        res.status(500).json({
            success: false,
            message: "Server error while generating products CSV",
            error: error.message,
        });
    }
});
exports.downloadProductsCsv = downloadProductsCsv;
const uploadInventoryCsv = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        // Validate storeId
        const storeId = req.query.storeId;
        if (!storeId || !mongoose_1.default.Types.ObjectId.isValid(storeId)) {
            res.status(400).json({
                success: false,
                message: 'Valid storeId is required',
            });
            return;
        }
        // Validate file upload
        if (!req.file || !req.file.buffer) {
            res.status(400).json({
                success: false,
                message: 'CSV file is required',
            });
            return;
        }
        // Log file size for debugging
        console.log(`Received file buffer size: ${req.file.buffer.length} bytes`);
        // Convert buffer to string
        const csvString = req.file.buffer.toString('utf8');
        console.log(`CSV sample: ${csvString.substring(0, 200)}`);
        // Parse CSV using PapaParse
        const parseResult = papaparse_1.default.parse(csvString, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
        });
        if (parseResult.errors && parseResult.errors.length > 0) {
            console.error('CSV parsing errors:', parseResult.errors);
            res.status(400).json({
                success: false,
                message: 'Error parsing CSV file',
                errors: parseResult.errors,
            });
            return;
        }
        // Get data rows
        const rows = parseResult.data;
        console.log(`Parsed ${rows.length} rows from CSV`);
        // Initialize results
        const result = {
            processedRows: [],
            addedProducts: [],
            updatedProducts: [],
            errors: [],
        };
        // Extract and validate product IDs
        const productIds = rows
            .map((row, index) => {
            var _a;
            const productId = (_a = row.productId) === null || _a === void 0 ? void 0 : _a.trim();
            if (!productId || !mongoose_1.default.Types.ObjectId.isValid(productId)) {
                result.errors.push({ row: index + 1, message: `Invalid productId: ${productId || 'missing'}` });
                return null;
            }
            return productId;
        })
            .filter((id) => id !== null);
        // Fetch all products in one query
        const validProducts = yield product_model_1.default.find({ _id: { $in: productIds.map((id) => new mongoose_1.default.Types.ObjectId(id)) } }).lean();
        const validProductIds = new Set(validProducts.map((p) => p._id.toString()));
        // Prepare inventory updates
        const objectIdStoreId = new mongoose_1.default.Types.ObjectId(storeId);
        const productsToAdd = [];
        const productsToUpdate = [];
        // Process each row
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowIndex = i + 1;
            try {
                const productId = (_a = row.productId) === null || _a === void 0 ? void 0 : _a.trim();
                if (!productId || !validProductIds.has(productId)) {
                    continue; // Skip invalid or non-existent product IDs
                }
                // Extract product name for logging
                const productName = ((_b = row.name) === null || _b === void 0 ? void 0 : _b.trim()) || ((_c = validProducts.find((p) => p._id.toString() === productId)) === null || _c === void 0 ? void 0 : _c.name) || 'Unknown';
                // Parse and validate quantity
                const quantityValue = ((_d = row.quantity) === null || _d === void 0 ? void 0 : _d.toString().trim()) || '';
                const quantity = parseInt(quantityValue);
                if (isNaN(quantity) || quantity < 0) {
                    result.errors.push({ row: rowIndex, message: `Invalid quantity: ${quantityValue}` });
                    continue;
                }
                // Parse and validate threshold
                const thresholdValue = ((_e = row.threshold) === null || _e === void 0 ? void 0 : _e.toString().trim()) || '';
                const threshold = parseInt(thresholdValue);
                if (isNaN(threshold) || threshold < 0) {
                    result.errors.push({ row: rowIndex, message: `Invalid threshold: ${thresholdValue}` });
                    continue;
                }
                // Parse and validate availability
                const availabilityValue = ((_f = row.availability) === null || _f === void 0 ? void 0 : _f.toString().toLowerCase().trim()) || '';
                if (availabilityValue !== 'true' && availabilityValue !== 'false') {
                    result.errors.push({ row: rowIndex, message: `Invalid availability: ${availabilityValue}` });
                    continue;
                }
                const isAvailable = availabilityValue === 'true';
                // Prepare product inventory object
                const productInventory = {
                    productId: new mongoose_1.default.Types.ObjectId(productId),
                    quantity,
                    threshold,
                    availability: isAvailable,
                };
                productsToAdd.push(productInventory);
                productsToUpdate.push({ productId, quantity, threshold, availability: isAvailable });
                result.processedRows.push(productId);
            }
            catch (err) {
                const error = err;
                result.errors.push({ row: rowIndex, message: `Error processing row: ${error.message}` });
                console.error(`Error in row ${rowIndex}:`, error.message);
            }
        }
        // Perform a single inventory update
        if (productsToAdd.length > 0) {
            try {
                // Check if inventory exists, create if not
                let inventory = yield inventory_model_1.Inventory.findOne({ storeId: objectIdStoreId });
                if (!inventory) {
                    inventory = new inventory_model_1.Inventory({
                        storeId: objectIdStoreId,
                        products: [],
                    });
                    yield inventory.save();
                    console.log(`Created new inventory for store: ${storeId}`);
                }
                // Determine which products are new vs. existing
                const existingProductIds = new Set(inventory.products.map((p) => p.productId.toString()));
                const newProducts = productsToAdd.filter((item) => !existingProductIds.has(item.productId.toString()));
                const updateProducts = productsToUpdate.filter((item) => existingProductIds.has(item.productId));
                // Build update operation
                const updateOperation = {};
                if (updateProducts.length > 0) {
                    updateOperation.$set = updateProducts.reduce((acc, item) => {
                        acc[`products.$[elem${item.productId}].quantity`] = item.quantity;
                        acc[`products.$[elem${item.productId}].threshold`] = item.threshold;
                        acc[`products.$[elem${item.productId}].availability`] = item.availability;
                        return acc;
                    }, {});
                }
                if (newProducts.length > 0) {
                    updateOperation.$push = {
                        products: { $each: newProducts },
                    };
                }
                // Perform the update
                if (Object.keys(updateOperation).length > 0) {
                    yield inventory_model_1.Inventory.findOneAndUpdate({ storeId: objectIdStoreId }, updateOperation, {
                        arrayFilters: updateProducts.map((item) => ({
                            [`elem${item.productId}.productId`]: new mongoose_1.default.Types.ObjectId(item.productId),
                        })),
                        new: true,
                    });
                    console.log('Inventory updated successfully');
                }
                // Refine results
                result.addedProducts = newProducts.map((item) => {
                    var _a, _b;
                    return ({
                        productId: item.productId.toString(),
                        name: ((_b = (_a = rows.find((row) => { var _a; return ((_a = row.productId) === null || _a === void 0 ? void 0 : _a.trim()) === item.productId.toString(); })) === null || _a === void 0 ? void 0 : _a.name) === null || _b === void 0 ? void 0 : _b.trim()) || 'Unknown',
                    });
                });
                result.updatedProducts = updateProducts.map((item) => {
                    var _a, _b;
                    return ({
                        productId: item.productId,
                        name: ((_b = (_a = rows.find((row) => { var _a; return ((_a = row.productId) === null || _a === void 0 ? void 0 : _a.trim()) === item.productId; })) === null || _a === void 0 ? void 0 : _a.name) === null || _b === void 0 ? void 0 : _b.trim()) || 'Unknown',
                    });
                });
            }
            catch (err) {
                const saveErr = err;
                console.error('Error updating inventory:', saveErr);
                res.status(500).json({
                    success: false,
                    message: 'Error updating inventory',
                    error: saveErr.message,
                });
                return;
            }
        }
        // Log final results
        console.log('Final results:', {
            processedCount: result.processedRows.length,
            addedCount: result.addedProducts.length,
            updatedCount: result.updatedProducts.length,
            errorCount: result.errors.length,
        });
        // Return response
        res.status(200).json({
            success: true,
            message: 'Inventory updated successfully',
            data: {
                processedCount: result.processedRows.length,
                processedProductIds: result.processedRows,
                addedCount: result.addedProducts.length,
                addedProducts: result.addedProducts,
                updatedCount: result.updatedProducts.length,
                updatedProducts: result.updatedProducts,
                errorCount: result.errors.length,
                errors: result.errors,
            },
        });
    }
    catch (err) {
        const error = err;
        console.error('Error processing inventory CSV:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while processing inventory CSV',
            error: error.message,
        });
    }
});
exports.uploadInventoryCsv = uploadInventoryCsv;
