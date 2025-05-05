import mongoose, { Model, Schema } from "mongoose";
import { IOrder, IProduct } from "../types/interface/interface";
import { OrderStatus, PaymentStatus } from "../types/interface/interface";
import { addressSchema } from "./user.model";

const orderSchema = new mongoose.Schema<IOrder>({
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  products: {
    type: [{
      productId: { type: Schema.Types.ObjectId, required: true },
      quantity: { type: Number, required: true },
    }],
    required: true,
  },
  orderDate: {
    type: Date,
    required: true,
    default: Date.now(),
  },
  expectedDeliveryDate: {
    type: Date,
    required: true,
    default: function () {
      return new Date(this.orderDate.getTime() + 2 * 24 * 60 * 60 * 1000);
    },
  },
  storeId :{
    type : Schema.Types.ObjectId,
    required : true, 
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  shippingAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
    select: true,
  },
  totalItems: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
  },
  status: {
    type: String,
    enum: OrderStatus,
    required: true,
    default: OrderStatus.Placed,
  },
  isCashOnDelivery: {
    type: Boolean,
    required: true,
  },
  deliveryAddress: {
    type: addressSchema,
    required: true,
  },
  invoiceId: {
    type: String,
    required: true,
  },
  appliedCoupon: {
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon" }, // Optional
    code: { type: String }, // Optional
    discountAmount: { type: Number }, // Optional
  },
  wallet_amount_used :{
    type: Number,
    default: 0,
    min: 0,
  },
  paymentStatus: {
    type: String,
    enum: PaymentStatus,
    default: PaymentStatus.Pending,
    required: true,
  },
  rzpOrderId: {
    type: String,
    required: function (): boolean {
      return this.isCashOnDelivery === false;
    },
  },
  rzpPaymentId: {
    type: String,
    required: function (): boolean {
      return this.isCashOnDelivery === false;
    },
  },
});

const Order: Model<IOrder> = mongoose.model<IOrder>("Order", orderSchema);

export default Order;