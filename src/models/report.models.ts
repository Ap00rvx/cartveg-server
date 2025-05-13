import mongoose, { Schema } from "mongoose";
import { IZoneDailyProfitLoss } from "../types/interface/interface";
// Define the Mongoose schema
const ZoneDailyProfitLossSchema: Schema = new Schema(
    {
      store_id: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Store', // Reference to the Store collection (adjust based on your actual collection name)
      },
      date: {
        type: String,
        required: true,
      },
      total_sale_amount: {
        type: Number,
        required: true,
      },
      total_purchase_cost: {
        type: Number,
        required: true,
      },
      total_fixed_cost: {
        type: Number,
        required: true,
      },
      labour_cost: {
        type: Number,
        required: true,
      },
      packaging_cost: {
        type: Number,
        required: true,
      },
      net_profit_or_loss: {
        type: Number,
        required: true,
      },
      status: {
        type: String,
        enum: ['Profit', 'Loss'],
        required: true,
      },
      most_selling_product_id: {
        type: String,
        required: false,
      },
      most_selling_quantity: {
        type: Number,
        required: false,
      },
      total_orders: {
        type: Number,
        required: true,
      },
      cash_on_delivery_amount: {
        type: Number,
        required: true,
      },
      online_payment_amount: {
        type: Number,
        required: true,
      },
      avg_order_value: {
        type: Number,
        required: true,
      },
      created_at: {
        type: String,
        default: () => new Date().toISOString(),
      },
    },
    {
      timestamps: false, // We're handling created_at manually
      collection: 'zone_daily_profit_loss', // Explicitly set the collection name
    }
  );
  
  // Create and export the Mongoose model
  const ZoneDailyProfitLossModel = mongoose.model<IZoneDailyProfitLoss>(
    'ZoneDailyProfitLoss',
    ZoneDailyProfitLossSchema
  );
  
  export default ZoneDailyProfitLossModel;