import { Router } from "express";
import { uploadMany } from "../utils/multer.js";
import {
  getInvoices,
  getInvoiceById,
  getRejectedInvoice,
  uploadInvoice,
  getInvoiceForHumanReview, 
  approveItem,
  rejectItem

} from "../controllers/invoice.controller.js";

import {isLoggedIn} from './../middlewares/auth.middlewares.js'

const router = Router();
router.use(isLoggedIn)
router.post("/", uploadMany, uploadInvoice);
router.post("/accept/:id", approveItem);
router.post("/reject/:id", rejectItem);

router.get("/", getInvoices);
router.get("/rejected", getRejectedInvoice);
router.get("/:id", getInvoiceById);
router.get('/humanreview' , getInvoiceForHumanReview)

export default router;
