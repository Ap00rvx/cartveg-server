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
exports.removefromcart = exports.addToCart = exports.getUserCart = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const cart_model_1 = __importDefault(require("../models/cart.model"));
const product_model_1 = __importDefault(require("../models/product.model"));
const getUserCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userEmail = (_a = req.user) === null || _a === void 0 ? void 0 : _a.email;
        if (!userEmail) {
            res.status(401).json({ msg: "Unauthorized" });
            return;
        }
        const user = yield user_model_1.default.findOne({ email: userEmail });
        if (!user) {
            res.status(404).json({ msg: "User not found" });
            return;
        }
        const cart = yield cart_model_1.default.findOne({ userId: user._id }).populate("cartItems.productId");
        if (!cart) {
            res.status(200).json({ msg: "Cart is empty", cart: [], totalItems: 0, totalAmount: 0 });
            return;
        }
        const cartItems = cart.cartItems.map((item) => ({
            productId: item.productId._id,
            name: item.productId.name,
            price: item.productId.price,
            quantity: item.quantity,
            image: item.productId.image,
            actualPrice: item.productId.actualPrice,
            totalPrice: item.productId.price * item.quantity
        }));
        res.status(200).json({
            msg: "Cart fetched successfully",
            cart: cartItems,
            totalItems: cart.totalItems,
            totalAmount: cart.totalAmount
        });
    }
    catch (err) {
        const interServerError = {
            message: err.message,
            statusCode: 500,
            stack: err.stack,
        };
        res.status(500).json(interServerError);
    }
});
exports.getUserCart = getUserCart;
const addToCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userEmail = (_a = req.user) === null || _a === void 0 ? void 0 : _a.email;
        if (!userEmail) {
            res.status(401).json({ msg: "Unauthorized" });
            return;
        }
        const user = yield user_model_1.default.findOne({ email: userEmail });
        if (!user) {
            res.status(404).json({ msg: "User not found" });
            return;
        }
        const { productId, quantity } = req.body;
        if (!productId || !quantity) {
            res.status(400).json({ msg: "Product ID and quantity are required" });
            return;
        }
        let cart = yield cart_model_1.default.findOne({ userId: user._id });
        if (!cart) {
            cart = new cart_model_1.default({
                userId: user._id,
                cartItems: [],
                totalAmount: 0,
                totalItems: 0
            });
        }
        const existingItemIndex = cart.cartItems.findIndex((item) => item.productId.toString() === productId);
        if (existingItemIndex > -1) {
            cart.cartItems[existingItemIndex].quantity += quantity;
        }
        else {
            cart.cartItems.push({
                productId,
                quantity
            });
        }
        const product = yield product_model_1.default.findById(productId);
        if (!product) {
            res.status(404).json({ msg: "Product not found" });
            return;
        }
        cart.totalAmount += quantity * product.price; // Assuming Product model is defined and has a price field
        cart.totalItems = cart.cartItems.reduce((acc, item) => acc + item.quantity, 0);
        yield cart.save();
        res.status(200).json({ msg: "Product added to cart successfully", cart });
    }
    catch (err) {
        const interServerError = {
            message: err.message,
            statusCode: 500,
            stack: err.stack,
        };
        res.status(500).json(interServerError);
    }
});
exports.addToCart = addToCart;
const removefromcart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userEmail = (_a = req.user) === null || _a === void 0 ? void 0 : _a.email;
        if (!userEmail) {
            res.status(401).json({ msg: "Unauthorized" });
            return;
        }
        const user = yield user_model_1.default.findOne({ email: userEmail });
        if (!user) {
            res.status(404).json({ msg: "User not found" });
            return;
        }
        const { productId } = req.body;
        if (!productId) {
            res.status(400).json({ msg: "Product ID is required" });
            return;
        }
        const cart = yield cart_model_1.default.findOne({ userId: user._id });
        if (!cart) {
            res.status(404).json({ msg: "Cart not found" });
            return;
        }
        const existingItemIndex = cart.cartItems.findIndex((item) => item.productId.toString() === productId);
        if (existingItemIndex === -1) {
            res.status(404).json({ msg: "Product not found in cart" });
            return;
        }
        const product = yield product_model_1.default.findById(productId);
        if (!product) {
            res.status(404).json({ msg: "Product not found" });
            return;
        }
        cart.totalAmount -= cart.cartItems[existingItemIndex].quantity * product.price;
        cart.cartItems.splice(existingItemIndex, 1);
        cart.totalItems = cart.cartItems.reduce((acc, item) => acc + item.quantity, 0);
        yield cart.save();
        res.status(200).json({ msg: "Product removed from cart successfully", cart });
    }
    catch (err) {
        const interServerError = {
            message: err.message,
            statusCode: 500,
            stack: err.stack,
        };
        res.status(500).json(interServerError);
    }
});
exports.removefromcart = removefromcart;
