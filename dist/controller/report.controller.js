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
const mongoose_1 = __importDefault(require("mongoose"));
const report_models_1 = __importDefault(require("../models/report.models"));
const papaparse_1 = __importDefault(require("papaparse"));
const purchase_model_1 = require("../models/purchase_model");
class ReportController {
    constructor() {
        this.uploadPurchaseDoc = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.file) {
                    res.status(400).json({ error: 'No CSV file uploaded' });
                    return;
                }
                const { storeId, date } = req.query;
                if (!storeId || !date) {
                    res.status(400).json({ error: 'store_id and date are required in query parameters' });
                    return;
                }
                if (!mongoose_1.default.Types.ObjectId.isValid(storeId)) {
                    res.status(400).json({ error: 'Invalid store_id format' });
                    return;
                }
                const csvData = req.file.buffer.toString();
                console.log('CSV Data:', csvData);
                yield this.processPurchaseCsv(csvData, storeId, date);
                res.status(200).json({ message: 'Purchase data processed successfully' });
            }
            catch (error) {
                console.error('Error processing purchase CSV:', error);
                res.status(500).json({
                    error: 'Failed to process purchase CSV: ' + error.message,
                });
            }
        });
        this.processPurchaseCsv = (csvData, store_id, date) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!mongoose_1.default.Types.ObjectId.isValid(store_id)) {
                    throw new Error(`Invalid store_id: ${store_id}`);
                }
                const storeObjectId = new mongoose_1.default.Types.ObjectId(store_id);
                const purchaseDate = new Date(date);
                if (isNaN(purchaseDate.getTime())) {
                    throw new Error(`Invalid date: ${date}`);
                }
                // Format the date as "DD-MM-YY"
                const formattedDate = `${String(purchaseDate.getDate()).padStart(2, '0')}-${String(purchaseDate.getMonth() + 1).padStart(2, '0')}-${String(purchaseDate.getFullYear() % 100).padStart(2, '0')}`;
                const parseResult = yield new Promise((resolve, reject) => {
                    papaparse_1.default.parse(csvData, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (result) => resolve(result),
                        error: (error) => reject(error),
                    });
                });
                const purchaseRecords = parseResult.data;
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
                const existingPurchase = yield purchase_model_1.PurchaseModel.findOne({
                    store_id: storeObjectId,
                    date: formattedDate,
                });
                if (existingPurchase) {
                    existingPurchase.products = products;
                    existingPurchase.total_cost = total_cost;
                    existingPurchase.total_quantity = total_quantity;
                    yield existingPurchase.save();
                }
                else {
                    const newPurchase = new purchase_model_1.PurchaseModel({
                        store_id: storeObjectId,
                        date: formattedDate, // Store as string in "DD-MM-YY" format
                        products,
                        total_cost,
                        total_quantity,
                    });
                    yield newPurchase.save();
                }
                // Update ZoneDailyProfitLossModel
                const profitLossRecord = yield report_models_1.default.findOne({
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
                    yield profitLossRecord.save();
                }
                else {
                    const newProfitLoss = new report_models_1.default({
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
                    yield newProfitLoss.save();
                }
            }
            catch (error) {
                throw new Error('Failed to process purchase CSV: ' + error.message);
            }
        });
    }
    getStoreReport(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { storeId, date } = req.query;
                if (!storeId || !date) {
                    res.status(400).json({ error: 'store_id and date are required' });
                    return;
                }
                if (!mongoose_1.default.Types.ObjectId.isValid(storeId)) {
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
                const report = yield report_models_1.default.findOne({
                    store_id: new mongoose_1.default.Types.ObjectId(storeId),
                    date: formattedQueryDate,
                }).lean();
                if (!report) {
                    res.status(404).json({ error: 'No report found for the given store and date' });
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
            }
            catch (error) {
                res.status(500).json({
                    error: 'Failed to retrieve report: ' + error.message,
                });
            }
        });
    }
    getPurchaseReport(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { storeId, date } = req.query;
                if (!storeId || !date) {
                    res.status(400).json({ error: 'store_id and date are required' });
                    return;
                }
                if (!mongoose_1.default.Types.ObjectId.isValid(storeId)) {
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
                const purchaseReport = yield purchase_model_1.PurchaseModel.findOne({
                    store_id: new mongoose_1.default.Types.ObjectId(storeId),
                    date: formattedQueryDate,
                }).lean();
                if (!purchaseReport) {
                    res.status(404).json({ error: 'No purchase report found for the given store and date' });
                    return;
                }
                res.status(200).json({
                    message: 'Purchase report retrieved successfully',
                    report: Object.assign(Object.assign({}, purchaseReport), { date: purchaseReport.date }),
                });
            }
            catch (error) {
                res.status(500).json({
                    error: 'Failed to retrieve purchase report: ' + error.message,
                });
            }
        });
    }
}
exports.default = new ReportController();
