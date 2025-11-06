import { Queue } from "bullmq";
import "dotenv/config";
import Invoice from "../models/invoice.model.js";
import Upload from "../models/upload.model.js";

const invoiceQueue = new Queue("invoice", {
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});
export const uploadInvoice = async (req, res) => {
  try {
    const files = req.files;
    const jobs = [];
    const invoices = [];
    const userId= req.user._id

    

    for (const file of files) {
      const invoice = await Invoice.create({
        fileName: file.originalname,
      });

      const job = await invoiceQueue.add(
        "process-invoice",
        {
          filepath: file.path,
          fileMimeType: file.mimetype,
          invoiceId: invoice._id,
        },
        {
          attempts: 3,
          backoff: {
            type: "fixed",
            delay: 1000,
          },
        }
      );
      jobs.push(job.id);
      invoices.push(invoice._id);
    }
    const upload = await Upload.create({
      uploadedBy: userId,
      invoiceId: invoices,
    });


    return res.status(200).json({
      success: true,
      data: {
        upload
      },
      message: "Invoice uploaded successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error uploading invoice",
    });
  }
};