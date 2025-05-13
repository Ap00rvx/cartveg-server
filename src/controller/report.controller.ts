import { Request, Response } from "express";
import mongoose from "mongoose";
import Papa from "papaparse";

import { PurchaseModel } from "../models/purchase_model";
import ZoneDailyProfitLossModel from "../models/report.models";

// Interface for CSV row, extended with new fields
interface PurchaseCsvRow {
  date: string;
  name: string;
  quantity: string;
  total_cost: string;
  price_per_unit: string;
  unit: string;
  labour_cost?: string;
  total_fixed_cost?: string;
  packaging_cost?: string;
}

class ReportController {
  /**
   * Get store report for a specific store and date
   * @param req Express request object
   * @param res Express response object
   */
  async getStoreReport(req: Request, res: Response): Promise<void> {
    try {
      const { storeId, date } = req.query as { storeId: string; date: string };

      if (!storeId || !date) {
        res.status(400).json({ error: "store_id and date are required" });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(storeId)) {
        res.status(400).json({ error: "Invalid store_id format" });
        return;
      }

      const queryDate = new Date(date);
      if (isNaN(queryDate.getTime())) {
        res.status(400).json({ error: "Invalid date format" });
        return;
      }

      const formattedQueryDate = `${String(queryDate.getDate()).padStart(2, "0")}-${String(
        queryDate.getMonth() + 1,
      ).padStart(2, "0")}-${String(queryDate.getFullYear() % 100).padStart(2, "0")}`;

      const report = await ZoneDailyProfitLossModel.findOne({
        store_id: new mongoose.Types.ObjectId(storeId),
        date: formattedQueryDate,
      }).lean();

      if (!report) {
        const newReport = new ZoneDailyProfitLossModel({
          store_id: new mongoose.Types.ObjectId(storeId),
          date: formattedQueryDate,
          total_sale_amount: 0,
          total_purchase_cost: 0,
          total_fixed_cost: 0,
          labour_cost: 0,
          packaging_cost: 0,
          net_profit_or_loss: 0,
          status: "Loss",
          most_selling_product_id: null,
          most_selling_quantity: 0,
          total_orders: 0,
          cash_on_delivery_amount: 0,
          online_payment_amount: 0,
          avg_order_value: 0,
          created_at: new Date().toISOString(),
        });
        await newReport.save();
        res.status(200).json({
          message: "No report found for the given store and date. Created an empty report.",
          report: {
            store_id: newReport.store_id.toString(),
            date: newReport.date,
            total_sale_amount: 0,
            total_purchase_cost: 0,
            total_fixed_cost: 0,
            labour_cost: 0,
            packaging_cost: 0,
            net_profit_or_loss: 0,
            status: "Loss",
            cash_on_delivery_amount: 0,
            online_payment_amount: 0,
            most_selling_product_id: null,
            most_selling_quantity: 0,
            total_orders: 0,
            avg_order_value: 0,
          },
        });
        return;
      }

      res.status(200).json({
        message: "Report retrieved successfully",
        report: {
          store_id: report.store_id.toString(),
          date: report.date,
          total_sale_amount: report.total_sale_amount,
          cash_on_delivery_amount: report.cash_on_delivery_amount ?? 0,
          online_payment_amount: report.online_payment_amount ?? 0,
          total_purchase_cost: report.total_purchase_cost,
          total_fixed_cost: report.total_fixed_cost,
          labour_cost: report.labour_cost,
          packaging_cost: report.packaging_cost,
          net_profit_or_loss: report.net_profit_or_loss,
          status: report.status,
          most_selling_product_id: report.most_selling_product_id,
          most_selling_quantity: report.most_selling_quantity,
          total_orders: report.total_orders,
          avg_order_value: report.avg_order_value,
          created_at: report.created_at,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: `Failed to retrieve report: ${(error as Error).message}`,
      });
    }
  }

  /**
   * Upload and process a purchase CSV document
   * @param req Express request object
   * @param res Express response object
   */
  async uploadPurchaseDoc(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No CSV file uploaded" });
        return;
      }

      const { storeId, date } = req.query as { storeId: string; date: string };
      if (!storeId || !date) {
        res.status(400).json({ error: "store_id and date are required in query parameters" });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(storeId)) {
        res.status(400).json({ error: "Invalid store_id format" });
        return;
      }

      const csvData = req.file.buffer.toString();
      await processPurchaseCsv(csvData, storeId, date);

      res.status(200).json({ message: "Purchase data processed successfully" });
    } catch (error) {
      console.error("Error processing purchase CSV:", error);
      res.status(500).json({
        error: `Failed to process purchase CSV: ${(error as Error).message}`,
      });
    }
  }

  /**
   * Process a purchase CSV and update PurchaseModel and ZoneDailyProfitLossModel
   * @param csvData CSV data as a string
   * @param store_id Store ID
   * @param date Date in YYYY-MM-DD format
   */
  
  /**
   * Get purchase report for a specific store and date
   * @param req Express request object
   * @param res Express response object
   */
  async getPurchaseReport(req: Request, res: Response): Promise<void> {
    try {
      const { storeId, date } = req.query as { storeId: string; date: string };

      if (!storeId || !date) {
        res.status(400).json({ error: "store_id and date are required" });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(storeId)) {
        res.status(400).json({ error: "Invalid store_id format" });
        return;
      }

      const queryDate = new Date(date);
      if (isNaN(queryDate.getTime())) {
        res.status(400).json({ error: "Invalid date format" });
        return;
      }

      const formattedQueryDate = `${String(queryDate.getDate()).padStart(2, "0")}-${String(
        queryDate.getMonth() + 1,
      ).padStart(2, "0")}-${String(queryDate.getFullYear() % 100).padStart(2, "0")}`;

      const purchaseReport = await PurchaseModel.findOne({
        store_id: new mongoose.Types.ObjectId(storeId),
        date: formattedQueryDate,
      }).lean();

      if (!purchaseReport) {
        const newPurchaseReport = new PurchaseModel({
          store_id: new mongoose.Types.ObjectId(storeId),
          date: formattedQueryDate,
          products: [],
          total_cost: 0,
          total_quantity: 0,
        });
        await newPurchaseReport.save();
        res.status(200).json({
          message: "No purchase report found for the given store and date. Created an empty report.",
          report: {
            store_id: newPurchaseReport.store_id.toString(),
            date: newPurchaseReport.date,
            products: [],
            total_cost: 0,
            total_quantity: 0,
          },
        });
        return;
      }

      res.status(200).json({
        message: "Purchase report retrieved successfully",
        report: {
          ...purchaseReport,
          date: purchaseReport.date,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: `Failed to retrieve purchase report: ${(error as Error).message}`,
      });
    }
  }

  /**
   * Download a CSV template for purchase document upload
   * @param req Express request object
   * @param res Express response object
   */
  async downloadPurchaseTemplate(req: Request, res: Response): Promise<void> {
    try {
      // Define CSV headers
      const headers = [
        "date",
        "name",
        "quantity",
        "total_cost",
        "price_per_unit",
        "unit",
        "labour_cost",
        "total_fixed_cost",
        "packaging_cost",
      ];

      // Sample data for the template (one row)
      const sampleData = [
        {
          date: "2025-05-13",
          name: "Fresh Tomatoes",
          quantity: "10",
          total_cost: "500",
          price_per_unit: "50",
          unit: "kg",
          labour_cost: "100",
          total_fixed_cost: "200",
          packaging_cost: "50",
        },
      ];

      // Generate CSV
      const csv = Papa.unparse({
        fields: headers,
        data: sampleData,
      });

      // Set response headers for file download
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="purchase_template.csv"');

      // Send CSV data
      res.status(200).send(csv);
    } catch (error) {
      console.error("Error generating purchase template:", error);
      res.status(500).json({
        error: `Failed to generate purchase template: ${(error as Error).message}`,
      });
    }
  }
}
const processPurchaseCsv = async (csvData: string, store_id: string, date: string): Promise<void> => {
    try {
      if (!mongoose.Types.ObjectId.isValid(store_id)) {
        throw new Error(`Invalid store_id: ${store_id}`);
      }

      const storeObjectId = new mongoose.Types.ObjectId(store_id);
      const purchaseDate = new Date(date);
      if (isNaN(purchaseDate.getTime())) {
        throw new Error(`Invalid date: ${date}`);
      }

      const formattedDate = `${String(purchaseDate.getDate()).padStart(2, "0")}-${String(
        purchaseDate.getMonth() + 1,
      ).padStart(2, "0")}-${String(purchaseDate.getFullYear() % 100).padStart(2, "0")}`;

      const parseResult = await new Promise<Papa.ParseResult<PurchaseCsvRow>>((resolve, reject) => {
        Papa.parse<PurchaseCsvRow>(csvData, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => resolve(result),
          error: (error: any) => reject(error),
        });
      });

      const purchaseRecords: PurchaseCsvRow[] = parseResult.data;
      if (purchaseRecords.length === 0) {
        throw new Error("No valid purchase data found in CSV");
      }

      // Validate and process records
      const products = purchaseRecords.map((record) => {
        const quantity = parseInt(record.quantity, 10);
        const total_cost = parseFloat(record.total_cost);
        const price_per_unit = parseFloat(record.price_per_unit);
        const labour_cost = record.labour_cost ? parseFloat(record.labour_cost) : 0;
        const total_fixed_cost = record.total_fixed_cost ? parseFloat(record.total_fixed_cost) : 0;
        const packaging_cost = record.packaging_cost ? parseFloat(record.packaging_cost) : 0;

        if (isNaN(quantity) || quantity <= 0) {
          throw new Error(`Invalid quantity for product ${record.name}: ${record.quantity}`);
        }
        if (isNaN(total_cost) || total_cost < 0) {
          throw new Error(`Invalid total_cost for product ${record.name}: ${record.total_cost}`);
        }
        if (isNaN(price_per_unit) || price_per_unit < 0) {
          throw new Error(`Invalid price_per_unit for product ${record.name}: ${record.price_per_unit}`);
        }
        if (isNaN(labour_cost) || labour_cost < 0) {
          throw new Error(`Invalid labour_cost for product ${record.name}: ${record.labour_cost}`);
        }
        if (isNaN(total_fixed_cost) || total_fixed_cost < 0) {
          throw new Error(`Invalid total_fixed_cost for product ${record.name}: ${record.total_fixed_cost}`);
        }
        if (isNaN(packaging_cost) || packaging_cost < 0) {
          throw new Error(`Invalid packaging_cost for product ${record.name}: ${record.packaging_cost}`);
        }

        return {
          name: record.name,
          quantity,
          total_cost,
          price_per_unit,
          unit: record.unit,
        };
      });

      const total_cost = products.reduce((sum, p) => sum + p.total_cost, 0);
      const total_quantity = products.reduce((sum, p) => sum + p.quantity, 0);

      // Aggregate costs from the first record (assuming consistent across rows)
      const { labour_cost = 0, total_fixed_cost = 0, packaging_cost = 0 } = purchaseRecords[0] || {};

      // Update PurchaseModel
      const existingPurchase = await PurchaseModel.findOne({
        store_id: storeObjectId,
        date: formattedDate,
      });

      if (existingPurchase) {
        existingPurchase.products = products;
        existingPurchase.total_cost = total_cost;
        existingPurchase.total_quantity = total_quantity;
        await existingPurchase.save();
      } else {
        const newPurchase = new PurchaseModel({
          store_id: storeObjectId,
          date: formattedDate,
          products,
          total_cost,
          total_quantity,
        });
        await newPurchase.save();
      }

      // Update ZoneDailyProfitLossModel
      const profitLossRecord = await ZoneDailyProfitLossModel.findOne({
        store_id: storeObjectId,
        date: formattedDate,
      });

      if (profitLossRecord) {
        profitLossRecord.total_purchase_cost = total_cost;
        profitLossRecord.labour_cost = parseFloat(String(labour_cost)) || 0;
        profitLossRecord.total_fixed_cost = parseFloat(String(total_fixed_cost)) || 0;
        profitLossRecord.packaging_cost = parseFloat(String(packaging_cost)) || 0;
        profitLossRecord.net_profit_or_loss =
          profitLossRecord.total_sale_amount -
          profitLossRecord.total_purchase_cost -
          profitLossRecord.total_fixed_cost -
          profitLossRecord.labour_cost -
          profitLossRecord.packaging_cost;
        profitLossRecord.status = profitLossRecord.net_profit_or_loss >= 0 ? "Profit" : "Loss";
        await profitLossRecord.save();
      } else {
        const newProfitLoss = new ZoneDailyProfitLossModel({
          store_id: storeObjectId,
          date: formattedDate,
          total_sale_amount: 0,
          total_purchase_cost: total_cost,
          total_fixed_cost: parseFloat(String(total_fixed_cost)) || 0,
          labour_cost: parseFloat(String(labour_cost)) || 0,
          packaging_cost: parseFloat(String(packaging_cost)) || 0,
          net_profit_or_loss: -(total_cost + parseFloat(String(total_fixed_cost)) + parseFloat(String(labour_cost)) + parseFloat(String(packaging_cost))),
          status: "Loss",
          total_orders: 0,
          cash_on_delivery_amount: 0,
          online_payment_amount: 0,
          avg_order_value: 0,
          created_at: new Date().toISOString(),
        });
        await newProfitLoss.save();
      }
    } catch (error) {
      throw new Error(`Failed to process purchase CSV: ${(error as Error).message}`);
    }
  };


export default new ReportController();
