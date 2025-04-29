import { UserWallet } from "../models/wallet.model";
import mongoose, { Types } from "mongoose";
import { Request, Response } from "express";
import User from "../models/user.model";

export const getWallet = async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string; // Assuming userId is passed as a query parameter
    if(mongoose.isValidObjectId(userId) === false) {
         res.status(400).json({
            message: "Invalid user ID",
            statusCode: 400,
        });
        return

    }
        // Find the user's wallet
        const wallet = await UserWallet.findOne({ userId }).populate("transaction_history.transactionId","amount type date description", ).sort({ date: -1 }); 
    
        if (!wallet) {
         // create new wallet if not found
         const user  = await User.findById(userId);
            if(!user) {
                res.status(404).json({
                    message: "User not found",
                    statusCode: 404,
                });
                return
            }
            const newWallet = await UserWallet.create({ userId });
             res.status(201).json({
                message: "New wallet created successfully",
                statusCode: 201,
                data: newWallet,
            });return
        }
    
         res.status(200).json({
        message: "Wallet retrieved successfully",
        statusCode: 200,
        data: wallet,
        });
        return; 
    } catch (error:any) {
         res.status(500).json({
        message: "Internal server error",
        statusCode: 500,
        error: error.message,
        });
        return
    }
}

// Configuration constants
const REFERRAL_BONUS = 50;
const REFERRAL_DESCRIPTION = "Referral bonus";

// Enums
enum TransactionType {
  CREDIT = "credit",
  DEBIT = "debit"
}

// Interfaces
interface Transaction {
  transactionId: Types.ObjectId;
  amount: number;
  type: TransactionType;
  date: Date;
  description: string;
}

interface ReferralRequestBody {
  userId: string;
  referralCode: string;
}

interface GenerateReferralRequestBody {
  userId: string;
}

interface ApiResponse<T> {
  message: string;
  statusCode: number;
  data?: T;
  error?: string;
}

// Apply referral code
export const applyReferralCode = async (
  req: Request<{}, {}, ReferralRequestBody>,
  res: Response<ApiResponse<{ refereeBonus: number; referrerBonus: number; transactionId: Types.ObjectId }>>
): Promise<void> => {
  try {
    const { userId, referralCode } = req.body;

    // Validate userId
    if (!mongoose.isValidObjectId(userId)) {
      res.status(400).json({
        message: "Invalid user ID",
        statusCode: 400,
      });
      return;
    }

    // Find referee user
    const refereeUser = await User.findById(userId);
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
    const referrerUser = await User.findOne({ referralCode });
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get or create referee's wallet
      let refereeWallet = await UserWallet.findOne({ userId }).session(session);
      if (!refereeWallet) {
        const createdWallets = await UserWallet.create([{
          userId: new Types.ObjectId(userId),
          current_amount: 0,
          transaction_history: []
        }], { session });
        refereeWallet = createdWallets[0];
      }

      // Get or create referrer's wallet
      let referrerWallet = await UserWallet.findOne({ userId: referrerUser._id }).session(session);
      if (!referrerWallet) {
        const createdWallets = await UserWallet.create([{
          userId: referrerUser._id,
          current_amount: 0,
          transaction_history: []
        }], { session });
        referrerWallet = createdWallets[0];
      }

      // Create transactions
      const refereeTransaction: Transaction = {
        transactionId: new Types.ObjectId(),
        amount: REFERRAL_BONUS,
        type: TransactionType.CREDIT,
        date: new Date(),
        description: `${REFERRAL_DESCRIPTION} from ${referrerUser.name}`
      };

      const referrerTransaction: Transaction = {
        transactionId: new Types.ObjectId(),
        amount: REFERRAL_BONUS,
        type: TransactionType.CREDIT,
        date: new Date(),
        description: `${REFERRAL_DESCRIPTION} for referring ${refereeUser.name}`
      };

      // Update wallets
      await UserWallet.updateOne(
        { userId },
        {
          $inc: { current_amount: REFERRAL_BONUS },
          $push: { transaction_history: refereeTransaction }
        },
        { session }
      );

      await UserWallet.updateOne(
        { userId: referrerUser._id },
        {
          $inc: { current_amount: REFERRAL_BONUS },
          $push: { transaction_history: referrerTransaction }
        },
        { session }
      );

      // Update referee's referredBy field
      await User.updateOne(
        { _id: userId },
        { $set: { referredBy: referrerUser.referralCode } },
        { session }
      );

      // Commit transaction
      await session.commitTransaction();

      res.status(200).json({
        message: "Referral applied successfully",
        statusCode: 200,
        data: {
          refereeBonus: REFERRAL_BONUS,
          referrerBonus: REFERRAL_BONUS,
          transactionId: refereeTransaction.transactionId
        }
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error: unknown) {
    res.status(500).json({
      message: "Internal server error",
      statusCode: 500,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Generate referral code
export const generateReferralCode = async (
  req: Request<{}, {}, GenerateReferralRequestBody>,
  res: Response<ApiResponse<{ referralCode: string }>>
): Promise<void> => {
  try {
    const { userId } = req.body;

    // Validate userId
    if (!mongoose.isValidObjectId(userId)) {
      res.status(400).json({
        message: "Invalid user ID",
        statusCode: 400,
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        message: "User not found",
        statusCode: 404,
      });
      return;
    }

    // Check if user already has a referral code
    if (user.referralCode) {
      res.status(400).json({
        message: "User already has a referral code",
        statusCode: 400,
        data: { referralCode: user.referralCode }
      });
      return;
    }

    // Generate unique referral code
    const generateCode = (): string => {
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    let referralCode = generateCode();
    let existingUser = await User.findOne({ referralCode });

    while (existingUser) {
      referralCode = generateCode();
      existingUser = await User.findOne({ referralCode });
    }

    // Update user with referral code
    await User.updateOne(
      { _id: userId },
      { $set: { referralCode } }
    );

    res.status(200).json({
      message: "Referral code generated successfully",
      statusCode: 200,
      data: { referralCode }
    });
  } catch (error: unknown) {
    res.status(500).json({
      message: "Internal server error",
      statusCode: 500,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};