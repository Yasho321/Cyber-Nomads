import { Router } from "express";
import { uploadMany } from "../utils/multer.js";
import { uploadInvoice , getAllUploads , getUploadById , exportUpload} from "../controllers/upload.controller.js";
import { isLoggedIn } from "../middlewares/auth.middlewares.js";
const router = Router();

router.get("/" , getAllUploads)
router.get("/:id" , getUploadById)
router.get("/:id/export" , exportUpload)
router.post("/", isLoggedIn, uploadMany, uploadInvoice);

export default router;
