import Invoice from "../models/invoice.model.js";
import { Queue } from "bullmq";
import "dotenv/config";

const Invoice = require("../models/invoice.js");

const invoiceQueue = new Queue("invoice", {
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

export const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find();
    return res.status(200).json({
      success: true,
      data: invoices,
      message: "Invoices fetched successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error fetching invoices",
    });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    return res.status(200).json({
      success: true,
      data: invoice,
      message: "Invoice fetched successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error fetching invoice",
    });
  }
};

export const getRejectedInvoice = async (req, res) => {
  try {
    const rejectedInvoices = await Invoice.find({ status: "rejected" });
    return res.status(200).json({
      success: true,
      data: rejectedInvoices,
      message: "Rejected invoices fetched successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Error fetching rejected invoices",
    });
  }
};

export const uploadInvoice = async (req, res) => {
  try {
    const files = req.files;
    const jobs = [];
    const invoices = [];
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
      invoices.push(invoice);
    }

    return res.status(200).json({
      success: true,
      data: {
        jobs,
        invoices,
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


export const approveItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Invoice.findById(id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    item.status = "approved";
    await item.save();
    res.status(200).json({ message: "Item approved successfully", item });
  } catch (error) {
    console.error("Error approving item:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const rejectItem = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    invoice.status = "rejected";
    await invoice.save();
    res.status(200).json({ message: "Invoice rejected successfully", invoice });
  } catch (error) {
    console.error("Error rejecting invoice:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
