import { Router } from "express";
import { getProducts,searchProducts ,getSearchProductList,getAvailableProductIds} from "../controller/product.controller" ; 

const router = Router();

router.get("/", getProducts);   
router.get("/list", getSearchProductList); // 
router.get("/search", searchProducts);
router.get("/ids",getAvailableProductIds);

export default router;

