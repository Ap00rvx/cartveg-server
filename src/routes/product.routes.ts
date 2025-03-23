import { Router } from "express";
import { createMultipleProducts,getProducts,searchProducts } from "../controller/product.controller" ; 

const router = Router();

router.get("/", getProducts);
router.post("/create", createMultipleProducts);   
router.get("/search", searchProducts);

export default router;

