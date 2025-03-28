import Order from "../models/order.model";
import { Request, Response } from "express";
import { IOrder, OrderStatus, PaymentStatus } from "../types/interface/interface";
import mongoose from "mongoose";
import Product from "../models/product.model";
import User from "../models/user.model";
import { ErrorResponse, SuccessResponse } from "../types/types/types";
import Invoice from "../models/invoice.model";
export const createOrder = async (req: Request, res: Response) => {
    try {
        const {
            userId,
            products,
            isCashOnDelivery,
            deliveryAddress,
            phone,
        } = req.body;

        

        // Validate required fields
        if (!userId || !products  || !deliveryAddress || !phone) {
            const errorResponse: ErrorResponse = {
                message: "Missing required fields",
                statusCode: 400,
                error: "Bad Request",
            }
             res.status(400).json(errorResponse);
            return 
        }
        if(phone.length !== 10){
            const errorResponse: ErrorResponse = {
                message: "Invalid phone number",
                statusCode: 400,
                error: "Bad Request",
            }
             res.status(400).json(errorResponse);
            return
        }

        // Generate unique orderId
        const orderId = `ORD-${new Date().getTime()}`;

        // Start a transaction session
        const session = await mongoose.startSession();
        session.startTransaction();
        var totalAmount: number = 0;
        var  totalItems : number = 0;
        try {
            // Update product stock
            for (const item of products) {
                const product = await Product.findById(item.productId).session(session);
                if (!product) throw new Error(`Product not found: ${item.productId}`);
                if(product.isAvailable === false) throw new Error(`Product is not available: ${product.name}`);
                if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);
                product.stock -= item.quantity;
                totalAmount += product.price * item.quantity;
                totalItems += item.quantity;
                if(product.stock <= product.threshold){
                    product.isAvailable = false;
                
                }
                
                await product.save({ session });
            }
            const invoiceId = `INV-${orderId}`;  

            // Create new order
            const orderDate =  new Date() ;
            const newOrder = new Order({
                orderId,
                userId: userId,
                products,
                orderDate,
                expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Current date + 2 days
                totalAmount,
                totalItems,
                status: OrderStatus.Placed, 
                isCashOnDelivery,
                deliveryAddress,
                invoiceId: invoiceId , // Example invoice ID
                paymentStatus: isCashOnDelivery ? PaymentStatus.Pending : PaymentStatus.Paid,
                rzpOrderId: isCashOnDelivery ? undefined : "",
                rzpPaymentId: isCashOnDelivery ? undefined : "",
            });

            await newOrder.save({ session });

            // Update user order history
            const user = await User.findById(userId).session(session);
            if (!user) throw new Error("User not found");
            user.orders = user.orders || [];
            user.orders.push(newOrder.orderId);
            await user.save({ session });

            // Commit transaction
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
                billingAddress: deliveryAddress, // Assuming deliveryAddress as billing
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
            };
            // Create invoice
            const newInvoice = new Invoice(invoiceData);
            await newInvoice.save({ session });
            
            await session.commitTransaction();
            session.endSession();
            

            const successResponse: SuccessResponse = {
                statusCode: 201,
                message: "Order created successfully",
                data: newOrder,
            }
             res.status(201).json(
                successResponse
             );
             return
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    } catch (error: any) {
        console.error("Error creating order:", error);
         res.status(500).json({
            message: error.message,
            statusCode: 500,
            res : `Creation of order failed due to ${error.message}`
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