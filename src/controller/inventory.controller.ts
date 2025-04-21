import { Request, Response } from "express";
import mongoose from "mongoose";
import { Inventory } from "../models/inventory.model"; // Adjust path to your Inventory model
import { Store } from "../models/store.model"; // Adjust path to your Store model
import  Product  from "../models/product.model"; // Adjust path to your Product model (assumed)
import { IProduct, OrderStatus } from "../types/interface/interface";
import Order from "../models/order.model";
import Papa from "papaparse";
import csvParser from "csv-parser";
import { Readable } from "stream";
// Interface for product entry in the list
interface ProductEntry {
  productId: string;
  quantity: number;
  threshold: number;
  availability?: boolean;
}

// Interface for add products request body
interface AddProductsRequest {
  storeId: string;
  products: ProductEntry[];
}

// Interface for update stock request body (unchanged)
interface UpdateStockRequest {
  storeId: string;
  productId: string;
  quantity?: number;
  threshold?: number;
  availability?: boolean;
}

// Controller to add multiple products to inventory
export const addProductToInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { storeId, products }: AddProductsRequest = req.body;

    // Validate required fields
    if (!storeId || !products || !Array.isArray(products) || products.length === 0) {
      res.status(400).json({
        success: false,
        message: "storeId and a non-empty products array are required",
      });
      return;
    }

    // Validate MongoDB ObjectId for storeId
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      res.status(400).json({
        success: false,
        message: "Invalid storeId format",
      });
      return;
    }

    // Validate each product entry
    for (const product of products) {
      if (!product.productId || product.quantity === undefined || product.threshold === undefined) {
        res.status(400).json({
          success: false,
          message: "Each product must have productId, quantity, and threshold",
        });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(product.productId)) {
        res.status(400).json({
          success: false,
          message: `Invalid productId format: ${product.productId}`,
        });
        return;
      }

      if (product.quantity < 0 || product.threshold < 0) {
        res.status(400).json({
          success: false,
          message: `Quantity and threshold must be non-negative for productId: ${product.productId}`,
        });
        return;
      }
    }

    // Check if store exists
    const store = await Store.findById(storeId);
    if (!store) {
      res.status(404).json({
        success: false,
        message: "Store not found",
      });
      return;
    }

    // Check if all products exist
    const productIds = products.map((p) => p.productId);
    const existingProducts = await Product.find({ _id: { $in: productIds } });
    if (existingProducts.length !== productIds.length) {
      const missingIds = productIds.filter(
        (id) => !existingProducts.some((p) => p._id.toString() === id)
      );
      res.status(404).json({
        success: false,
        message: `Products not found: ${missingIds.join(", ")}`,
      });
      return;
    }

    // Find or create inventory for the store
    let inventory = await Inventory.findOne({ storeId });

    if (!inventory) {
      // Create new inventory if none exists
      inventory = new Inventory({
        storeId: new mongoose.Types.ObjectId(storeId),
        products: [],
      });
    }

    // Process each product
    for (const product of products) {
      const productIndex = inventory.products.findIndex(
        (p) => p.productId.toString() === product.productId
      );

      if (productIndex !== -1) {
        // Update existing product
        inventory.products[productIndex] = {
          productId: new mongoose.Types.ObjectId(product.productId),
          quantity: product.quantity,
          threshold: product.threshold,
          availability: product.availability ?? true,
        };
      } else {
        // Add new product
        inventory.products.push({
          productId: new mongoose.Types.ObjectId(product.productId),
          quantity: product.quantity,
          threshold: product.threshold,
          availability: product.availability ?? true,
        });
      }
    }

    // Save the inventory
    await inventory.save();

    res.status(200).json({
      success: true,
      message: "Products added/updated in inventory successfully",
      data: inventory,
    });
  } catch (error: any) {
    console.error("Error adding products to inventory:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding products to inventory",
      error: error.message,
    });
  }
};


  

// Define interfaces for TypeScript safety


interface PopulatedProduct {
  productId: IProduct & { _id: mongoose.Types.ObjectId };
  quantity: number;
  threshold: number;
  availability: boolean;
}

interface FormattedProduct {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  threshold: number;
  availability: boolean;
  details: {
    name: string;
    description?: string;
    unit?: string;
    category?: string;
    origin?: string;
    shelfLife?: string;
    image?: string;
    price?: number;
    actualPrice?: number;
  } | null;
}

interface PaginationResult {
  currentPage: number;
  totalPages: number;
  limit: number;
  totalProducts: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const getInventoryProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get storeId from query params
    console.log(req.query);
    const storeId = req.query.storeId as string;

    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1; // Default to page 1
    const limit = parseInt(req.query.limit as string) || 10; // Default to 10 items per page
    
    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      res.status(400).json({
        success: false,
        message: "Page and limit must be positive integers",
      });
      return;
    }

    // Validate storeId
    if (!storeId) {
      res.status(400).json({
        success: false,
        message: "storeId is required",
      });
      return;
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      res.status(400).json({
        success: false,
        message: "Invalid storeId format",
      });
      return;
    }

    // Find inventory document
    const inventory = await Inventory.findOne({ storeId }).lean();

    // Check if inventory exists
    if (!inventory) {
      res.status(404).json({
        success: false,
        message: "Inventory not found for this store",
      });
      return;
    }

    // Calculate total items and pages for pagination
    const totalProducts = inventory.products?.length || 0;
    const totalPages = Math.ceil(totalProducts / limit);
    
    // Apply pagination to products array
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = inventory.products?.slice(startIndex, endIndex) || [];

    // Get product IDs for the current page
    const productIds = paginatedProducts.map(product => product.productId);

    // Fetch product details in bulk
    const productDetails = await Product.find(
      { _id: { $in: productIds } },
      'name description unit category origin shelfLife image price actualPrice'
    ).lean();

    // Create lookup map for quick access to product details
    const productDetailsMap = new Map();
    productDetails.forEach(product => {
      productDetailsMap.set(product._id.toString(), product);
    });

    // Format response to combine inventory and product details
    const formattedProducts: FormattedProduct[] = paginatedProducts.map((product) => {
      const productId = product.productId.toString();
      const details = productDetailsMap.get(productId);

      return {
        productId: product.productId,
        quantity: product.quantity,
        threshold: product.threshold,
        availability: product.availability,
        details: details ? {
          name: details.name,
          description: details.description,
          unit: details.unit,
          category: details.category,
          origin: details.origin,
          shelfLife: details.shelfLife,
          image: details.image,
          price: details.price,
          actualPrice: details.actualPrice,
        } : null,
      };
    });

    // Create pagination info
    const pagination: PaginationResult = {
      currentPage: page,
      totalPages,
      limit,
      totalProducts,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };

    // Return formatted response with pagination
    res.status(200).json({
      success: true,
      message: "Inventory products retrieved successfully",
      data: {
        storeId,
        pagination,
        products: formattedProducts,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error("Error retrieving inventory products:", err);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving inventory products",
      error: err.message,
    });
  }
};
// Controller to update stock in inventory (unchanged)
export const updateStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { storeId, productId, quantity, threshold, availability }: UpdateStockRequest = req.body;

    // Validate required fields
    if (!storeId || !productId) {
      res.status(400).json({
        success: false,
        message: "storeId and productId are required",
      });
      return;
    }

    // Validate MongoDB ObjectIds
    if (!mongoose.Types.ObjectId.isValid(storeId) || !mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400).json({
        success: false,
        message: "Invalid storeId or productId format",
      });
      return;
    }

    // Validate quantity and threshold if provided
    if (quantity !== undefined && quantity < 0) {
      res.status(400).json({
        success: false,
        message: "Quantity cannot be negative",
      });
      return;
    }
    if (threshold !== undefined && threshold < 0) {
      res.status(400).json({
        success: false,
        message: "Threshold cannot be negative",
      });
      return;
    }

    // Check if inventory exists
    const inventory = await Inventory.findOne({ storeId });
    if (!inventory) {
      res.status(404).json({
        success: false,
        message: "Inventory not found for this store",
      });
      return;
    }

    // Find product in inventory
    const productIndex = inventory.products.findIndex(
      (p) => p.productId.toString() === productId
    );

    if (productIndex === -1) {
      res.status(404).json({
        success: false,
        message: "Product not found in inventory",
      });
      return;
    }

    // Update product fields if provided
    if (quantity !== undefined) {
      inventory.products[productIndex].quantity = quantity;
    }
    if (threshold !== undefined) {
      inventory.products[productIndex].threshold = threshold;
    }
    
    if (availability !== undefined) {
      inventory.products[productIndex].availability = availability;
    }

    if(availability === undefined && quantity !== undefined && (quantity === 0 || quantity < inventory.products[productIndex].threshold)) {
      inventory.products[productIndex].availability = false; // Set availability to false if quantity is 0 or below threshold
    }
      
      else if (availability === undefined && quantity !== undefined && quantity > inventory.products[productIndex].threshold) {
        inventory.products[productIndex].availability = true; // Set availability to true if quantity is above threshold
      }
    

    // Save the updated inventory
    await inventory.save();

    res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      data: inventory,
    });
  } catch (error: any) {
    console.error("Error updating stock:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating stock",
      error: error.message,
    });
  }
};
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get pagination and store parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const storeId = req.query.storeId as string;

    // Validate storeId
    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      res.status(400).json({
        success: false,
        message: "Valid storeId is required",
      });
      return;
    }

    // Validate pagination
    if (page < 1 || limit < 1) {
      res.status(400).json({
        success: false,
        message: "Page and limit must be positive integers",
      });
      return;
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Fetch products with pagination
    const products = await Product.find({})
      .select("name description unit category origin shelfLife image price actualPrice")
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total product count
    const totalProducts = await Product.countDocuments();

    if (!products || products.length === 0) {
      res.status(404).json({
        success: false,
        message: "No products found",
      });
      return;
    }

    // Fetch inventory for the store
    const inventory = await Inventory.findOne({ storeId }).lean();

    // Map products with inventory details
    const productsWithInventory = products.map((product) => {
      // Find inventory details for this product
      const inventoryItem = inventory?.products?.find(
        (item) => item.productId.toString() === product._id.toString()
      );

      // Default inventory values if not found
      const quantity = inventoryItem?.quantity || 0;
      const threshold = inventoryItem?.threshold || 0;
      const availability = inventoryItem?.availability ?? false;

      // Compute inventory status
      let inventoryStatus: string;
      if (!availability || quantity <= 0) {
        inventoryStatus = "outOfStock";
      } else if (quantity <= threshold) {
        inventoryStatus = "lowStock";
      } else if (quantity > threshold && !availability){
        inventoryStatus = "notAvailable"
      } 
      
      else {
        inventoryStatus = "inStock";
      }

      return {
        ...product,
        inventory: {
          quantity,
          threshold,
          availability,
          inventoryStatus,
        },
      };
    });

    // Return response
    res.status(200).json({
      success: true,
      message: "Products retrieved successfully",
      data: {
        products: productsWithInventory,
        pagination: {
          currentPage: page,
          limit,
          totalProducts,
          totalPages: Math.ceil(totalProducts / limit),
        },
      },
    });
  } catch (error: any) {
    console.error("Error retrieving products:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving products",
      error: error.message,
    });
  }
};
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = req.params.id;

    // Validate productId
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400).json({
        success: false,
        message: "Invalid productId format",
      });
      return;
    }

    // Fetch product by ID
    const product = await Product.findById(productId).lean();

    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    // Return response
    res.status(200).json({
      success: true,
      message: "Product retrieved successfully",
      data: product,
    });
  } catch (error: any) {
    console.error("Error retrieving product:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving product",
      error: error.message,
    });
  }
};
export const getStoreOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const storeId = req.query.storeId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Validate storeId
    if (!storeId) {
      res.status(400).json({
        success: false,
        message: "storeId is required",
      });
      return;
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      res.status(400).json({
        success: false,
        message: "Invalid storeId format",
      });
      return;
    }

    // Fetch orders for the store with pagination
    const orders = await Order.find({
      storeId: new mongoose.Types.ObjectId(storeId),
    })
      .populate("products.productId", "name description unit category origin shelfLife image price actualPrice",   "Product")
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total order count for the store
    const totalOrders = await Order.countDocuments({
      storeId: new mongoose.Types.ObjectId(storeId),
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalOrders / limit);

    res.status(200).json({
      success: true,
      data: {
        orders,
        totalOrders,
        currentPage: page,
        totalPages,
      },
    });
  } catch (err: any) {
    console.error("Error retrieving store orders:", err);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving store orders",
      error: err.message,
    });
  }
};// Adjust path to your Order model

export const changeOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, newStatus,storeId } = req.body;

    // Validate inputs
    if (!orderId || !newStatus || !storeId) {
      res.status(400).json({
        success: false,
        message: "orderId and newStatus and storeId  are required",
      });
      return;
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      res.status(400).json({
        success: false,
        message: "Invalid StoreiD format",
      });
      return;
    }

    // Validate newStatus
    const validStatuses = Object.values(OrderStatus);
    if (!validStatuses.includes(newStatus)) {
      res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
      return;
    }

    // Find the order
    const order = await Order.findOne({
      orderId,
      storeId: new mongoose.Types.ObjectId(storeId),
    });
    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    // Check if order is already cancelled
    if (order.status === OrderStatus.Cancelled) {
      res.status(400).json({
        success: false,
        message: "Cannot change status of a cancelled order",
      });
      return;
    }

    // Define allowed status transitions
    const allowedTransitions: { [key in OrderStatus]: OrderStatus[] } = {
      [OrderStatus.Placed]: [
        OrderStatus.Confirmed,
        OrderStatus.Shipped,
        OrderStatus.Cancelled,
      ],
      [OrderStatus.Confirmed]: [OrderStatus.Shipped, OrderStatus.Cancelled],
      [OrderStatus.Shipped]: [OrderStatus.Delivered, OrderStatus.Cancelled],
      [OrderStatus.Delivered]: [OrderStatus.Cancelled], // Optional, can be [] if no transitions
      [OrderStatus.Cancelled]: [],
    };

    // Validate status transition
    if (!allowedTransitions[order.status].includes(newStatus)) {
      res.status(400).json({
        success: false,
        message: `Invalid status transition from ${order.status} to ${newStatus}`,
      });
      return;
    }

    // Update the order status
    order.status = newStatus;
    await order.save();

    // Populate product details for response
    const updatedOrder = await Order.findOne({
      orderId,
      storeId
    })
      .populate("products.productId", "name description unit category origin shelfLife image price actualPrice","Product")
      .lean();

    res.status(200).json({
      success: true,
      message: `Order status updated to ${newStatus}`,
      data: updatedOrder,
    });
  } catch (err: any) {
    console.error("Error updating order status:", err);
    res.status(500).json({
      success: false,
      message: "Server error while updating order status",
      error: err.message,
    });
  }
};

export const downloadProductsCsv = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get store parameter
    const storeId = req.query.storeId as string;

    // Validate storeId
    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      res.status(400).json({
        success: false,
        message: "Valid storeId is required",
      });
      return;
    }

    // Fetch all products (no pagination)
    const products = await Product.find({})
      .select("name") // Only fetch name
      .lean();

    if (!products || products.length === 0) {
      res.status(404).json({
        success: false,
        message: "No products found",
      });
      return;
    }

    // Fetch inventory for the store
    const inventory = await Inventory.findOne({ storeId }).lean();

    // Map products with inventory details
    const csvData = products.map((product) => ({
      "productId": product._id.toString(),
      name: product.name,
      quantity: inventory?.products?.find(
        (item) => item.productId.toString() === product._id.toString()
      )?.quantity || 0,
      threshold: inventory?.products?.find(
        (item) => item.productId.toString() === product._id.toString()
      )?.threshold || 0,
      availability: (
        inventory?.products?.find(
          (item) => item.productId.toString() === product._id.toString()
        )?.availability ?? false
      ).toString(),
    }));

    // Generate CSV using PapaParse
    const csvContent = Papa.unparse(csvData, {
      header: true,
      columns: ["productId", "name", "quantity", "threshold", "availability"],
    });

    // Set response headers for CSV download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=products.csv");

    // Send CSV content
    res.status(200).send(csvContent);
  } catch (error: any) {
    console.error("Error generating products CSV:", error);
    res.status(500).json({
      success: false,
      message: "Server error while generating products CSV",
      error: error.message,
    });
  }
};


// Define interfaces for type safety
interface ProductDocument {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  [key: string]: any; // For other product properties
}

interface ProductInventoryItem {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  threshold: number;
  availability: boolean;
  [key: string]: any; // For other inventory item properties
}

interface InventoryDocument {
  _id: mongoose.Types.ObjectId | string;
  storeId: mongoose.Types.ObjectId;
  products: ProductInventoryItem[];
  save(): Promise<InventoryDocument>;
  [key: string]: any; // For other inventory properties
}

interface CSVRow {
  productId: string;
  name: string;
  quantity: string;
  threshold: string;
  availability: string;
  [key: string]: string; // For any additional columns
}

interface ProcessingResult {
  processedRows: string[];
  addedProducts: Array<{ productId: string; name: string }>;
  updatedProducts: Array<{ productId: string; name: string }>;
  errors: Array<{ row: number; message: string }>;
}

/**
 * Uploads and processes a CSV file to update inventory
 * @param req Express request object
 * @param res Express response object
 */
export const uploadInventoryCsv = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate storeId
    const storeId = req.query.storeId as string;
    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      res.status(400).json({
        success: false,
        message: 'Valid storeId is required',
      });
      return;
    }

    // Validate file upload
    if (!req.file || !req.file.buffer) {
      res.status(400).json({
        success: false,
        message: 'CSV file is required',
      });
      return;
    }

    // Log file size for debugging
    console.log(`Received file buffer size: ${req.file.buffer.length} bytes`);

    // Convert buffer to string
    const csvString = req.file.buffer.toString('utf8');
    console.log(`CSV sample: ${csvString.substring(0, 200)}`);

    // Parse CSV using PapaParse with proper typing
    const parseResult = Papa.parse<CSVRow>(csvString, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string): string => header.trim(),
      // transformHeader: (header: string): string => header.trim(),
    });

    if (parseResult.errors && parseResult.errors.length > 0) {
      console.error('CSV parsing errors:', parseResult.errors);
      res.status(400).json({
        success: false,
        message: 'Error parsing CSV file',
        errors: parseResult.errors,
      });
      return;
    }

    // Get data rows
    const rows = parseResult.data;
    console.log(`Parsed ${rows.length} rows from CSV`);

    // Initialize results
    const result: ProcessingResult = {
      processedRows: [],
      addedProducts: [],
      updatedProducts: [],
      errors: [],
    };

    // Get or create inventory for the store
    const objectIdStoreId = new mongoose.Types.ObjectId(storeId);
    let inventory = await Inventory.findOne({ storeId: objectIdStoreId }) as InventoryDocument | null;
    
    if (!inventory) {
      inventory = new Inventory({
        storeId: objectIdStoreId,
        products: [],
      }) as InventoryDocument;
      await inventory.save();
      console.log(`Created new inventory for store: ${storeId}`);
    }

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 1; // 1-based index for error reporting
      
      try {
        console.log(`Processing row ${rowIndex}:`, row);
        
        // Extract and validate product ID
        const productId = row.productId?.trim();
        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
          result.errors.push({ row: rowIndex, message: `Invalid productId: ${productId}` });
          continue;
        }

        // Verify product exists
        const product = await Product.findById(productId).lean() as ProductDocument | null;
        if (!product) {
          result.errors.push({ row: rowIndex, message: `Product not found: ${productId}` });
          continue;
        }

        // Extract product name for logging only
        const productName = row.name?.trim() || product.name || 'Unknown';

        // Parse and validate quantity
        const quantityValue = row.quantity?.toString().trim() || '';
        const quantity = parseInt(quantityValue);
        if (isNaN(quantity) || quantity < 0) {
          result.errors.push({ row: rowIndex, message: `Invalid quantity: ${quantityValue}` });
          continue;
        }

        // Parse and validate threshold
        const thresholdValue = row.threshold?.toString().trim() || '';
        const threshold = parseInt(thresholdValue);
        if (isNaN(threshold) || threshold < 0) {
          result.errors.push({ row: rowIndex, message: `Invalid threshold: ${thresholdValue}` });
          continue;
        }

        // Parse and validate availability
        const availabilityValue = row.availability?.toString().toLowerCase().trim() || '';
        if (availabilityValue !== 'true' && availabilityValue !== 'false') {
          result.errors.push({ row: rowIndex, message: `Invalid availability: ${row.availability}` });
          continue;
        }
        const isAvailable = availabilityValue === 'true';

        // Create product inventory object
        const productInventory: ProductInventoryItem = {
          productId: new mongoose.Types.ObjectId(productId),
          quantity,
          threshold,
          availability: isAvailable,
        };

        // Check if product exists in inventory
        const existingProductIndex = inventory.products.findIndex(
          (item) => item.productId.toString() === productId
        );

        if (existingProductIndex !== -1) {
          // Update existing product
          inventory.products[existingProductIndex] = {
            ...inventory.products[existingProductIndex],
            ...productInventory,
          };
          result.updatedProducts.push({ productId, name: productName });
          console.log(`Updated product: ${productId} (${productName})`);
        } else {
          // Add new product to inventory
          inventory.products.push(productInventory);
          result.addedProducts.push({ productId, name: productName });
          console.log(`Added product: ${productId} (${productName})`);
        }

        result.processedRows.push(productId);
      } catch (err) {
        const error = err as Error;
        result.errors.push({ row: rowIndex, message: `Error processing row: ${error.message}` });
        console.error(`Error in row ${rowIndex}:`, error.message);
      }
    }

    // Save the updated inventory if any changes were made
    if (result.processedRows.length > 0) {
      try {
        await inventory.save();
        console.log('Inventory saved successfully');
      } catch (err) {
        const saveErr = err as Error;
        console.error('Error saving inventory:', saveErr);
        res.status(500).json({
          success: false,
          message: 'Error saving inventory',
          error: saveErr.message,
        });
        return;
      }
    }

    // Log final results
    console.log('Final results:', {
      processedCount: result.processedRows.length,
      addedCount: result.addedProducts.length,
      updatedCount: result.updatedProducts.length,
      errorCount: result.errors.length,
    });

    // Return response
    res.status(200).json({
      success: true,
      message: 'Inventory updated successfully',
      data: {
        processedCount: result.processedRows.length,
        processedProductIds: result.processedRows,
        addedCount: result.addedProducts.length,
        addedProducts: result.addedProducts,
        updatedCount: result.updatedProducts.length,
        updatedProducts: result.updatedProducts,
        errorCount: result.errors.length,
        errors: result.errors,
      },
    });
  } catch (err) {
    const error = err as Error;
    console.error('Error processing inventory CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing inventory CSV',
      error: error.message,
    });
  }
};