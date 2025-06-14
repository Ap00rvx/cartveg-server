import { Request, Response } from "express";
import mongoose from "mongoose";
import { Store } from "../models/store.model"; // Adjust path to your Store model
import { Inventory } from "../models/inventory.model"; // Adjust path to your Inventory model
import Product from "../models/product.model"; // Adjust path to your Product model

// Haversine formula to calculate distance between two points (in kilometers)
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Interface for populated product in inventory
interface PopulatedProduct {
  productId: mongoose.Types.ObjectId & {
    name: string;
    description: string;
    unit: string;
    price: number;
    actualPrice?: number;
    category: string;
    origin: string;
    shelfLife: string;
    image: string;
  };
  quantity: number;
  threshold: number;
  availability: boolean;
}

// Controller to search products by user location using latitude and longitude
export const getProductsByLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get query parameters
    const latitude = parseFloat(req.query.latitude as string);
    const longitude = parseFloat(req.query.longitude as string);
    const category = req.query.category as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Validate latitude and longitude
    if (isNaN(latitude) || isNaN(longitude)) {
      res.status(400).json({
        success: false,
        message: "Valid latitude and longitude are required",
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

    // Fetch all stores
    const stores = await Store.find()
      .select("name address phone email latitude longitude radius openingTime")
      .lean();

    if (!stores || stores.length === 0) {
      res.status(404).json({
        success: false,
        message: "No stores found",
      });
      return;
    }

    // Find the nearest store within its radius
    let nearestStore: any = null;
    let minDistance = Infinity;

    for (const store of stores) {
      const distance = haversineDistance(latitude, longitude, store.latitude, store.longitude);
      console.log("Distance to store:", distance, "km");
      if (distance <= store.radius && distance < minDistance) {
        minDistance = distance;
        nearestStore = store;
      }
    }

    if (!nearestStore) {
      res.status(404).json({
        success: false,
        message: "No stores found within their service radius",
      });
      return;
    }

    // Find inventory for the nearest store
    const inventory = await Inventory.findOne({ storeId: nearestStore._id })
      .populate({
        path: "products.productId",
        select: "name description unit price actualPrice category origin shelfLife image",
        match: category ? { category } : {}, // Filter by category if provided
      })
      .lean();

    if (!inventory) {
      res.status(404).json({
        success: false,
        message: "No inventory found for the nearest store",
      });
      return;
    }

    // Filter available products and paginate
    const availableProducts = (inventory.products as PopulatedProduct[])
      .filter((product) => product.availability && product.productId) // Only available products with valid productId
      .map((product) => ({
        productId: product.productId._id,
        quantity: product.quantity,
        threshold: product.threshold,
        availability: product.availability,
        details: {
          name: product.productId.name,
          description: product.productId.description,
          unit: product.productId.unit,
          price: product.productId.price,
          actualPrice: product.productId.actualPrice,
          category: product.productId.category,
          origin: product.productId.origin,
          shelfLife: product.productId.shelfLife,
          image: product.productId.image,
        },
      }));

      // caluclate a avg delivery time based on distance
    const deliveryTime = Math.round(minDistance * 5); // Assuming 1 km takes 5 minutes to deliver
    

    
    // Paginate results
    const totalProducts = availableProducts.length;
    const startIndex = (page - 1) * limit;
    const paginatedProducts = availableProducts.slice(startIndex, startIndex + limit);

    // Return response
    res.status(200).json({
      success: true,
      message: "Products retrieved successfully from nearest store",
      data: {
        store: {
          _id: nearestStore._id,
          name: nearestStore.name,
          address: nearestStore.address,
          phone: nearestStore.name,
          email: nearestStore.email,
          latitude: nearestStore.latitude,
          longitude: nearestStore.longitude,
          radius: nearestStore.radius,
          openingTime: nearestStore.openingTime,
        },
        products: paginatedProducts,
        deliveryTime: `${deliveryTime} minutes`,
        pagination: {
          currentPage: page,
          limit,
          totalProducts,
          totalPages: Math.ceil(totalProducts / limit),
        },
      },
    });
  } catch (error: any) {
    console.error("Error searching products by location:", error);
    res.status(500).json({
      success: false,
      message: "Server error while searching products",
      error: error.message,
    });
  }
};

export const getStoreDetailsWithLatlong = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get query parameters
    const latitude = parseFloat(req.query.latitude as string);
    const longitude = parseFloat(req.query.longitude as string);

    // Validate latitude and longitude
    if (isNaN(latitude) || isNaN(longitude)) {
      res.status(400).json({
        success: false,
        message: "Valid latitude and longitude are required",
      });
      return;
    }

    // Fetch all stores
    const stores = await Store.find()
      .select("name address phone email latitude longitude radius openingTime")
      .lean();

    if (!stores || stores.length === 0) {
      res.status(404).json({
        success: false,
        message: "No stores found",
      });
      return;
    }

    // Find the nearest store within its radius
    let nearestStore: any = null;
    let minDistance = Infinity;

    for (const store of stores) {
      const distance = haversineDistance(latitude, longitude, store.latitude, store.longitude);
      console.log(`Distance to store ${store.name}: ${distance} km`);
      if (distance <= store.radius && distance < minDistance) {
        minDistance = distance;
        nearestStore = store;
      }
    }

    if (!nearestStore) {
      res.status(404).json({
        success: false,
        message: "No stores found within their service radius",
      });
      return;
    }

    // Calculate average delivery time based on distance (assuming 5 minutes per km)
    const deliveryTime = Math.round(minDistance * 5);

    // Return response with store details
    res.status(200).json({
      success: true,
      message: "Nearest store details retrieved successfully",
      data: {
        store: {
          _id: nearestStore._id,
          name: nearestStore.name,
          address: nearestStore.address,
          phone: nearestStore.phone,
          email: nearestStore.email,
          latitude: nearestStore.latitude,
          longitude: nearestStore.longitude,
          radius: nearestStore.radius,
          openingTime: nearestStore.openingTime,
        },
        deliveryTime: `${deliveryTime} minutes`,
        distance: minDistance.toFixed(2), // Distance in kilometers
      },
    });
  } catch (error: any) {
    console.error("Error fetching store details by location:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching store details",
      error: error.message,
    });
  }
}

// Controller to get  products by store ID without pagination
export const getAllProductsWithAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get query parameters
      const latitude = parseFloat(req.query.latitude as string);
      const longitude = parseFloat(req.query.longitude as string);

  
      // Validate latitude and longitude
      if (isNaN(latitude) || isNaN(longitude)) {
        res.status(400).json({
          success: false,
          message: "Valid latitude and longitude are required",
        });
        return;
      }
  

      // Fetch all stores
      const stores = await Store.find()
        .select("name latitude longitude radius")
        .lean();
  
      if (!stores || stores.length === 0) {
        res.status(404).json({
          success: false,
          message: "No stores found",
        });
        return;
      }
  
      // Find the nearest store within its radius
      let nearestStore: any = null;
      let minDistance = Infinity;
  
      for (const store of stores) {
        const distance = haversineDistance(latitude, longitude, store.latitude, store.longitude);
        if (distance <= store.radius && distance < minDistance) {
          minDistance = distance;
          nearestStore = store;
        }
      }
  
      if (!nearestStore) {
        res.status(404).json({
          success: false,
          message: "No stores found within their service radius",
        });
        return;
      }
  
      // Fetch inventory for the nearest store
      const inventory = await Inventory.findOne({ storeId: nearestStore._id })
        .select("products.productId products.availability")
        .lean();
  
      // Create a map of available product IDs
      const availableProductIds = new Set(
        inventory?.products
          ?.filter((product) => product.availability)
          .map((product) => product.productId.toString()) || []
      );
  
      // Fetch all products with pagination
     
      const products = await Product.find()
        .select("name description unit price actualPrice category origin shelfLife image")
        
        .lean();
  
      const totalProducts = await Product.countDocuments();
  
      // Format products with availability
      const formattedProducts = products.map((product) => ({
        _id: product._id,
        name: product.name,
        description: product.description,
        unit: product.unit,
        price: product.price,
        actualPrice: product.actualPrice,
        category: product.category,
        origin: product.origin,
        shelfLife: product.shelfLife,
        image: product.image,
        availability: availableProductIds.has(product._id.toString()),
      }));
  
      // Return response
      res.status(200).json({
        success: true,
        message: "Products retrieved successfully with availability",
        data: {
          store: {
            _id: nearestStore._id,
            name: nearestStore.name,
            latitude: nearestStore.latitude,
            longitude: nearestStore.longitude,
            radius: nearestStore.radius,
          },
          products: formattedProducts,
          
        },
      });
    } catch (error: any) {
      console.error("Error fetching products with availability:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching products",
        error: error.message,
      });
    }
};

export const getAvailableProductsWithCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = req.query.category as string | undefined; // Get category from query parameters
    const latitude = parseFloat(req.query.latitude as string);
    const longitude = parseFloat(req.query.longitude as string);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Validate latitude and longitude
    if (isNaN(latitude) || isNaN(longitude)) {
      res.status(400).json({
        success: false,
        message: "Valid latitude and longitude are required",
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

    // Validate category if provided
    if (category && !category.trim()) {
      res.status(400).json({
        success: false,
        message: "Category cannot be empty",
      });
      return;
    }

    // Fetch all stores
    const stores = await Store.find()
      .select("name address phone email latitude longitude radius openingTime")
      .lean();

    if (!stores || stores.length === 0) {
      res.status(404).json({
        success: false,
        message: "No stores found",
      });
      return;
    }

    // Find the nearest store within its radius
    let nearestStore: any = null;
    let minDistance = Infinity;

    for (const store of stores) {
      const distance = haversineDistance(latitude, longitude, store.latitude, store.longitude);
      if (distance <= store.radius && distance < minDistance) {
        minDistance = distance;
        nearestStore = store;
      }
    }

    if (!nearestStore) {
      res.status(404).json({
        success: false,
        message: "No stores found within their service radius",
      });
      return;
    }

    // Prepare case-insensitive regex for category
    const categoryRegex = category ? new RegExp(escapeRegex(category), "i") : undefined;

    // Log the regex for debugging
    console.log("Category regex:", categoryRegex?.toString());

    // Find inventory for the nearest store
    const inventory = await Inventory.findOne({ storeId: nearestStore._id })
      .populate({
        path: "products.productId",
        select: "name description unit price actualPrice category origin shelfLife image",
        match: categoryRegex ? { category: { $regex: categoryRegex } } : {}, // Filter by category (case-insensitive)
      })
      .lean();

    // Log populated products for debugging
    console.log("Populated products:", inventory?.products?.length || 0);

    if (!inventory) {
      res.status(404).json({
        success: false,
        message: "No inventory found for the nearest store",
      });
      return;
    }

    // Filter available products and paginate
    const availableProducts = (inventory.products as PopulatedProduct[])
      .filter((product) => product.availability && product.productId) // Only available products with valid productId
      .map((product) => ({
        productId: product.productId._id,
        quantity: product.quantity,
        threshold: product.threshold,
        availability: product.availability,
        details: {
          name: product.productId.name,
          description: product.productId.description,
          unit: product.productId.unit,
          price: product.productId.price,
          actualPrice: product.productId.actualPrice,
          category: product.productId.category,
          origin: product.productId.origin,
          shelfLife: product.productId.shelfLife,
          image: product.productId.image,
        },
      }));

    // Paginate results
    const totalProducts = availableProducts.length;
    const startIndex = (page - 1) * limit;
    const paginatedProducts = availableProducts.slice(startIndex, startIndex + limit);

    // Return response
    res.status(200).json({
      success: true,
      message: "Available products retrieved successfully",
      data: {
        store: {
          _id: nearestStore._id,
          name: nearestStore.name,
          address: nearestStore.address,
          phone: nearestStore.phone,
          email: nearestStore.email,
          latitude: nearestStore.latitude,
          longitude: nearestStore.longitude,
          radius: nearestStore.radius,
          openingTime: nearestStore.openingTime,
        },
        products: paginatedProducts,
        pagination: {
          currentPage: page,
          limit,
          totalProducts,
          totalPages: Math.ceil(totalProducts / limit),
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching products by category:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching products by category",
      error: error.message,
    });
  }
};
// Escape special regex characters
const escapeRegex = (text: string): string => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
