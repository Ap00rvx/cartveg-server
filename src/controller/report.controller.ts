import { Request, Response } from "express";
import mongoose from 'mongoose';
import ZoneDailyProfitLossModel from "../models/report.models";
import Papa from "papaparse";
import { PurchaseModel } from "../models/purchase_model";

interface PurchaseCsvRow {
  date: string;
  name: string;
  quantity: string;
  total_cost: string;
  price_per_unit: string;
  unit: string;
}

class ReportController {
  async getStoreReport(req: Request, res: Response) {
    try {
      const { storeId, date } = req.query as { storeId: string; date: string };

      if (!storeId || !date) {
        res.status(400).json({ error: 'store_id and date are required' });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(storeId)) {
        res.status(400).json({ error: 'Invalid store_id format' });
        return;
      }

      // Convert the input date (e.g., "2025-04-17") to "DD-MM-YY" format (e.g., "17-04-25")
      const queryDate = new Date(date);
      if (isNaN(queryDate.getTime())) {
        res.status(400).json({ error: 'Invalid date format' });
        return;
      }
      const formattedQueryDate = `${String(queryDate.getDate()).padStart(2, '0')}-${String(queryDate.getMonth() + 1).padStart(2, '0')}-${String(queryDate.getFullYear() % 100).padStart(2, '0')}`;

      const report = await ZoneDailyProfitLossModel.findOne({
        store_id: new mongoose.Types.ObjectId(storeId),
        date: formattedQueryDate,
      }).lean();

      if (!report) {
        // create empty report
        const newReport = new ZoneDailyProfitLossModel({
          store_id: new mongoose.Types.ObjectId(storeId),
          date: formattedQueryDate,
          total_sale_amount: 0,
          total_purchase_cost: 0,
          total_fixed_cost: 0,
          labour_cost: 0,
          packaging_cost: 0,
          net_profit_or_loss: 0,
          status: 'Loss',
          most_selling_product_id: null,
          most_selling_quantity: 0,
          total_orders: 0,
          avg_order_value: 0,
          created_at: new Date().toISOString(),
        });
        await newReport.save();
        res.status(200).json({
          message: 'No report found for the given store and date. Created an empty report.',
          report: {
            store_id: newReport.store_id.toString(),
            date: newReport.date,
            total_sale_amount: 0,
            total_purchase_cost: 0,
            total_fixed_cost: 0,
            labour_cost: 0,
            packaging_cost: 0,
            net_profit_or_loss: 0,
            status: 'Loss',
            most_selling_product_id: null,
            most_selling_quantity: 0,
            total_orders: 0,
            avg_order_value: 0,
          },
        });
        return;
      }

      res.status(200).json({
        message: 'Report retrieved successfully',
        report: {
          store_id: report.store_id.toString(),
          date: report.date, // Already in "DD-MM-YY" format
          total_sale_amount: report.total_sale_amount,
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
        error: 'Failed to retrieve report: ' + (error as Error).message,
      });
    }
  }

  uploadPurchaseDoc = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No CSV file uploaded' });
        return;
      }

      const { storeId, date } = req.query as { storeId: string; date: string };
      if (!storeId || !date) {
        res.status(400).json({ error: 'store_id and date are required in query parameters' });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(storeId)) {
        res.status(400).json({ error: 'Invalid store_id format' });
        return;
      }

      const csvData = req.file.buffer.toString();
      console.log('CSV Data:', csvData);
      await this.processPurchaseCsv(csvData, storeId, date);

      res.status(200).json({ message: 'Purchase data processed successfully' });
    } catch (error) {
      console.error('Error processing purchase CSV:', error);
      res.status(500).json({
        error: 'Failed to process purchase CSV: ' + (error as Error).message,
      });
    }
  };

  private processPurchaseCsv = async (
    csvData: string,
    store_id: string,
    date: string
  ): Promise<void> => {
    try {
      if (!mongoose.Types.ObjectId.isValid(store_id)) {
        throw new Error(`Invalid store_id: ${store_id}`);
      }

      const storeObjectId = new mongoose.Types.ObjectId(store_id);
      const purchaseDate = new Date(date);

      if (isNaN(purchaseDate.getTime())) {
        throw new Error(`Invalid date: ${date}`);
      }

      // Format the date as "DD-MM-YY"
      const formattedDate = `${String(purchaseDate.getDate()).padStart(2, '0')}-${String(purchaseDate.getMonth() + 1).padStart(2, '0')}-${String(purchaseDate.getFullYear() % 100).padStart(2, '0')}`;

      const parseResult = await new Promise<Papa.ParseResult<PurchaseCsvRow>>(
        (resolve, reject) => {
          Papa.parse<PurchaseCsvRow>(csvData, {
            header: true,
            skipEmptyLines: true,
            complete: (result) => resolve(result),
            error: (error: any) => reject(error),
          });
        }
      );

      const purchaseRecords: PurchaseCsvRow[] = parseResult.data;

      if (purchaseRecords.length === 0) {
        throw new Error('No valid purchase data found in CSV');
      }

      const products = purchaseRecords.map((record) => ({
        name: record.name,
        quantity: parseInt(record.quantity, 10),
        total_cost: parseFloat(record.total_cost),
        price_per_unit: parseFloat(record.price_per_unit),
        unit: record.unit,
      }));

      const total_cost = products.reduce((sum, p) => sum + p.total_cost, 0);
      const total_quantity = products.reduce((sum, p) => sum + p.quantity, 0);

      // Find existing purchase record with exact date (as string)
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
          date: formattedDate, // Store as string in "DD-MM-YY" format
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
        profitLossRecord.net_profit_or_loss =
          profitLossRecord.total_sale_amount -
          profitLossRecord.total_purchase_cost -
          profitLossRecord.total_fixed_cost;
        profitLossRecord.status =
          profitLossRecord.net_profit_or_loss >= 0 ? 'Profit' : 'Loss';
        await profitLossRecord.save();
      } else {
        const newProfitLoss = new ZoneDailyProfitLossModel({
          store_id: storeObjectId,
          date: formattedDate, // Store as string in "DD-MM-YY" format
          total_sale_amount: 0,
          total_purchase_cost: total_cost,
          total_fixed_cost: 0,
          labour_cost: 0,
          packaging_cost: 0,
          net_profit_or_loss: -total_cost,
          status: 'Loss',
          total_orders: 0,
          avg_order_value: 0,
          created_at: new Date().toISOString(),
        });
        await newProfitLoss.save();
      }
    } catch (error) {
      throw new Error('Failed to process purchase CSV: ' + (error as Error).message);
    }
  };

  async getPurchaseReport(req: Request, res: Response) {
    try {
      const { storeId, date } = req.query as { storeId: string; date: string };

      if (!storeId || !date) {
        res.status(400).json({ error: 'store_id and date are required' });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(storeId)) {
        res.status(400).json({ error: 'Invalid store_id format' });
        return;
      }

      const queryDate = new Date(date);
      if (isNaN(queryDate.getTime())) {
        res.status(400).json({ error: 'Invalid date format' });
        return;
      }

      // Format the query date as "DD-MM-YY"
      const formattedQueryDate = `${String(queryDate.getDate()).padStart(2, '0')}-${String(queryDate.getMonth() + 1).padStart(2, '0')}-${String(queryDate.getFullYear() % 100).padStart(2, '0')}`;

      const purchaseReport = await PurchaseModel.findOne({
        store_id: new mongoose.Types.ObjectId(storeId),
        date: formattedQueryDate,
      }).lean();

      if (!purchaseReport) {
        // create empty report 
        const newPurchaseReport = new PurchaseModel({
          store_id: new mongoose.Types.ObjectId(storeId),
          date: formattedQueryDate,
          products: [],
          total_cost: 0,
          total_quantity: 0,
        });
        await newPurchaseReport.save();
        res.status(200).json({
          message: 'No purchase report found for the given store and date. Created an empty report.',
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
        message: 'Purchase report retrieved successfully',
        report: {
          ...purchaseReport,
          date: purchaseReport.date, // Already in "DD-MM-YY" format
        },
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve purchase report: ' + (error as Error).message,
      });
    }
  }
}

export default new ReportController();