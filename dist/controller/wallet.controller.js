"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.generateReferralCode = exports.applyReferralCode = exports.getWallet = void 0;
const wallet_model_1 = require("../models/wallet.model");
const mongoose_1 = __importStar(require("mongoose"));
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
// Configuration constants
const REFERRAL_BONUS = 50;
const REFERRAL_DESCRIPTION = "Referral bonus";
// Enums
var TransactionType;
(function (TransactionType) {
    TransactionType["CREDIT"] = "credit";
    TransactionType["DEBIT"] = "debit";
})(TransactionType || (TransactionType = {}));
// Apply referral code
const applyReferralCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, referralCode } = req.body;
        // Validate userId
        if (!mongoose_1.default.isValidObjectId(userId)) {
            res.status(400).json({
                message: "Invalid user ID",
                statusCode: 400,
            });
            return;
        }
        // Find referee user
        const refereeUser = yield user_model_1.default.findById(userId);
        if (!refereeUser) {
            res.status(404).json({
                message: "User not found",
                statusCode: 404,
            });
            return;
        }
        // Check if user has already used a referral code
        if (refereeUser.referredBy) {
            res.status(400).json({
                message: "User has already used a referral code",
                statusCode: 400,
            });
            return;
        }
        // Find referrer user
        const referrerUser = yield user_model_1.default.findOne({ referralCode });
        if (!referrerUser) {
            res.status(404).json({
                message: "Invalid referral code",
                statusCode: 404,
            });
            return;
        }
        // Prevent self-referral
        if (referrerUser._id.toString() === userId) {
            res.status(400).json({
                message: "Cannot use own referral code",
                statusCode: 400,
            });
            return;
        }
        // Start transaction
        const session = yield mongoose_1.default.startSession();
        session.startTransaction();
        try {
            // Get or create referee's wallet
            let refereeWallet = yield wallet_model_1.UserWallet.findOne({ userId }).session(session);
            if (!refereeWallet) {
                const createdWallets = yield wallet_model_1.UserWallet.create([{
                        userId: new mongoose_1.Types.ObjectId(userId),
                        current_amount: 0,
                        transaction_history: []
                    }], { session });
                refereeWallet = createdWallets[0];
            }
            // Get or create referrer's wallet
            let referrerWallet = yield wallet_model_1.UserWallet.findOne({ userId: referrerUser._id }).session(session);
            if (!referrerWallet) {
                const createdWallets = yield wallet_model_1.UserWallet.create([{
                        userId: referrerUser._id,
                        current_amount: 0,
                        transaction_history: []
                    }], { session });
                referrerWallet = createdWallets[0];
            }
            // Create transactions
            const refereeTransaction = {
                transactionId: new mongoose_1.Types.ObjectId(),
                amount: REFERRAL_BONUS,
                type: TransactionType.CREDIT,
                date: new Date(),
                description: `${REFERRAL_DESCRIPTION} from ${referrerUser.name}`
            };
            const referrerTransaction = {
                transactionId: new mongoose_1.Types.ObjectId(),
                amount: REFERRAL_BONUS,
                type: TransactionType.CREDIT,
                date: new Date(),
                description: `${REFERRAL_DESCRIPTION} for referring ${refereeUser.name}`
            };
            // Update wallets
            yield wallet_model_1.UserWallet.updateOne({ userId }, {
                $inc: { current_amount: REFERRAL_BONUS },
                $push: { transaction_history: refereeTransaction }
            }, { session });
            yield wallet_model_1.UserWallet.updateOne({ userId: referrerUser._id }, {
                $inc: { current_amount: REFERRAL_BONUS },
                $push: { transaction_history: referrerTransaction }
            }, { session });
            // Update referee's referredBy field
            yield user_model_1.default.updateOne({ _id: userId }, { $set: { referredBy: referrerUser.referralCode } }, { session });
            // Commit transaction
            yield session.commitTransaction();
            res.status(200).json({
                message: "Referral applied successfully",
                statusCode: 200,
                data: {
                    refereeBonus: REFERRAL_BONUS,
                    referrerBonus: REFERRAL_BONUS,
                    transactionId: refereeTransaction.transactionId
                }
            });
        }
        catch (error) {
            yield session.abortTransaction();
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    catch (error) {
        res.status(500).json({
            message: "Internal server error",
            statusCode: 500,
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
});
exports.applyReferralCode = applyReferralCode;
// Generate referral code
const generateReferralCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.body;
        // Validate userId
        if (!mongoose_1.default.isValidObjectId(userId)) {
            res.status(400).json({
                message: "Invalid user ID",
                statusCode: 400,
            });
            return;
        }
        const user = yield user_model_1.default.findById(userId);
        if (!user) {
            res.status(404).json({
                message: "User not found",
                statusCode: 404,
            });
            return;
        }
        // Check if user already has a referral code
        if (user.referralCode) {
            res.status(200).json({
                message: "User already has a referral code",
                statusCode: 200,
                data: { referralCode: user.referralCode }
            });
            return;
        }
        // Generate unique referral code
        const generateCode = () => {
            return Math.random().toString(36).substring(2, 8).toUpperCase();
        };
        let referralCode = generateCode();
        let existingUser = yield user_model_1.default.findOne({ referralCode });
        while (existingUser) {
            referralCode = generateCode();
            existingUser = yield user_model_1.default.findOne({ referralCode });
        }
        // Update user with referral code
        yield user_model_1.default.updateOne({ _id: userId }, { $set: { referralCode } });
        res.status(200).json({
            message: "Referral code generated successfully",
            statusCode: 200,
            data: { referralCode }
        });
    }
    catch (error) {
        res.status(500).json({
            message: "Internal server error",
            statusCode: 500,
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
});
exports.generateReferralCode = generateReferralCode;
