import { getProductCategories } from "../controller/common.controller";
import { Router } from "express";

const router = Router();

router.get("/categories", getProductCategories);



export default router;