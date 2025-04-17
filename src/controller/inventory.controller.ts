import { Request, Response } from "express";
import mongoose from "mongoose";
import { Inventory } from "../models/inventory.model"; // Adjust path to your Inventory model
import { Store } from "../models/store.model"; // Adjust path to your Store model
import  Product  from "../models/product.model"; // Adjust path to your Product model (assumed)
import { IProduct } from "../types/interface/interface";

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
      const { storeId } = req.params;
  
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
          select: "name description unit category origin shelfLife image", // Select specific fields
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

export const updateProductAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
        const { storeId, productId, availability }: UpdateStockRequest = req.body;
    
        // Validate required fields
        if (!storeId || !productId || availability === undefined) {
        res.status(400).json({
            success: false,
            message: "storeId, productId, and availability are required",
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
    
        // Update product availability
        inventory.products[productIndex].availability = availability;
    
        // Save the updated inventory
        await inventory.save();
    
        res.status(200).json({
        success: true,
        message: "Product availability updated successfully",
        data: inventory,
        });
    } catch (error: any) {
        console.error("Error updating product availability:", error);
        res.status(500).json({
        success: false,
        message: "Server error while updating product availability",
        error: error.message,
        });
    }
}

export const updateProductThreshold = async(req: Request, res: Response): Promise<void> => {
    try {
        const { storeId, productId, threshold }: UpdateStockRequest = req.body;
    
        // Validate required fields
        if (!storeId || !productId || threshold === undefined) {
            res.status(400).json({
                success: false,
                message: "storeId, productId, and threshold are required",
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
    
        // Update product threshold
        inventory.products[productIndex].threshold = threshold;
    
        // Save the updated inventory
        await inventory.save();
    
        res.status(200).json({
            success: true,
            message: "Product threshold updated successfully",
            data: inventory,
        });
    } catch (error: any) {
        console.error("Error updating product threshold:", error);
        res.status(500).json({
            success: false,
            message: "Server error while updating product threshold",
            error: error.message,
        });
    }
}

