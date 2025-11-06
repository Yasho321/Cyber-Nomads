import { Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import path from "path";
import fs from "fs-extra";
import { fromPath } from "pdf2pic";
import Invoice from "../models/invoice.model.js";
import mongoose from "mongoose";
import OpenAI from "openai";
import "dotenv/config";

const openai = new OpenAI();

const queueEvents = new QueueEvents("invoice", {
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});



const db = async () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("Connected to MongoDB");
    })
    .catch((error) => {
      console.log("Error connecting to MongoDB", error);
    });
};


export const extractInvoiceDataGoogle = async (imagePath) => {
  const base64Image = fs.readFileSync(imagePath, "base64");
  const SYSTEM_PROMPT=``;
  const contents = [
  {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Image,
    },
  },
  { text: SYSTEM_PROMPT },
];

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: contents,
});
  
}
export const extractInvoiceData = async (imagePath) => {
  const base64Image = fs.readFileSync(imagePath, "base64");
  const SYSTEM_PROMPT = `You are an AI Agent that can extract data from the Invoice image given and gives a JSON response in a particular format
    that can be inserted in the database. Your work is to highly analyse the image and extract accurate data from it and check the correctness of the data as well
    .
    you have to extract the following data from the image:-
    1) Vendor Details -
        i) Name 
        ii) Address 
        iii) Tax Number
        iv) Phone Number
    2) Invoice Details -
        i) Invoice Number
        ii) Inovice Date
        iii) InvoiceType
    3) Items(Array of object) -
        i) Name
        ii) Quantity
        iii) HSN/SAC
        iv) Rate
    4) Total Invoice Value
    5) Total GST Value

    Along with this you have to if there are any errors in calculation of any sort in the invoice , If the GST number is not in the format and if any very critical information is missing (you can ignore giving error if common things like hsn/sac , ph no. , etc is missing but if gst number , value of invoice , value of gst , invoice number , invoice date and other critical information is missing you have to give error) .
    For this give 2 value :- 
    1) error : bool (true if any error is found in the invoice)
    2) rejectionReason : string (if any error is found in the invoice what is the reason of rejection)

    rejectionReason should only be given when error is true

    Expected JSON format :- 
    {
        "vendor": {
            "name": "string",
            "address": "string",
            "taxNumber": "string",
            "phone": "string"
        },
        "invoiceDetails": {
            "number": "string",
            "date": "string",
            "type": "string"
        },
        "items": [
            {
                "name": "string",
                "qty": number,
                "hsn_sac": "string",
                "rate": number
            }
        ],
        "totalInvoiceValue": number,
        "totalGSTValue": number,
        "error": bool,  
        "rejectionReason": string
    }

    Some few shot examples of correct Output :- 
    - {
        "vendor": {
            "name": "ABC Traders Pvt. Ltd.",
            "address": "12 MG Road, Bengaluru, Karnataka, 560001",
            "taxNumber": "29ABCDE1234F1Z5",
            "phone": "+91-9876543210"
        },
        "invoiceDetails": {
            "number": "INV/2025/0045",
            "date": "2025-10-05",
            "type": "Tax Invoice"
        },
        "items": [
            {
            "name": "HP Laser Printer",
            "qty": 2,
            "hsn_sac": "8443",
            "rate": 12500
            },
            {
            "name": "Printer Cartridge",
            "qty": 3,
            "hsn_sac": "4812",
            "rate": 1800
            }
        ],
        "totalInvoiceValue": 33000,
        "totalGSTValue": 5940,
        "error": false,
        "rejectionReason": ""
      }

    - {
        "vendor": {
            "name": "Shree Enterprises",
            "address": "Sector 22, Chandigarh",
            "taxNumber": "AB1234F1Z5",
            "phone": "9876001234"
        },
        "invoiceDetails": {
            "number": "SE/045/25",
            "date": "2025-09-22",
            "type": "Tax Invoice"
        },
        "items": [
            {
            "name": "Ceiling Fan",
            "qty": 10,
            "hsn_sac": "8414",
            "rate": 1450
            }
        ],
        "totalInvoiceValue": 14500,
        "totalGSTValue": 2610,
        "error": true,
        "rejectionReason": "Invalid GST format for vendor taxNumber."
    }
    - {
        "vendor": {
            "name": "TechZone Electronics",
            "address": "Plot 17, MIDC, Pune, Maharashtra",
            "taxNumber": "27ABCDE5678G1Z2",
            "phone": "020-26587412"
        },
        "invoiceDetails": {
            "number": "TZE/098/2025",
            "date": "2025-08-10",
            "type": "Tax Invoice"
        },
        "items": [
            {
            "name": "Smart LED TV 43\"",
            "qty": 1,
            "hsn_sac": "8528",
            "rate": 32000
            }
        ],
        "totalInvoiceValue": 32000,
        "totalGSTValue": 9000,
        "error": true,
        "rejectionReason": "GST calculation mismatch — expected GST ≈ 5760, found 9000."
    }
    - {
        "vendor": {
            "name": "Maa Durga Hardware",
            "address": "Main Bazaar, Patna",
            "taxNumber": "10ABCDE4321K1Z8",
            "phone": ""
        },
        "invoiceDetails": {
            "number": "INV-103",
            "date": "2025-09-12",
            "type": "Retail Invoice"
        },
        "items": [
            {
            "name": "Cement Bag",
            "qty": 50,
            "hsn_sac": "2523",
            "rate": 380
            }
        ],
        "totalInvoiceValue": 19000,
        "totalGSTValue": 3420,
        "error": false,
        "rejectionReason": ""
    }
    - {
        "vendor": {
            "name": "Galaxy Computers",
            "address": "C-45, Nehru Place, New Delhi",
            "taxNumber": "07ABCDE9987L1Z9",
            "phone": "011-45289678"
        },
        "invoiceDetails": {
            "number": "GC/INV-309",
            "date": "",
            "type": "Tax Invoice"
        },
        "items": [
            {
            "name": "SSD 512GB",
            "qty": 5,
            "hsn_sac": "8471",
            "rate": 4200
            }
        ],
        "totalInvoiceValue": 21000,
        "totalGSTValue": 3780,
        "error": true,
        "rejectionReason": "Invoice date missing."
    }
    - {
        "vendor": {
            "name": "Om Electronics",
            "address": "Shop No. 7, MG Complex, Indore",
            "taxNumber": "23ABCDE1234H1Z3",
            "phone": "+91 9998877665"
        },
        "invoiceDetails": {
            "number": "INV-557",
            "date": "2025-07-15",
            "type": "Tax Invoice"
        },
        "items": [
            {
            "name": "LED Bulb 9W",
            "qty": 20,
            "hsn_sac": "8539",
            "rate": 120
            },
            {
            "name": "Extension Board",
            "qty": 5,
            "hsn_sac": "8537",
            "rate": 350
            }
        ],
        "totalInvoiceValue": 3700,
        "totalGSTValue": 666,
        "error": false,
        "rejectionReason": ""
    }
    - {
        "vendor": {
            "name": "Blue Star Refrigeration",
            "address": "Plot No. 9, Bhiwandi, Thane",
            "taxNumber": "27ABCDE4567J1Z7",
            "phone": "022-78965412"
        },
        "invoiceDetails": {
            "number": "BSR/INV-0210",
            "date": "2025-06-20",
            "type": "Tax Invoice"
        },
        "items": [
            {
            "name": "Air Conditioner 1.5 Ton",
            "qty": 3,
            "hsn_sac": "",
            "rate": 38500
            }
        ],
        "totalInvoiceValue": 115500,
        "totalGSTValue": 20790,
        "error": false,
        "rejectionReason": ""
    }
    - {
        "vendor": {
            "name": "GreenTech Solutions",
            "address": "2nd Floor, HiTech Park, Hyderabad",
            "taxNumber": "36ABCDE2345K1Z1",
            "phone": "040-25698745"
        },
        "invoiceDetails": {
            "number": "GT/INV-120",
            "date": "2025-09-03",
            "type": "Credit Note"
        },
        "items": [
            {
            "name": "Network Switch",
            "qty": 2,
            "hsn_sac": "8517",
            "rate": 6500
            }
        ],
        "totalInvoiceValue": 13000,
        "totalGSTValue": 2340,
        "error": true,
        "rejectionReason": "Invoice type mismatch — expected 'Tax Invoice', found 'Credit Note'."
    }
    - {
        "vendor": {
            "name": "Krishna Auto Parts",
            "address": "",
            "taxNumber": "08ABCDE3214P1Z6",
            "phone": "0141-2765420"
        },
        "invoiceDetails": {
            "number": "KAP/2025/78",
            "date": "2025-08-28",
            "type": "Retail Invoice"
        },
        "items": [
            {
            "name": "Brake Pad Set",
            "qty": 4,
            "hsn_sac": "8708",
            "rate": 800
            }
        ],
        "totalInvoiceValue": 3200,
        "totalGSTValue": 576,
        "error": true,
        "rejectionReason": "Vendor address missing."
    }
    - {
        "vendor": {
            "name": "Star Chemicals",
            "address": "Industrial Area, Ankleshwar, Gujarat",
            "taxNumber": "24ABCDE7654M1Z8",
            "phone": "02646-258975"
        },
        "invoiceDetails": {
            "number": "SC/INV/090",
            "date": "2025-05-30",
            "type": "Tax Invoice"
        },
        "items": [
            {
            "name": "Acetone 50L Drum",
            "qty": 5,
            "hsn_sac": "2901",
            "rate": 1845.50
            }
        ],
        "totalInvoiceValue": 9227.5,
        "totalGSTValue": 1660.95,
        "error": false,
        "rejectionReason": ""
    }

    IMPORTANT :-
    Give JSON only no markdown fences or quotes or anything else
       

    `;
  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: SYSTEM_PROMPT }],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Extract the invoice details from this image and return in JSON format as given in System Prompt",
          },
          {
            type: "input_image",
            image_url: `data:image/jpeg;base64,${base64Image}`,
          },
        ],
      },
    ],
  });

  const responseJson = JSON.parse(response.output_text);
  return responseJson;
};

export const updateInvoice = async (invoiceId, invoiceData) => {
  const vendorDetails = invoiceData.vendor;
  console.log(vendorDetails);
  const invoiceDetails = invoiceData.invoiceDetails;
  console.log(invoiceDetails);

  console.log(typeof invoiceDetails);
  console.log(invoiceDetails.number);
  console.log(typeof invoiceDetails.number);
  console.log(invoiceDetails.date);
  console.log(typeof invoiceDetails.date);
  console.log(invoiceDetails.type);
  console.log(typeof invoiceDetails.type);

  const items = invoiceData.items;
  console.log(items);
  const totalInvoiceValue = invoiceData.totalInvoiceValue;
  console.log(totalInvoiceValue);
  const totalGSTValue = invoiceData.totalGSTValue;
  console.log(totalGSTValue);

  const invoice = await Invoice.updateOne(
    { _id: invoiceId },
    {
      vendor: vendorDetails,
      invoiceDetails: {
        number: invoiceDetails.number,
        date: invoiceDetails.date,
        type: invoiceDetails.type,
      },
      items: items,
      totalInvoiceValue: totalInvoiceValue,
      totalGSTValue: totalGSTValue,
      status: "processed",
    }
  );
  console.log(invoice);

  if (invoiceData.error) {
    const rejectedInvoice = await Invoice.updateOne(
      { _id: invoiceId },
      {
        error: true,
        rejectionReason: invoiceData.rejectionReason,
        status: "rejected",
      }
    );
    console.log(rejectedInvoice);
  }
};

export const updateInvoiceError = async (invoiceId, error) => {
  await Invoice.updateOne(
    { _id: invoiceId },
    { error: true, rejectionReason: error, status: "rejected" }
  );
};

export const convertPdfToImages = async (pdfPath) => {
  const outputDir = path.join("uploads", "pdf-images");
  await fs.ensureDir(outputDir);

  const options = {
    density: 150,
    saveFilename: path.basename(pdfPath, path.extname(pdfPath)),
    savePath: outputDir,
    format: "png",
    width: 1240,
    height: 1754,
  };

  console.log("Converting PDF pages to images...");
  const convert = fromPath(pdfPath, options);

  const result = await convert.bulk(-1, true);
  console.log("Conversion complete!");

  const images = result.map((r) => r.path);
  return images;
};

const worker = new Worker(
  "invoice",
  async (job) => {
    try {
      await db();
      console.log("Processing job:", job.id);
      const { filepath, fileMimeType, invoiceId } = job.data;
      console.log("Filepath:", filepath);
      console.log("FileMimeType:", fileMimeType);
      console.log("InvoiceId:", invoiceId);
      let images = [];
      if (fileMimeType === "application/pdf") {
        images = await convertPdfToImages(filepath);

        fs.unlinkSync(filepath);
      } else {
        images = [filepath];
      }
      console.log("Images:", images);

      images.forEach(async (image) => {
        console.log("Processing image:", image);
        const invoiceData = await extractInvoiceData(image);
        console.log("Invoice Data:", invoiceData);
        await updateInvoice(invoiceId, invoiceData);
        console.log("Invoice updated successfully");
      });
      console.log("Job completed:", job.id);
    } catch (error) {
      // when processing manually
      console.log(error);

      const { filepath, fileMimeType, invoiceId } = job.data;
      await updateInvoiceError(invoiceId, error.message);
      await job.moveToFailed({ message: error.message }, token, true);
      console.log("Job failed:", job.id);
    }
  },
  {
    connection: {
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    },
    limiter: {
      max: 10,
      duration: 60000,
    },
  }
);

queueEvents.on("completed", ({ jobId, returnvalue }) => {
  console.log(`${jobId} has completed and returned ${returnvalue}`);
});

queueEvents.on("failed", ({ jobId, failedReason }) => {
  console.log(`${jobId} has failed with reason ${failedReason}`);
});
