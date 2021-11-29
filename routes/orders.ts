import express from "express";
import controller from "../controllers/orders";

const router = express.Router();

router.get("/orders", controller.getOrders);

export = router;
