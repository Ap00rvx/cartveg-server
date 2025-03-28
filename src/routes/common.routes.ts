import { getProductCategories,getInvoice} from "../controller/common.controller";
import { Router } from "express";

const router = Router();

router.get("/categories", getProductCategories);
router.get("/invoice", getInvoice);



export default router;