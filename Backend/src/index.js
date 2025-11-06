import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import invoiceRoutes from "./routes/invoice.route.js";
import uploadRoutes from './routes/upload.routes.js'
import userRoutes from './routes/user.routes.js'

dotenv.config();

const app = express();

const port = 8000;

app.use(
  cors({
    origin: ["*"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/upload" , uploadRoutes);
app.use("/api/v1/user" , userRoutes)

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((error) => {
    console.log("Error connecting to MongoDB", error);
  });

app.get("/api/v1/healthcheck", (req, res) => {
  res.send("Server is running");
});
