// @ts-nocheck
import express from "express";
import { 
  getProductCount, 
  createProducts, 
  getProducts 
} from "../controllers/productController.js";

const router = express.Router();

// Product routes
router.get("/count", getProductCount);
router.post("/", createProducts);
router.get("/", getProducts);

export default router;
