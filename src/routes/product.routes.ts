import { Router } from "express";
import { getProductsByLocation,getAllProductsWithAvailability,getAvailableProductsWithCategory} from "../controller/product.controller" ; 

const router = Router();

router.get("/", getProductsByLocation);   
router.get("/list", getAllProductsWithAvailability); // 
router.get("/category", getAvailableProductsWithCategory); //
// router.get("/search", searchProducts);
// router.get("/ids",getAvailableProductIds);

export default router;

