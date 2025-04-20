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
exports.getAvailableProductsWithCategory = exports.getAllProductsWithAvailability = exports.getStoreDetailsWithLatlong = exports.getProductsByLocation = void 0;
const store_model_1 = require("../models/store.model"); // Adjust path to your Store model
const inventory_model_1 = require("../models/inventory.model"); // Adjust path to your Inventory model
const product_model_1 = __importDefault(require("../models/product.model")); // Adjust path to your Product model
// Haversine formula to calculate distance between two points (in kilometers)
const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
// Controller to search products by user location using latitude and longitude
const getProductsByLocation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get query parameters
        const latitude = parseFloat(req.query.latitude);
        const longitude = parseFloat(req.query.longitude);
        const category = req.query.category;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        // Validate latitude and longitude
        if (isNaN(latitude) || isNaN(longitude)) {
            res.status(400).json({
                success: false,
                message: "Valid latitude and longitude are required",
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
        // Fetch all stores
        const stores = yield store_model_1.Store.find()
            .select("name address phone email latitude longitude radius openingTime")
            .lean();
        if (!stores || stores.length === 0) {
            res.status(404).json({
                success: false,
                message: "No stores found",
            });
            return;
        }
        // Find the nearest store within its radius
        let nearestStore = null;
        let minDistance = Infinity;
        for (const store of stores) {
            const distance = haversineDistance(latitude, longitude, store.latitude, store.longitude);
            console.log("Distance to store:", distance, "km");
            if (distance <= store.radius && distance < minDistance) {
                minDistance = distance;
                nearestStore = store;
            }
        }
        if (!nearestStore) {
            res.status(404).json({
                success: false,
                message: "No stores found within their service radius",
            });
            return;
        }
        // Find inventory for the nearest store
        const inventory = yield inventory_model_1.Inventory.findOne({ storeId: nearestStore._id })
            .populate({
            path: "products.productId",
            select: "name description unit price actualPrice category origin shelfLife image",
            match: category ? { category } : {}, // Filter by category if provided
        })
            .lean();
        if (!inventory) {
            res.status(404).json({
                success: false,
                message: "No inventory found for the nearest store",
            });
            return;
        }
        // Filter available products and paginate
        const availableProducts = inventory.products
            .filter((product) => product.availability && product.productId) // Only available products with valid productId
            .map((product) => ({
            productId: product.productId._id,
            quantity: product.quantity,
            threshold: product.threshold,
            availability: product.availability,
            details: {
                name: product.productId.name,
                description: product.productId.description,
                unit: product.productId.unit,
                price: product.productId.price,
                actualPrice: product.productId.actualPrice,
                category: product.productId.category,
                origin: product.productId.origin,
                shelfLife: product.productId.shelfLife,
                image: product.productId.image,
            },
        }));
        // caluclate a avg delivery time based on distance
        const deliveryTime = Math.round(minDistance * 5); // Assuming 1 km takes 5 minutes to deliver
        // Paginate results
        const totalProducts = availableProducts.length;
        const startIndex = (page - 1) * limit;
        const paginatedProducts = availableProducts.slice(startIndex, startIndex + limit);
        // Return response
        res.status(200).json({
            success: true,
            message: "Products retrieved successfully from nearest store",
            data: {
                store: {
                    _id: nearestStore._id,
                    name: nearestStore.name,
                    address: nearestStore.address,
                    phone: nearestStore.name,
                    email: nearestStore.email,
                    latitude: nearestStore.latitude,
                    longitude: nearestStore.longitude,
                    radius: nearestStore.radius,
                    openingTime: nearestStore.openingTime,
                },
                products: paginatedProducts,
                deliveryTime: `${deliveryTime} minutes`,
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
        console.error("Error searching products by location:", error);
        res.status(500).json({
            success: false,
            message: "Server error while searching products",
            error: error.message,
        });
    }
});
exports.getProductsByLocation = getProductsByLocation;
const getStoreDetailsWithLatlong = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get query parameters
        const latitude = parseFloat(req.query.latitude);
        const longitude = parseFloat(req.query.longitude);
        // Validate latitude and longitude
        if (isNaN(latitude) || isNaN(longitude)) {
            res.status(400).json({
                success: false,
                message: "Valid latitude and longitude are required",
            });
            return;
        }
        // Fetch all stores
        const stores = yield store_model_1.Store.find()
            .select("name address phone email latitude longitude radius openingTime")
            .lean();
        if (!stores || stores.length === 0) {
            res.status(404).json({
                success: false,
                message: "No stores found",
            });
            return;
        }
        // Find the nearest store within its radius
        let nearestStore = null;
        let minDistance = Infinity;
        for (const store of stores) {
            const distance = haversineDistance(latitude, longitude, store.latitude, store.longitude);
            console.log(`Distance to store ${store.name}: ${distance} km`);
            if (distance <= store.radius && distance < minDistance) {
                minDistance = distance;
                nearestStore = store;
            }
        }
        if (!nearestStore) {
            res.status(404).json({
                success: false,
                message: "No stores found within their service radius",
            });
            return;
        }
        // Calculate average delivery time based on distance (assuming 5 minutes per km)
        const deliveryTime = Math.round(minDistance * 5);
        // Return response with store details
        res.status(200).json({
            success: true,
            message: "Nearest store details retrieved successfully",
            data: {
                store: {
                    _id: nearestStore._id,
                    name: nearestStore.name,
                    address: nearestStore.address,
                    phone: nearestStore.phone,
                    email: nearestStore.email,
                    latitude: nearestStore.latitude,
                    longitude: nearestStore.longitude,
                    radius: nearestStore.radius,
                    openingTime: nearestStore.openingTime,
                },
                deliveryTime: `${deliveryTime} minutes`,
                distance: minDistance.toFixed(2), // Distance in kilometers
            },
        });
    }
    catch (error) {
        console.error("Error fetching store details by location:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching store details",
            error: error.message,
        });
    }
});
exports.getStoreDetailsWithLatlong = getStoreDetailsWithLatlong;
// Controller to get  products by store ID without pagination
const getAllProductsWithAvailability = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Get query parameters
        const latitude = parseFloat(req.query.latitude);
        const longitude = parseFloat(req.query.longitude);
        // Validate latitude and longitude
        if (isNaN(latitude) || isNaN(longitude)) {
            res.status(400).json({
                success: false,
                message: "Valid latitude and longitude are required",
            });
            return;
        }
        // Fetch all stores
        const stores = yield store_model_1.Store.find()
            .select("name latitude longitude radius")
            .lean();
        if (!stores || stores.length === 0) {
            res.status(404).json({
                success: false,
                message: "No stores found",
            });
            return;
        }
        // Find the nearest store within its radius
        let nearestStore = null;
        let minDistance = Infinity;
        for (const store of stores) {
            const distance = haversineDistance(latitude, longitude, store.latitude, store.longitude);
            if (distance <= store.radius && distance < minDistance) {
                minDistance = distance;
                nearestStore = store;
            }
        }
        if (!nearestStore) {
            res.status(404).json({
                success: false,
                message: "No stores found within their service radius",
            });
            return;
        }
        // Fetch inventory for the nearest store
        const inventory = yield inventory_model_1.Inventory.findOne({ storeId: nearestStore._id })
            .select("products.productId products.availability")
            .lean();
        // Create a map of available product IDs
        const availableProductIds = new Set(((_a = inventory === null || inventory === void 0 ? void 0 : inventory.products) === null || _a === void 0 ? void 0 : _a.filter((product) => product.availability).map((product) => product.productId.toString())) || []);
        // Fetch all products with pagination
        const products = yield product_model_1.default.find()
            .select("name description unit price actualPrice category origin shelfLife image")
            .lean();
        const totalProducts = yield product_model_1.default.countDocuments();
        // Format products with availability
        const formattedProducts = products.map((product) => ({
            _id: product._id,
            name: product.name,
            description: product.description,
            unit: product.unit,
            price: product.price,
            actualPrice: product.actualPrice,
            category: product.category,
            origin: product.origin,
            shelfLife: product.shelfLife,
            image: product.image,
            availability: availableProductIds.has(product._id.toString()),
        }));
        // Return response
        res.status(200).json({
            success: true,
            message: "Products retrieved successfully with availability",
            data: {
                store: {
                    _id: nearestStore._id,
                    name: nearestStore.name,
                    latitude: nearestStore.latitude,
                    longitude: nearestStore.longitude,
                    radius: nearestStore.radius,
                },
                products: formattedProducts,
            },
        });
    }
    catch (error) {
        console.error("Error fetching products with availability:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching products",
            error: error.message,
        });
    }
});
exports.getAllProductsWithAvailability = getAllProductsWithAvailability;
const getAvailableProductsWithCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const category = req.query.category; // Get category from query parameters
        const latitude = parseFloat(req.query.latitude);
        const longitude = parseFloat(req.query.longitude);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        // Validate latitude and longitude
        if (isNaN(latitude) || isNaN(longitude)) {
            res.status(400).json({
                success: false,
                message: "Valid latitude and longitude are required",
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
        // Validate category if provided
        if (category && !category.trim()) {
            res.status(400).json({
                success: false,
                message: "Category cannot be empty",
            });
            return;
        }
        // Fetch all stores
        const stores = yield store_model_1.Store.find()
            .select("name address phone email latitude longitude radius openingTime")
            .lean();
        if (!stores || stores.length === 0) {
            res.status(404).json({
                success: false,
                message: "No stores found",
            });
            return;
        }
        // Find the nearest store within its radius
        let nearestStore = null;
        let minDistance = Infinity;
        for (const store of stores) {
            const distance = haversineDistance(latitude, longitude, store.latitude, store.longitude);
            if (distance <= store.radius && distance < minDistance) {
                minDistance = distance;
                nearestStore = store;
            }
        }
        if (!nearestStore) {
            res.status(404).json({
                success: false,
                message: "No stores found within their service radius",
            });
            return;
        }
        // Prepare case-insensitive regex for category
        const categoryRegex = category ? new RegExp(escapeRegex(category), "i") : undefined;
        // Log the regex for debugging
        console.log("Category regex:", categoryRegex === null || categoryRegex === void 0 ? void 0 : categoryRegex.toString());
        // Find inventory for the nearest store
        const inventory = yield inventory_model_1.Inventory.findOne({ storeId: nearestStore._id })
            .populate({
            path: "products.productId",
            select: "name description unit price actualPrice category origin shelfLife image",
            match: categoryRegex ? { category: { $regex: categoryRegex } } : {}, // Filter by category (case-insensitive)
        })
            .lean();
        // Log populated products for debugging
        console.log("Populated products:", ((_a = inventory === null || inventory === void 0 ? void 0 : inventory.products) === null || _a === void 0 ? void 0 : _a.length) || 0);
        if (!inventory) {
            res.status(404).json({
                success: false,
                message: "No inventory found for the nearest store",
            });
            return;
        }
        // Filter available products and paginate
        const availableProducts = inventory.products
            .filter((product) => product.availability && product.productId) // Only available products with valid productId
            .map((product) => ({
            productId: product.productId._id,
            quantity: product.quantity,
            threshold: product.threshold,
            availability: product.availability,
            details: {
                name: product.productId.name,
                description: product.productId.description,
                unit: product.productId.unit,
                price: product.productId.price,
                actualPrice: product.productId.actualPrice,
                category: product.productId.category,
                origin: product.productId.origin,
                shelfLife: product.productId.shelfLife,
                image: product.productId.image,
            },
        }));
        // Paginate results
        const totalProducts = availableProducts.length;
        const startIndex = (page - 1) * limit;
        const paginatedProducts = availableProducts.slice(startIndex, startIndex + limit);
        // Return response
        res.status(200).json({
            success: true,
            message: "Available products retrieved successfully",
            data: {
                store: {
                    _id: nearestStore._id,
                    name: nearestStore.name,
                    address: nearestStore.address,
                    phone: nearestStore.phone,
                    email: nearestStore.email,
                    latitude: nearestStore.latitude,
                    longitude: nearestStore.longitude,
                    radius: nearestStore.radius,
                    openingTime: nearestStore.openingTime,
                },
                products: paginatedProducts,
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
        console.error("Error fetching products by category:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching products by category",
            error: error.message,
        });
    }
});
exports.getAvailableProductsWithCategory = getAvailableProductsWithCategory;
// Escape special regex characters
const escapeRegex = (text) => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
