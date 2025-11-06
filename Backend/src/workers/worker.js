import { Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import path from "path";
import fs from "fs-extra";
import { fromPath } from "pdf2pic";
import Invoice from "../models/invoice.model.js";
import mongoose from "mongoose";
import OpenAI from "openai";
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { zodTextFormat } from "openai/helpers/zod";


const ai = new GoogleGenAI({});
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

export const ItemSchema = z.object({
  name: z.string(),
  qty: z.number(),
  rate: z.number(),
});

export const HumanReviewSchema = z.object({
  humanReviewNeeded: z.boolean().default(false),
  reasonForReview: z.string().nullable(),
});

export const VendorSchema = z.object({
  name: z.string(),
  address: z.string(),
  taxNumber: z.string(),
  phone: z.string(),
});

export const InvoiceDetailsSchema = z.object({
  number: z.string(),
  date: z.string(),
});

export const judge = z.object({
  correctRetrieval: z.boolean(),
  suggestion: z.string()

})

export const InvoiceSchema = z.object({
  vendor: VendorSchema,
  invoiceDetails: InvoiceDetailsSchema,

  items: z.array(ItemSchema),

  totalInvoiceValue: z.number(),
  totalGSTValue: z.number(),

  status: z.enum(["pending","processed"]),
  review: HumanReviewSchema,


});


export const extractInvoiceDataGoogle = async (imagePath) => {
  const base64Image = fs.readFileSync(imagePath, "base64");
  const SYSTEM_PROMPT=`
    You are an AI Agent that can extract data from the Invoice image given and gives a JSON response in a particular format
    that can be inserted in the database. Your work is to highly analyse the image and extract accurate data from it and check the correctness of the data as well,
    Invoice can be in any language and can be in any format , convert it correctly in english and store in the form given . 
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
       
    3) Items(Array of object) -
        i) Name
        ii) Quantity
        iv) Rate
    4) Total Invoice Value
    5) Total GST Value
    6) Review -
        i) Human Review Needed
        ii) Reason For Review
    7) Status

    Along with this you have to if there are any errors in calculation of any sort in the invoice , If the GST number is not in the format and if any very critical information is missing (you can ignore giving error if  ph no. , etc is missing but if gst number , value of invoice , value of gst , invoice number , invoice date and other critical information is missing you have to give error) .
    For this give 2 value in review :- 
    1) Human Review Needed : bool (true if any error or confusion is found in the invoice)
    2) Reason For Review : string (if any error is found in the invoice what is the reason of rejection)

    Reason For Review should only be given when Human Review Needed is true

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
    "date": "2025-10-05"
  },
  "items": [
    { "name": "HP Laser Printer", "qty": 2, "rate": 12500 },
    { "name": "Printer Cartridge", "qty": 3, "rate": 1800 }
  ],
  "totalInvoiceValue": 33000,
  "totalGSTValue": 5940,
  "status": "processed",
  "review": {
    "humanReviewNeeded": false,
    "reasonForReview": null
  },
  
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
    "date": "2025-09-22"
  },
  "items": [
    { "name": "Ceiling Fan", "qty": 10, "rate": 1450 }
  ],
  "totalInvoiceValue": 14500,
  "totalGSTValue": 2610,
  "status": "pending",
  "review": {
    "humanReviewNeeded": true,
    "reasonForReview": "Tax number format looks invalid"
  },
 
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
    "date": "2025-08-10"
  },
  "items": [
    { "name": "Smart LED TV 43\"", "qty": 1, "rate": 32000 }
  ],
  "totalInvoiceValue": 32000,
  "totalGSTValue": 9000,
  "status": "pending",
  "review": {
    "humanReviewNeeded": true,
    "reasonForReview": "Possible GST mismatch"
  },
  
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
    "date": "2025-09-12"
  },
  "items": [
    { "name": "Cement Bag", "qty": 50, "rate": 380 }
  ],
  "totalInvoiceValue": 19000,
  "totalGSTValue": 3420,
  "status": "processed",
  "review": {
    "humanReviewNeeded": false,
    "reasonForReview": null
  },
  
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
    "date": "2025-07-15"
  },
  "items": [
    { "name": "LED Bulb 9W", "qty": 20, "rate": 120 },
    { "name": "Extension Board", "qty": 5, "rate": 350 }
  ],
  "totalInvoiceValue": 3700,
  "totalGSTValue": 666,
  "status": "processed",
  "review": {
    "humanReviewNeeded": false,
    "reasonForReview": null
  },
  
}


       
  `;
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
  config: {
    responseMimeType: "application/json",
    responseJsonSchema: zodToJsonSchema(InvoiceSchema),
  },

});
const recipe = InvoiceSchema.parse(JSON.parse(response.text));
return recipe;
  
}

export const extractInvoiceDataGoogle2 = async (imagePath,suggestion) => {
  const base64Image = fs.readFileSync(imagePath, "base64");
  const SYSTEM_PROMPT=`
    You are an AI Agent that can extract data from the Invoice image given according to the suggestion given and gives a JSON response in a particular format
    that can be inserted in the database. Your work is to highly analyse the image and extract accurate data from it and check the correctness of the data as well,
    Invoice can be in any language and can be in any format , convert it correctly in english and store in the form given . 
    .
    Suggestion Given:- 
    ${suggestion}

    you have to extract the following data from the image:-
    1) Vendor Details -
        i) Name 
        ii) Address 
        iii) Tax Number
        iv) Phone Number
    2) Invoice Details -
        i) Invoice Number
        ii) Inovice Date
       
    3) Items(Array of object) -
        i) Name
        ii) Quantity
        iv) Rate
    4) Total Invoice Value
    5) Total GST Value
    6) Review -
        i) Human Review Needed
        ii) Reason For Review
    7) Status

    Along with this you have to if there are any errors in calculation of any sort in the invoice , If the GST number is not in the format and if any very critical information is missing (you can ignore giving error if  ph no. , etc is missing but if gst number , value of invoice , value of gst , invoice number , invoice date and other critical information is missing you have to give error) .
    For this give 2 value in review :- 
    1) Human Review Needed : bool (true if any error or confusion is found in the invoice)
    2) Reason For Review : string (if any error is found in the invoice what is the reason of rejection)

    Reason For Review should only be given when Human Review Needed is true

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
    "date": "2025-10-05"
  },
  "items": [
    { "name": "HP Laser Printer", "qty": 2, "rate": 12500 },
    { "name": "Printer Cartridge", "qty": 3, "rate": 1800 }
  ],
  "totalInvoiceValue": 33000,
  "totalGSTValue": 5940,
  "status": "processed",
  "review": {
    "humanReviewNeeded": false,
    "reasonForReview": null
  },
  
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
    "date": "2025-09-22"
  },
  "items": [
    { "name": "Ceiling Fan", "qty": 10, "rate": 1450 }
  ],
  "totalInvoiceValue": 14500,
  "totalGSTValue": 2610,
  "status": "pending",
  "review": {
    "humanReviewNeeded": true,
    "reasonForReview": "Tax number format looks invalid"
  },
 
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
    "date": "2025-08-10"
  },
  "items": [
    { "name": "Smart LED TV 43\"", "qty": 1, "rate": 32000 }
  ],
  "totalInvoiceValue": 32000,
  "totalGSTValue": 9000,
  "status": "pending",
  "review": {
    "humanReviewNeeded": true,
    "reasonForReview": "Possible GST mismatch"
  },
  
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
    "date": "2025-09-12"
  },
  "items": [
    { "name": "Cement Bag", "qty": 50, "rate": 380 }
  ],
  "totalInvoiceValue": 19000,
  "totalGSTValue": 3420,
  "status": "processed",
  "review": {
    "humanReviewNeeded": false,
    "reasonForReview": null
  },
  
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
    "date": "2025-07-15"
  },
  "items": [
    { "name": "LED Bulb 9W", "qty": 20, "rate": 120 },
    { "name": "Extension Board", "qty": 5, "rate": 350 }
  ],
  "totalInvoiceValue": 3700,
  "totalGSTValue": 666,
  "status": "processed",
  "review": {
    "humanReviewNeeded": false,
    "reasonForReview": null
  },
  
}

  `;
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
  config: {
    responseMimeType: "application/json",
    responseJsonSchema: zodToJsonSchema(InvoiceSchema),
  },

});
const recipe = InvoiceSchema.parse(JSON.parse(response.text));
return recipe;
  
}

export const extractInvoiceData = async (imagePath, suggestion) => {
  const base64Image = fs.readFileSync(imagePath, "base64");
  const SYSTEM_PROMPT = `
     You are an AI Agent that can extract data from the Invoice image given according to the suggestion given and gives a JSON response in a particular format
    that can be inserted in the database. Your work is to highly analyse the image and extract accurate data from it and check the correctness of the data as well,
    Invoice can be in any language and can be in any format , convert it correctly in english and store in the form given . 
    .
    Suggestion Given:- 
    ${suggestion}

    you have to extract the following data from the image:-
    1) Vendor Details -
        i) Name 
        ii) Address 
        iii) Tax Number
        iv) Phone Number
    2) Invoice Details -
        i) Invoice Number
        ii) Inovice Date
       
    3) Items(Array of object) -
        i) Name
        ii) Quantity
        iv) Rate
    4) Total Invoice Value
    5) Total GST Value
    6) Review -
        i) Human Review Needed
        ii) Reason For Review
    7) Status

    Along with this you have to if there are any errors in calculation of any sort in the invoice , If the GST number is not in the format and if any very critical information is missing (you can ignore giving error if  ph no. , etc is missing but if gst number , value of invoice , value of gst , invoice number , invoice date and other critical information is missing you have to give error) .
    For this give 2 value in review :- 
    1) Human Review Needed : bool (true if any error or confusion is found in the invoice)
    2) Reason For Review : string (if any error is found in the invoice what is the reason of rejection)

    Reason For Review should only be given when Human Review Needed is true

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
    "date": "2025-10-05"
  },
  "items": [
    { "name": "HP Laser Printer", "qty": 2, "rate": 12500 },
    { "name": "Printer Cartridge", "qty": 3, "rate": 1800 }
  ],
  "totalInvoiceValue": 33000,
  "totalGSTValue": 5940,
  "status": "processed",
  "review": {
    "humanReviewNeeded": false,
    "reasonForReview": null
  },
  
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
    "date": "2025-09-22"
  },
  "items": [
    { "name": "Ceiling Fan", "qty": 10, "rate": 1450 }
  ],
  "totalInvoiceValue": 14500,
  "totalGSTValue": 2610,
  "status": "pending",
  "review": {
    "humanReviewNeeded": true,
    "reasonForReview": "Tax number format looks invalid"
  },
 
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
    "date": "2025-08-10"
  },
  "items": [
    { "name": "Smart LED TV 43\"", "qty": 1, "rate": 32000 }
  ],
  "totalInvoiceValue": 32000,
  "totalGSTValue": 9000,
  "status": "pending",
  "review": {
    "humanReviewNeeded": true,
    "reasonForReview": "Possible GST mismatch"
  },
  
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
    "date": "2025-09-12"
  },
  "items": [
    { "name": "Cement Bag", "qty": 50, "rate": 380 }
  ],
  "totalInvoiceValue": 19000,
  "totalGSTValue": 3420,
  "status": "processed",
  "review": {
    "humanReviewNeeded": false,
    "reasonForReview": null
  },
  
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
    "date": "2025-07-15"
  },
  "items": [
    { "name": "LED Bulb 9W", "qty": 20, "rate": 120 },
    { "name": "Extension Board", "qty": 5, "rate": 350 }
  ],
  "totalInvoiceValue": 3700,
  "totalGSTValue": 666,
  "status": "processed",
  "review": {
    "humanReviewNeeded": false,
    "reasonForReview": null
  },
  
}

    `;
  const response = await openai.responses.parse({
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
            text: "Extract the invoice details from this image according to the suggestion and return in JSON format as given in System Prompt",
          },
          {
            type: "input_image",
            image_url: `data:image/jpeg;base64,${base64Image}`,
          },
        ],
      },
    ],
    text: {
      format: zodTextFormat(InvoiceSchema, "event"),
    },
  });

  const event = response.output_parsed;
  return event;
};

export const llmAsJudge = async (imagePath, invoiceData) => {
  const base64Image = fs.readFileSync(imagePath, "base64");
  const SYSTEM_PROMPT = `
  You are a judge and your task is to decide whether the invoiceData provided is correct extraction of the image
  or not and return Json format provided 
  - Be lineant , don't be too harsh give correctRetrieval false only when some value is wrong or may affect the accuracy
  - I repeat if the values are same then don't give correctRetrieval false 
  - Even if it is not correct think is your reasoning correct for it before giving false
  - Don't give correctRetrieval false for some bullshit reasons like it's not in the same format as in image(even though value is same) , it has "," instead "." etc
  - prefer giving correctRetrieval true more than correctRetrieval false
  You should return a bool value if the retrieval is correct or not 
  And also the suggestion if it is not an correct retrieval
  You should only give suggestion if the retrieval is not correct
  Otherwise you should give a placeholder suggestion "All Fine"
  Invoice Data Given:- 
  ${JSON.stringify(invoiceData)}
  IMPORTANT:-
  Don't be strict
  `;
  const response = await openai.responses.parse({
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
            text: "Judge the invoice details if it is correctly retrieved from this image and return in JSON format as given in System Prompt, Be lineant",
          },
          {
            type: "input_image",
            image_url: `data:image/jpeg;base64,${base64Image}`,
          },
        ],
      },
    ],
    text: {
      format: zodTextFormat(judge, "event"),
    },
  });

  const event = response.output_parsed;
  return event;

  
}
export const finalJudge = async (imagePath, invoiceData ,invoiceData2) => {
  const base64Image = fs.readFileSync(imagePath, "base64");
  const SYSTEM_PROMPT = `
    You are a judge and your task is to decide whether  invoiceData1 or invoiceData2 provided is correct extraction of the image
    You should return either invoiceData1 or invoiceData2 which is more accurate according to the passed image given
    You should not alter the values of invoiceData1 or invoiceData2
    Invoice Data 1 Given:- 
    ${JSON.stringify(invoiceData)}
    Invoice Data 2 Given:-
    ${JSON.stringify(invoiceData2)}

  `;
  const response = await openai.responses.parse({
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
            text: "Return invoice data which is more accurate according to the data",
          },
          {
            type: "input_image",
            image_url: `data:image/jpeg;base64,${base64Image}`,
          },
        ],
      },
    ],
    text: {
      format: zodTextFormat(InvoiceSchema, "event"),
    },
  });

  const event = response.output_parsed;
  return event;

  
}

export const updateInvoice = async (invoiceId, invoiceData) => {
  const vendorDetails = invoiceData.vendor;
  
  const invoiceDetails = invoiceData.invoiceDetails;
  

  

  const items = invoiceData.items;
  
  const totalInvoiceValue = invoiceData.totalInvoiceValue;
  
  const totalGSTValue = invoiceData.totalGSTValue;


  const invoice = await Invoice.updateOne(
    { _id: invoiceId },
    {
      vendor: vendorDetails,
      invoiceDetails: {
        number: invoiceDetails.number,
        date: invoiceDetails.date,
        
      },
      items: items,
      totalInvoiceValue: totalInvoiceValue,
      totalGSTValue: totalGSTValue,
      status: "processed",
    }
  );
  

  if (invoiceData.review.humanReviewNeeded) {
    const rejectedInvoice = await Invoice.updateOne(
      { _id: invoiceId },
      {
        review: invoiceData.review,
        status: "pending",
      }
    );
    
  }
};

export const updateInvoiceError = async (invoiceId, error) => {
  await Invoice.updateOne(
    { _id: invoiceId },
    { review:{
      humanReviewNeeded: true,
      reasonForReview: error
    },
    status: "pending" }
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

 
  const convert = fromPath(pdfPath, options);

  const result = await convert.bulk(-1, true);
  

  const images = result.map((r) => r.path);
  return images;
};

const worker = new Worker(
  "invoice",
  async (job) => {
    try {
      await db();
      const { filepath, fileMimeType, invoiceId } = job.data;
      let images = [];
      if (fileMimeType === "application/pdf") {
        images = await convertPdfToImages(filepath);

        fs.unlinkSync(filepath);
      } else {
        images = [filepath];
      }
      images.forEach(async (image) => {
        const invoiceData = await extractInvoiceDataGoogle(image);
        console.log("invoice Data",JSON.stringify(invoiceData))
        const review = await llmAsJudge(image, invoiceData);
         console.log("review",JSON.stringify(review))
        if(review.correctRetrieval){
          await updateInvoice(invoiceId, invoiceData);
        }else{
          const invoiceData2 = await extractInvoiceDataGoogle2(image , review.suggestion);
           console.log("invoice Data2",JSON.stringify(invoiceData2))
          const review2 = await llmAsJudge(image, invoiceData2);
           console.log("review 2",JSON.stringify(review2))
          if(review.correctRetrieval){
            await updateInvoice(invoiceId, invoiceData2);
          }else{
            const invoiceData3 = await extractInvoiceData(image , review2.suggestion);
             console.log("invoice Data3",JSON.stringify(invoiceData3))
            const finalJudgeres = await finalJudge(image, invoiceData3, invoiceData);
             console.log("final",JSON.stringify(finalJudgeres))
            await updateInvoice(invoiceId, finalJudgeres);
          }
        }
        
        
      });
      ;
    } catch (error) {
      // when processing manually
      

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
      max: 5,
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
