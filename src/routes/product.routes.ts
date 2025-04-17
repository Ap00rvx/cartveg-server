import { Router } from "express";
import { getProductsByLocation,getAllProductsWithAvailability} from "../controller/product.controller" ; 

const router = Router();

router.get("/", getProductsByLocation);   
router.get("/list", getAllProductsWithAvailability); // 
// router.get("/search", searchProducts);
// router.get("/ids",getAvailableProductIds);

export default router;

