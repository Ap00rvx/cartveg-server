import { Router } from "express";
import { createMultipleProducts,getProducts } from "../controller/product.controller" ; 

const router = Router();

router.get("/", getProducts);
router.post("/create", createMultipleProducts);   


export default router;

