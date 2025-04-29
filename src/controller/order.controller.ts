import { Request, Response } from "express";
import mongoose from "mongoose";
import Order from "../models/order.model";
import { Store } from "../models/store.model";
import { Inventory } from "../models/inventory.model";
import Invoice from "../models/invoice.model";
import User from "../models/user.model";
import Coupon from "../models/coupon.model";
import { IOrder, IInvoice, OrderStatus, PaymentStatus } from "../types/interface/interface";
import Product from "../models/product.model";
import ZoneDailyProfitLossModel from "../models/report.models";

// Helper function to calculate total amount and items
interface ProductDetails {
  productId: mongoose.Types.ObjectId;
  quantity: number;
}

const calculateOrderTotals = async (products: ProductDetails[], session: mongoose.ClientSession): Promise<{
  totalAmount: number;
  totalItems: number;
  itemsForInvoice: { name: string; quantity: number; price: number }[];
}> => {
  let totalAmount = 0;
  let totalItems = 0;
  const itemsForInvoice: { name: string; quantity: number; price: number }[] = [];

  for (const item of products) {
    const product = await Product.findById(item.productId).session(session);
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
};

// Order Controller
class OrderController {
  // Create a new order (Transaction-based)
  async createOrder(req: Request, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();
    const {
      userId,
      products,
      storeId,
      isCashOnDelivery,
      deliveryAddress,
      appliedCoupon,
    } = req.body;

    try {
      // Validate required fields
      if (!userId || !products || !products.length || !storeId || !deliveryAddress || isCashOnDelivery === undefined) {
        throw new Error("Missing required fields: userId, products, storeId, deliveryAddress, isCashOnDelivery");
      }

      // Validate userId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid user ID");
      }

      // Fetch user details from User model
      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new Error("User not found");
      }

      // Validate store exists
      const store = await Store.findById(storeId).session(session);
      if (!store) {
        throw new Error("Store not found");
      }

      // Validate inventory
      const inventory = await Inventory.findOne({ storeId }).session(session);
      if (!inventory) {
        throw new Error("Inventory not found for this store");
      }

      for (const item of products) {
        if (!item.productId || !item.quantity || item.quantity < 1) {
          throw new Error("Invalid product details: productId and quantity are required");
        }
        const inventoryProduct = inventory.products.find(
          (p) => p.productId.toString() === item.productId.toString()
        );
        if (!inventoryProduct) {
          throw new Error(`Product ${item.productId} not found in store inventory`);
        }
        if (inventoryProduct.quantity < item.quantity || !inventoryProduct.availability) {
          throw new Error(`Insufficient stock for product ${item.productId}`);
        }
      }

      // Calculate totals
      const { totalAmount, totalItems, itemsForInvoice } = await calculateOrderTotals(products, session);

      // Apply coupon discount if provided
      let discountAmount = 0;
      let coupon = null;
      if (appliedCoupon && appliedCoupon.couponId) {
        coupon = await Coupon.findById(appliedCoupon.couponId).session(session);
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
        await coupon.save({ session });
      }

      // Generate orderId and invoiceId
      const timestamp = Date.now();
      const orderId = `ORD-${timestamp}`;
      const invoiceId = `INV-ORD-${timestamp}`;

      // Create order
      const orderData: Partial<IOrder> = {
        orderId,
        userId: new mongoose.Types.ObjectId(userId),
        products,
        storeId: new mongoose.Types.ObjectId(storeId),
        totalAmount: totalAmount - discountAmount,
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
        status: OrderStatus.Placed,
        paymentStatus: isCashOnDelivery ? PaymentStatus.Pending : PaymentStatus.Pending,
        rzpOrderId: isCashOnDelivery ? undefined : `RZP-${timestamp}`,
        rzpPaymentId: isCashOnDelivery ? undefined : undefined,
        orderDate: new Date(),
        expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      };

      const order = new Order(orderData);
      await order.save({ session });

      // Update user orders
      if (!user.orders) {
        user.orders = [];
      }
      user.orders.push(orderId);
      await user.save({ session });

      // Update inventory
      for (const item of products) {
        const inventoryProduct = inventory.products.find(
          (p) => p.productId.toString() === item.productId.toString()
        );
        if (inventoryProduct) {
          inventoryProduct.quantity -= item.quantity;
          inventoryProduct.availability = inventoryProduct.quantity > 0;
        }
      }
      await inventory.save({ session });

      // Update ZoneDailyProfitLossModel for the order date
      const orderDate= order.orderDate;
      const formattedDate = `${String(orderDate.getDate()).padStart(2, '0')}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getFullYear() % 100).padStart(2, '0')}`;

      console.log("Formatted date:", formattedDate); // Debugging 

      const report = await ZoneDailyProfitLossModel.findOne({
        store_id: order.storeId,
        date: formattedDate,
      }).session(session);
      if (report) {
        report.total_sale_amount += order.totalAmount;
        report.total_orders += 1;
        report.avg_order_value = report.total_sale_amount / report.total_orders;

        // Update most sold product
        const productSales = new Map<string, number>();
        for (const item of products) {
          const productId = item.productId.toString();
          productSales.set(productId, (productSales.get(productId) || 0) + item.quantity);
        }
        let maxQuantity = 0;
        let mostSellingProductId: string | undefined;
        for (const [productId, quantity] of productSales) {
          if (quantity > maxQuantity) {
            maxQuantity = quantity;
            mostSellingProductId = productId;
          }
        }
        if (mostSellingProductId) {
          report.most_selling_product_id = new mongoose.Types.ObjectId(mostSellingProductId).toString();
          report.most_selling_quantity = maxQuantity;
        }
        report.net_profit_or_loss = report.total_sale_amount - report.total_fixed_cost - report.labour_cost - report.packaging_cost;
        report.status = report.net_profit_or_loss >= 0 ? "Profit" : "Loss";

        await report.save({ session });
      } else {
        const newReport = new ZoneDailyProfitLossModel({
          store_id: storeId,
          date: formattedDate,
          total_sale_amount: order.totalAmount,
          total_purchase_cost: 0,
          total_fixed_cost: 0,
          labour_cost: 0,
          packaging_cost: 0,
          net_profit_or_loss: order.totalAmount,
          status: order.totalAmount >= 0 ? "Profit" : "Loss",
          total_orders: 1,
          avg_order_value: order.totalAmount,
          most_selling_product_id: products[0]?.productId,
          most_selling_quantity: products[0]?.quantity || 0,
          created_at: new Date().toISOString(),
        });
        await newReport.save({ session });
      }

      // Create invoice
      const invoiceData: Partial<IInvoice> = {
        invoiceId,
        orderId,
        userDetails: {
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
        totalAmount: totalAmount - discountAmount,
        paymentStatus: isCashOnDelivery ? PaymentStatus.Pending : PaymentStatus.Pending,
        shippingAmount: 50,
        discount: discountAmount,
        billingAddress: deliveryAddress,
        shippingAddress: deliveryAddress,
        orderDate: new Date(),
        items: itemsForInvoice,
        paymentMode: isCashOnDelivery ? "Cash on Delivery" : "Online Payment",
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save({ session });

      await session.commitTransaction();
      res.status(201).json({
        success: true,
        data: { order, invoice },
        message: "Order and invoice created successfully",
      });
    } catch (error: any) {
      // Revert coupon usedUsers if coupon was applied
      if (appliedCoupon && appliedCoupon.couponId) {
        const coupon = await Coupon.findById(appliedCoupon.couponId).session(session);
        if (coupon && coupon.usedUsers.includes(userId)) {
          coupon.usedUsers = coupon.usedUsers.filter((id) => id !== userId);
          await coupon.save({ session });
        }
      }

      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create order",
      });
    } finally {
      session.endSession();
    }
  }

  // Cancel an order (Transaction-based)
  async cancelOrder(req: Request, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { orderId } = req.params;

      // Find order
      const order = await Order.findOne({ orderId }).session(session);
      if (!order) {
        throw new Error("Order not found");
      }

      // Check if order can be canceled
      if (order.status !== OrderStatus.Placed) {
        throw new Error(`Order cannot be canceled in ${order.status} status`);
      }

      // Restore inventory
      const inventory = await Inventory.findOne({ storeId: order.storeId }).session(session);
      if (!inventory) {
        throw new Error("Inventory not found for this store");
      }

      for (const item of order.products) {
        const inventoryProduct = inventory.products.find(
          (p) => p.productId.toString() === item.productId.toString()
        );
        if (inventoryProduct) {
          inventoryProduct.quantity += item.quantity;
          inventoryProduct.availability = inventoryProduct.quantity > 0;
        } else {
          throw new Error(`Product ${item.productId} not found in inventory`);
        }
      }
      await inventory.save({ session });

      // Update order status
      order.status = OrderStatus.Cancelled;
      order.paymentStatus = PaymentStatus.Cancelled;
      await order.save({ session });

      // Update invoice
      const invoice = await Invoice.findOne({ orderId }).session(session);
      if (invoice) {
        invoice.paymentStatus = PaymentStatus.Cancelled;
        await invoice.save({ session });
      } else {
        throw new Error("Invoice not found for this order");
      }

      // Update ZoneDailyProfitLossModel for the order date
      const orderDate= order.orderDate;
      const formattedDate = `${String(orderDate.getDate()).padStart(2, '0')}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getFullYear() % 100).padStart(2, '0')}`;

      console.log("Formatted date:", formattedDate); // Debugging 

      const report = await ZoneDailyProfitLossModel.findOne({
        store_id: order.storeId,
        date: formattedDate,
      }).session(session);

      if (report) {
        report.total_sale_amount -= order.totalAmount;
        report.total_orders -= 1;
        report.avg_order_value = report.total_orders > 0 ? report.total_sale_amount / report.total_orders : 0;

        // Recalculate most sold product
        const productSales = new Map<string, number>();
        const allOrders = await Order.find({ storeId: order.storeId, orderDate: { $gte: orderDate, $lt: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000) } })
          .session(session);
        for (const ord of allOrders) {
          for (const item of ord.products) {
            const productId = item.productId.toString();
            productSales.set(productId, (productSales.get(productId) || 0) + item.quantity);
          }
        }
        let maxQuantity = 0;
        let mostSellingProductId: string | undefined;
        for (const [productId, quantity] of productSales) {
          if (quantity > maxQuantity) {
            maxQuantity = quantity;
            mostSellingProductId = productId;
          }
        }
        if (mostSellingProductId) {
          report.most_selling_product_id = new mongoose.Types.ObjectId(mostSellingProductId).toString();
          report.most_selling_quantity = maxQuantity;
        } else {
          report.most_selling_product_id = "";
          report.most_selling_quantity = 0;
        }

        report.net_profit_or_loss = report.total_sale_amount - report.total_fixed_cost - report.labour_cost - report.packaging_cost;
        report.status = report.net_profit_or_loss >= 0 ? "Profit" : "Loss";

        await report.save({ session });
      }

      await session.commitTransaction();
      res.status(200).json({
        success: true,
        data: order,
        message: "Order canceled successfully",
      });
    } catch (error: any) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: error.message || "Failed to cancel order",
      });
    } finally {
      session.endSession();
    }
  }

  // Update order status (Transaction-based)
  async updateOrderStatus(req: Request, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { orderId } = req.params;
      const { status } = req.body;

      // Validate status
      if (!Object.values(OrderStatus).includes(status)) {
        throw new Error(`Invalid order status: ${status}`);
      }

      // Find order
      const order = await Order.findOne({ orderId }).session(session);
      if (!order) {
        throw new Error("Order not found");
      }

      // Validate status transition
      const validTransitions: { [key: string]: string[] } = {
        [OrderStatus.Placed]: [OrderStatus.Confirmed, OrderStatus.Cancelled],
        [OrderStatus.Confirmed]: [OrderStatus.Shipped],
        [OrderStatus.Shipped]: [OrderStatus.Delivered],
        [OrderStatus.Delivered]: [],
        [OrderStatus.Cancelled]: [],
      };

      if (!validTransitions[order.status].includes(status)) {
        throw new Error(`Cannot transition from ${order.status} to ${status}`);
      }

      // If status is Cancelled, restock inventory and update sales report
      if (status === OrderStatus.Cancelled) {
        const inventory = await Inventory.findOne({ storeId: order.storeId }).session(session);
        if (!inventory) {
          throw new Error("Inventory not found for this store");
        }

        for (const item of order.products) {
          const inventoryProduct = inventory.products.find(
            (p) => p.productId.toString() === item.productId.toString()
          );
          if (inventoryProduct) {
            inventoryProduct.quantity += item.quantity;
            inventoryProduct.availability = inventoryProduct.quantity > 0;
          } else {
            throw new Error(`Product ${item.productId} not found in inventory`);
          }
        }
        await inventory.save({ session });

        // Update ZoneDailyProfitLossModel for the order date
        const orderDate= order.orderDate;
      const formattedDate = `${String(orderDate.getDate()).padStart(2, '0')}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getFullYear() % 100).padStart(2, '0')}`;

      console.log("Formatted date:", formattedDate); // Debugging 

      const report = await ZoneDailyProfitLossModel.findOne({
        store_id: order.storeId,
        date: formattedDate,
      }).session(session);

        if (report) {
          report.total_sale_amount -= order.totalAmount;
          report.total_orders -= 1;
          report.avg_order_value = report.total_orders > 0 ? report.total_sale_amount / report.total_orders : 0;

          // Recalculate most sold product
          const productSales = new Map<string, number>();
          const allOrders = await Order.find({ storeId: order.storeId, orderDate: { $gte: orderDate, $lt: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000) } })
            .session(session);
          for (const ord of allOrders) {
            for (const item of ord.products) {
              const productId = item.productId.toString();
              productSales.set(productId, (productSales.get(productId) || 0) + item.quantity);
            }
          }
          let maxQuantity = 0;
          let mostSellingProductId: string | undefined;
          for (const [productId, quantity] of productSales) {
            if (quantity > maxQuantity) {
              maxQuantity = quantity;
              mostSellingProductId = productId;
            }
          }
          if (mostSellingProductId) {
            report.most_selling_product_id = new mongoose.Types.ObjectId(mostSellingProductId).toString();
            report.most_selling_quantity = maxQuantity;
          } else {
            report.most_selling_product_id = 
            "";
            report.most_selling_quantity = 0;
          }
          report.net_profit_or_loss = report.total_sale_amount - report.total_fixed_cost - report.labour_cost - report.packaging_cost;
          report.status = report.net_profit_or_loss >= 0 ? "Profit" : "Loss";
          await report.save({ session });
        }
      }

      // Update order status and payment status
      order.status = status;
      if (status === OrderStatus.Delivered && !order.isCashOnDelivery) {
        order.paymentStatus = PaymentStatus.Paid;
      } else if (status === OrderStatus.Cancelled) {
        order.paymentStatus = PaymentStatus.Cancelled;
      }
      await order.save({ session });

      // Update invoice payment status
      const invoice = await Invoice.findOne({ orderId }).session(session);
      if (invoice) {
        if (status === OrderStatus.Delivered && !order.isCashOnDelivery) {
          invoice.paymentStatus = PaymentStatus.Paid;
        } else if (status === OrderStatus.Cancelled) {
          invoice.paymentStatus = PaymentStatus.Cancelled;
        }
        await invoice.save({ session });
      } else {
        throw new Error("Invoice not found for this order");
      }

      await session.commitTransaction();
      res.status(200).json({
        success: true,
        data: order,
        message: "Order status updated successfully",
      });
    } catch (error: any) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update order status",
      });
    } finally {
      session.endSession();
    }
  }

  // Get order by ID (Transaction-based)
  async getOrderById(req: Request, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { orderId } = req.params;

      if (!orderId) {
        throw new Error("Order ID is required");
      }

      const order = await Order.findOne({ orderId })
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

      await session.commitTransaction();
      res.status(200).json({
        success: true,
        data: order,
        message: "Order fetched successfully",
      });
    } catch (error: any) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch order",
      });
    } finally {
      session.endSession();
    }
  }

  // Get all orders for a user (Transaction-based)
  async getUserOrders(req: Request, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { userId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid user ID");
      }

      const orders = await Order.find({ userId: new mongoose.Types.ObjectId(userId) })
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

      await session.commitTransaction();
      res.status(200).json({
        success: true,
        message: orders.length > 0 ? "Orders fetched successfully" : "No orders found for this user",
        orders,
      });
    } catch (error: any) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch user orders",
      });
    } finally {
      session.endSession();
    }
  }
}

export default new OrderController();