import { Router } from "express";
import { uploadMany } from "../utils/multer.js";
import { uploadInvoice } from "../controllers/upload.controller.js";

const router = Router();
router.post("/", isLoggedIn, uploadMany, uploadInvoice);
export default router;