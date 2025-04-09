import Order from "../models/order.model";
import { Request, Response } from "express";
import { IOrder, OrderStatus, PaymentStatus } from "../types/interface/interface";
import mongoose from "mongoose";
import Product from "../models/product.model";
import User from "../models/user.model";
import { ErrorResponse, InterServerError, SuccessResponse } from "../types/types/types";
import Invoice from "../models/invoice.model";
import Coupon from "../models/coupon.model";
export const createOrder = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      products,
      isCashOnDelivery,
      deliveryAddress,
      phone,
      shippingAmount,
      appliedCoupon, // Optional field
    } = req.body;

    // Validate required fields
    if (!userId || !products || !deliveryAddress || !phone || !shippingAmount) {
      const errorResponse: ErrorResponse = {
        message: "Missing required fields",
        statusCode: 400,
        error: "Bad Request",
      };
      res.status(400).json(errorResponse);
      return;
    }
    if (phone.length !== 10) {
      const errorResponse: ErrorResponse = {
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
    const session = await mongoose.startSession();
    session.startTransaction();

    let totalAmount: number = 0;
    let totalItems: number = 0;
    let discountAmount: number = 0;
    let coupon: any = null;

    try {
      // Update product stock and calculate subtotal
      for (const item of products) {
        const product = await Product.findById(item.productId).session(session);
        if (!product) throw new Error(`Product not found: ${item.productId}`);
        if (product.isAvailable === false) throw new Error(`Product is not available: ${product.name}`);
        if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);
        product.stock -= item.quantity;
        totalAmount += product.price * item.quantity;
        totalItems += item.quantity;
        if (product.stock <= product.threshold) {
          product.isAvailable = false;
        }
        await product.save({ session });
      }

      // Handle appliedCoupon if provided
      if (appliedCoupon) {
        const { couponId, code, discountAmount: appliedDiscount } = appliedCoupon;
        if (!couponId || !code || appliedDiscount === undefined) {
          throw new Error("Invalid coupon data: couponId, code, and discountAmount are required if appliedCoupon is provided");
        }
        // Here you might want to validate the coupon (e.g., check if it exists and is valid)
        // For simplicity, assuming it's valid if provided
        coupon = await Coupon.findOne({
          couponCode: code, 
          id: couponId,
        }).session(session);  

        if(!coupon){
          throw new Error(`Coupon not found: ${code}`);
        }

        discountAmount = appliedDiscount;
        totalAmount -= discountAmount; // Apply discount to total
        if (totalAmount < 0) totalAmount = 0; // Ensure total doesn't go negative
      }

      const invoiceId = `INV-${orderId}`;
      totalAmount += shippingAmount; // Add shipping after discount

      // Create new order
      const orderDate = new Date();
      const newOrder = new Order({
        orderId,
        userId: userId,
        products,
        orderDate,
        expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Current date + 2 days
        totalAmount,
        shippingAmount,
        totalItems,
        status: OrderStatus.Placed,
        isCashOnDelivery,
        deliveryAddress,
        invoiceId: invoiceId,
        paymentStatus: isCashOnDelivery ? PaymentStatus.Pending : PaymentStatus.Paid,
        rzpOrderId: isCashOnDelivery ? undefined : "",
        rzpPaymentId: isCashOnDelivery ? undefined : "",
        appliedCoupon: appliedCoupon ? {
          couponId: appliedCoupon.couponId,
          code: appliedCoupon.code,
          discountAmount: discountAmount,
        } : undefined, // Include appliedCoupon only if provided
      });

      await newOrder.save({ session });

      // Update user order history
      const user = await User.findById(userId).session(session);
      if (!user) throw new Error("User not found");
      user.orders = user.orders || [];
      user.orders.push(newOrder.orderId);
      await user.save({ session });

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
        paymentStatus: isCashOnDelivery ? PaymentStatus.Pending : PaymentStatus.Paid,
        billingAddress: deliveryAddress,
        shippingAddress: deliveryAddress,
        orderDate,
        items: await Promise.all(
          products.map(async (product: any) => {
            const productDetails = await Product.findById(product.productId).select("name price").lean();
            return {
              name: productDetails?.name || "Unknown Product",
              quantity: product.quantity,
              price: productDetails?.price || 0,
            };
          })
        ),
        paymentMode: isCashOnDelivery ? "Cash on Delivery" : "Online Payment",
        discountAmount: discountAmount > 0 ? discountAmount : undefined, // Include discount in invoice if applied
      };

      const newInvoice = new Invoice(invoiceData);
      await newInvoice.save({ session });

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      const successResponse: SuccessResponse = {
        statusCode: 201,
        message: "Order created successfully",
        data: newOrder,
      };
      res.status(201).json(successResponse);
      return;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      
      // If a coupon was applied, remove the user from the coupon's usedUsers array
      if (appliedCoupon && coupon) {
        try {
          await Coupon.updateOne(
            { _id: appliedCoupon.couponId },
            { $pull: { usedUsers: userId } }
          );
          console.log(`Removed user ${userId} from coupon ${appliedCoupon.code} usedUsers list due to order failure`);
        } catch (couponError) {
          console.error("Error removing user from coupon usedUsers:", couponError);
        }
      }
      
      throw error;
    }
  } catch (error: any) {
    console.error("Error creating order:", error);
    res.status(500).json({
      message: error.message,
      statusCode: 500,
      res: `Creation of order failed due to ${error.message} && Removed user from coupon  usedUsers list due to order failure`,
    });
  }
};
export const getUserOrders = async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            const errorResponse: ErrorResponse = {
                message: "Missing required fields",
                statusCode: 400,
                error: "Bad Request",
            }
             res.status(400).json(errorResponse);
            return 
        }
        const orders = await Order.find({ userId }).sort({ orderDate: -1 }).populate({
            path: "products.productId", // Populate product details inside the array
            model: "Product", // Ensure it's referring to the correct model
            select: "name price image category", // Select relevant fields
        });
        const successResponse: SuccessResponse = {
            statusCode: 200,
            message: "User orders fetched successfully",
            data: orders,
        }
         res.status(200).json(successResponse);
    } catch (error: any) {
        console.error("Error fetching user orders:", error);
         res.status(500).json({
            message: error.message,
            statusCode: 500,
            res : `Fetching of user orders failed due to ${error.message}`
         });
    }
}
export const getOrderById = async (req: Request, res: Response) => {
    try {
        const orderId = req.query.orderId;
        if (!orderId) {
            const errorResponse: ErrorResponse = {
                message: "Missing required fields",
                statusCode: 400,
                error: "Bad Request",
            }
             res.status(400).json(errorResponse);
            return 
        }
        const order = await Order.findOne({ orderId });
        if (!order) {
            const errorResponse: ErrorResponse = {
                message: "Order not found",
                statusCode: 404,
                error: "Not Found",
            }
             res.status(404).json(errorResponse);
            return 
        }
        const successResponse: SuccessResponse = {
            statusCode: 200,
            message: "Order fetched successfully",
            data: order,
        }
         res.status(200).json(successResponse);
    } catch (error: any) {
        console.error("Error fetching order:", error);
         res.status(500).json({
            message: error.message,
            statusCode: 500,
            res : `Fetching of order failed due to ${error.message}`
         });
    }
}
export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
    // Start a MongoDB session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      const { orderId } = req.body;
      if (!orderId) {
        const errorResponse: ErrorResponse = {
          message: "Missing required fields",
          statusCode: 400,
          error: "Bad Request",
        };
        res.status(400).json(errorResponse);
        return;
      }
  
      const order = await Order.findOne({ orderId }).session(session);
      if (!order) {
        const errorResponse: ErrorResponse = {
          message: "Order not found",
          statusCode: 404,
          error: "Not Found",
        };
        res.status(404).json(errorResponse);
        await session.abortTransaction();
        session.endSession();
        return;
      }
  
      if (order.status === OrderStatus.Cancelled) {
        const errorResponse: ErrorResponse = {
          message: "Order already cancelled",
          statusCode: 400,
          error: "Bad Request",
        };
        res.status(400).json(errorResponse);
        await session.abortTransaction();
        session.endSession();
        return;
      }
  
      // Restore product stock for each product in the order
      const products = order.products;
      for (const item of products) {
        const product = await Product.findById(item.productId).session(session);
        if (!product) {
          const errorResponse: ErrorResponse = {
            message: `Product with ID ${item.productId} not found`,
            statusCode: 404,
            error: "Not Found",
          };
          res.status(404).json(errorResponse);
          await session.abortTransaction();
          session.endSession();
          return;
        }
  
        // Increase the stock by the quantity that was ordered
        product.stock += item.quantity;
        await product.save({ session });
      }
  
      // Update order status to cancelled
      order.status = OrderStatus.Cancelled;
      
      // If payment was already made and not COD, mark for refund or track refund status
      if (!order.isCashOnDelivery && order.paymentStatus === PaymentStatus.Paid) {
        order.paymentStatus = PaymentStatus.Refund;
        // Additional refund logic could be implemented here
      }
  
      await order.save({ session });
  
      // Commit the transaction
      await session.commitTransaction();
      session.endSession();
  
      // Send success response
      const successResponse = {
        message: "Order cancelled successfully",
        statusCode: 200,
        orderId: order.orderId,
        refundStatus: order.paymentStatus === PaymentStatus.Refund ? "Pending" : "Not Applicable"
      };
      
      res.status(200).json(successResponse);
  
    } catch (err: any) {
      // Abort the transaction in case of any error
      await session.abortTransaction();
      session.endSession();
  
      const internalServerErrorResponse: InterServerError = {
        message: "Internal Server Error",
        statusCode: 500,
        stack: err.stack
      };
      res.status(500).send(internalServerErrorResponse);
    }
  };