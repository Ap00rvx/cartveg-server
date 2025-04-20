import { Request, Response } from "express";
import mongoose from "mongoose";
import { Inventory } from "../models/inventory.model"; // Adjust path to your Inventory model
import { Store } from "../models/store.model"; // Adjust path to your Store model
import  Product  from "../models/product.model"; // Adjust path to your Product model (assumed)
import { IProduct, OrderStatus } from "../types/interface/interface";
import Order from "../models/order.model";
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

interface PopulatedProduct {
    productId: IProduct & { _id: mongoose.Types.ObjectId }; // Populated with IProduct fields
    quantity: number;
    threshold: number;
    availability: boolean;
  }
  
  // Controller to get all products in a store's inventory with product details
  export const getInventoryProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get storeId from params
      console.log(req.query); 
      const storeId = req.query.storeId as string;
  
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
  
      // Find inventory and populate product details
      const inventory = await Inventory.findOne({ storeId })
        .populate({
          path: "products.productId",
          model: "Product",
          select: "name description unit category origin shelfLife image price actualPrice",
        })
        .lean();
  
      // Check if inventory exists
      if (!inventory) {
        res.status(404).json({
          success: false,
          message: "Inventory not found for this store",
        });
        return;
      }
  
      // Format response to combine inventory and product details
      const formattedProducts = (inventory.products as unknown as PopulatedProduct[] || []).map((product) => {
        // Ensure productId is populated and has IProduct fields
        if (!product.productId || !("name" in product.productId)) {
          return {
            productId: product.productId, // Fallback to ObjectId if not populated
            quantity: product.quantity,
            threshold: product.threshold,
            availability: product.availability,
            details: null, // Indicate missing product details
          };
        }
  
        return {
          productId: product.productId._id,
          quantity: product.quantity,
          threshold: product.threshold,
          availability: product.availability,
          details: {
            name: product.productId.name,
            description: product.productId.description,
            unit: product.productId.unit,
            category: product.productId.category,
            origin: product.productId.origin,
            shelfLife: product.productId.shelfLife,
            image: product.productId.image,
            price: product.productId.price,
            actualPrice: product.productId.actualPrice,
          },
        };
      });
  
      // Return formatted response
      res.status(200).json({
        success: true,
        message: "Inventory products retrieved successfully",
        data: {
          storeId,
          products: formattedProducts,
        },
      });
    } catch (error: any) {
      console.error("Error retrieving inventory products:", error);
      res.status(500).json({
        success: false,
        message: "Server error while retrieving inventory products",
        error: error.message,
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
    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

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
      .select("-__v") // Exclude __v field
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

    // Return response
    res.status(200).json({
      success: true,
      message: "Products retrieved successfully",
      data: {
        products,
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
