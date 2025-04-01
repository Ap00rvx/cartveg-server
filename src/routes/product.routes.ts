import { Router } from "express";
import { getProducts,searchProducts ,getSearchProductList} from "../controller/product.controller" ; 

const router = Router();

router.get("/", getProducts);   
router.get("/list", getSearchProductList); // 
router.get("/search", searchProducts);

export default router;

