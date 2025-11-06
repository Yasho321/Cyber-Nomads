import mongoose, { Schema } from "mongoose";
const itemSchema = new mongoose.Schema({
  name: String,
  qty: Number,
  rate: Number,
});
const humanReviewSchema = new mongoose.Schema({
  humanReviewNeeded: {
    type: Boolean,
    default: false,
  },
  reasonForReview: {
    type: String,
    default: null,
  }
});

const invoiceSchema = new Schema(
  {
    vendor: {
      name: { type: String },
      address: { type: String },
      taxNumber: { type: String },
      phone: { type: String },
    },
    invoiceDetails: {
      number: { type: String },
      date: { type: String },
    },

    items: [itemSchema],
    totalInvoiceValue: Number,
    totalGSTValue: Number,
    status: {
      type: String,
      enum: ["pending", "processed", "rejected"],
      default: "pending",
    },
    rejectionReason:{
      type: String,
      required: false
    },
    review: humanReviewSchema,
    
    fileName: String,
  },
  {
    timestamps: true,
  }
);

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
