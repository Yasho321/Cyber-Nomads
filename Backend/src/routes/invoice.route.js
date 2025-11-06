import { Router } from "express";
import { uploadMany } from "../utils/multer.js";
import {
  getInvoices,
  getInvoiceById,
  getRejectedInvoice,
  uploadInvoice,
<<<<<<< HEAD
  getUploadsForHumanReview, 
=======
  approveItem,
  rejectItem
>>>>>>> 94ae76a (Added approve and rejecteditems)
} from "../controllers/invoice.controller.js";

import {isLoggedIn} from './../middlewares/auth.middlewares.js'

const router = Router();
router.use(isLoggedIn)
router.post("/", uploadMany, uploadInvoice);
<<<<<<< HEAD
router.get("/", getInvoices);
router.get("/rejected", getRejectedInvoice);
router.get("/:id", getInvoiceById);
router.get('/humanreview' , getUploadsForHumanReview)
=======
router.post("/:id", approveItem);
router.post("/:id", rejectItem);

router.get("/", getInvoices);
router.get("/rejected", getRejectedInvoice);
router.get("/:id", getInvoiceById);
router.get("/", exportall);
>>>>>>> 94ae76a (Added approve and rejecteditems)

export default router;
