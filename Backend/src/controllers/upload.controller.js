import express from 'express'
import Upload from './../models/upload.model.js'
import { Queue } from "bullmq";
import "dotenv/config";
import Invoice from "../models/invoice.model.js";
import { Parser } from "json2csv"

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

export const getAllUploads = async(req , res , next) => {
    
       try {

         const uploads = await Upload.find().populate({
            path : "invoiceId" ,
            select : "vendor invoiceDetails totalInvoiceValue totalGSTValue status"
         })

         res.status(200).json(
            {
                status : "Success" ,
                data : uploads
            }
         )

       }
       catch(err) {

        res.status(500).json( 
            {
                status : "Failed" ,
                error : err
            }
        )

       }

}


export const getUploadById = async (req , res , next) => {
    
    try {

        const uploads = await Upload.findById(req.params.id).populate({
            path : "invoiceId" ,
            select : "vendor invoiceDetails totalInvoiceValue totalGSTValue status"
         })

         res.status(200).json(
            {
                status : "Success" ,
                data : uploads
            }
         )

    }
    catch(err) {
        res.status(500).json(
            {
                status : "Failed" ,
                error : err
            }
        )
    }

}

function invoiceBaseRow(inv = {}) {
  return {
    invoiceId: inv._id ? String(inv._id) : "",
    fileName: inv.fileName ?? "",
    status: inv.status ?? "",
    vendorName: inv.vendor?.name ?? "",
    vendorAddress: inv.vendor?.address ?? "",
    vendorTaxNumber: inv.vendor?.taxNumber ?? "",
    vendorPhone: inv.vendor?.phone ?? "",
    invoiceNumber: inv.invoiceDetails?.number ?? "",
    invoiceDate: inv.invoiceDetails?.date ?? "",
    totalInvoiceValue: inv.totalInvoiceValue ?? "",
    totalGSTValue: inv.totalGSTValue ?? "",
    humanReviewNeeded:
      inv.review && typeof inv.review.humanReviewNeeded !== "undefined"
        ? inv.review.humanReviewNeeded
        : "",
    reasonForReview: inv.review?.reasonForReview ?? "",
    rejectionReason: inv.rejectionReason ?? "",
    createdAt: inv.createdAt ? new Date(inv.createdAt).toISOString() : "",
    updatedAt: inv.updatedAt ? new Date(inv.updatedAt).toISOString() : "",
  };
}

export const exportUpload = async (req, res, next) => {
  try {
    // read query params and set defaults
    const rowPerItem = String(req.query.rowPerItem).toLowerCase() === "true";
    const filename =
      req.query.filename ?? `invoices-${new Date().toISOString().slice(0, 10)}.csv`;

    // get the Upload by id and populate invoiceId
    const uploads = await Upload.findById(req.params.id).populate("invoiceId").lean();

    if (!uploads) {
      return res
        .status(404)
        .json({ status: "Failed", error: "No uploads found for the given id." });
    }

    // Collect invoices: `uploads.invoiceId` is expected to be an array (populated)
    const invoices = [];
    if (!Array.isArray(uploads.invoiceId)) {
      // if invoiceId isn't an array, handle gracefully
      console.warn("upload.invoiceId is not an array; converting to array if possible");
      if (uploads.invoiceId) invoices.push(uploads.invoiceId);
    } else {
      for (const invEntry of uploads.invoiceId) {
        if (!invEntry) {
          console.log("Invalid invoice, not pushing into the array");
          continue;
        }
        // invEntry is populated invoice doc (object) — push directly
        invoices.push(invEntry);
      }
    }

    if (invoices.length === 0) {
      return res
        .status(404)
        .json({ status: "Failed", error: "No invoices found in the selected uploads." });
    }

    // Prepare CSV fields (labels). Different sets depending on rowPerItem.
    let fields;
    if (rowPerItem) {
      fields = [
        { label: "Invoice ID", value: "invoiceId" },
        { label: "File Name", value: "fileName" },
        { label: "Status", value: "status" },
        { label: "Vendor Name", value: "vendorName" },
        { label: "Vendor Address", value: "vendorAddress" },
        { label: "Vendor Tax Number", value: "vendorTaxNumber" },
        { label: "Vendor Phone", value: "vendorPhone" },
        { label: "Invoice Number", value: "invoiceNumber" },
        { label: "Invoice Date", value: "invoiceDate" },
        { label: "Item Name", value: "itemName" },
        { label: "Item Qty", value: "itemQty" },
        { label: "Item Rate", value: "itemRate" },
        { label: "Total Invoice Value", value: "totalInvoiceValue" },
        { label: "Total GST Value", value: "totalGSTValue" },
        { label: "Human Review Needed", value: "humanReviewNeeded" },
        { label: "Reason For Review", value: "reasonForReview" },
        { label: "Rejection Reason", value: "rejectionReason" },
        { label: "Invoice Created At", value: "createdAt" },
      ];
    } else {
      fields = [
        { label: "Invoice ID", value: "invoiceId" },
        { label: "File Name", value: "fileName" },
        { label: "Status", value: "status" },
        { label: "Vendor Name", value: "vendorName" },
        { label: "Vendor Address", value: "vendorAddress" },
        { label: "Vendor Tax Number", value: "vendorTaxNumber" },
        { label: "Vendor Phone", value: "vendorPhone" },
        { label: "Invoice Number", value: "invoiceNumber" },
        { label: "Invoice Date", value: "invoiceDate" },
        { label: "Items (JSON)", value: "items" },
        { label: "Items Count", value: "itemsCount" },
        { label: "Total Invoice Value", value: "totalInvoiceValue" },
        { label: "Total GST Value", value: "totalGSTValue" },
        { label: "Human Review Needed", value: "humanReviewNeeded" },
        { label: "Reason For Review", value: "reasonForReview" },
        { label: "Rejection Reason", value: "rejectionReason" },
        { label: "Invoice Created At", value: "createdAt" },
      ];
    }

    // Build CSV rows
    const rows = [];
    for (const inv of invoices) {
      const base = invoiceBaseRow(inv);
      if (rowPerItem) {
        const items = Array.isArray(inv.items) ? inv.items : [];
        if (items.length === 0) {
          rows.push({
            ...base,
            itemName: "",
            itemQty: "",
            itemRate: "",
          });
        } else {
          for (const it of items) {
            rows.push({
              ...base,
              itemName: it?.name ?? "",
              itemQty: it?.qty ?? "",
              itemRate: it?.rate ?? "",
            });
          }
        }
      } else {
        base.items =
          Array.isArray(inv.items) && inv.items.length ? JSON.stringify(inv.items) : "";
        base.itemsCount = Array.isArray(inv.items) ? inv.items.length : 0;
        rows.push(base);
      }
    }

    // Generate CSV
    const parser = new Parser({ fields });
    const csv = parser.parse(rows);

    // Send as downloadable file
    res.header("Content-Type", "text/csv");
    res.attachment(filename);
    return res.send(csv);
  } catch (err) {
    console.error("exportUpload error:", err);
    return res
      .status(500)
      .json({ status: "Failed", error: err?.message ?? String(err) });
  }
};