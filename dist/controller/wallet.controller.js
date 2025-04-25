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
exports.getWallet = void 0;
const wallet_model_1 = require("../models/wallet.model");
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = __importDefault(require("../models/user.model"));
const getWallet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.query.userId; // Assuming userId is passed as a query parameter
        if (mongoose_1.default.isValidObjectId(userId) === false) {
            res.status(400).json({
                message: "Invalid user ID",
                statusCode: 400,
            });
            return;
        }
        // Find the user's wallet
        const wallet = yield wallet_model_1.UserWallet.findOne({ userId }).populate("transaction_history.transactionId", "amount type date description").sort({ date: -1 });
        if (!wallet) {
            // create new wallet if not found
            const user = yield user_model_1.default.findById(userId);
            if (!user) {
                res.status(404).json({
                    message: "User not found",
                    statusCode: 404,
                });
                return;
            }
            const newWallet = yield wallet_model_1.UserWallet.create({ userId });
            res.status(201).json({
                message: "New wallet created successfully",
                statusCode: 201,
                data: newWallet,
            });
            return;
        }
        res.status(200).json({
            message: "Wallet retrieved successfully",
            statusCode: 200,
            data: wallet,
        });
        return;
    }
    catch (error) {
        res.status(500).json({
            message: "Internal server error",
            statusCode: 500,
            error: error.message,
        });
        return;
    }
});
exports.getWallet = getWallet;
