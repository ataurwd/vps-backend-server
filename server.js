

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Raw body for Korapay webhook
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

app.use(cors());

// Load payment modules
const flutterwaveRoutes = require("./flutterwave");
const korapayRoutes = require("./korapay");

app.use("/flutterwave", flutterwaveRoutes);
app.use("/korapay", korapayRoutes);

app.get("/", (req, res) => {
  res.send("Payment API Running ✔");
});


// to get all payment data
const { MongoClient } = require("mongodb");
const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);
const db = client.db("flutterwaveDB");
const payments = db.collection("payments");
(async () => await client.connect())();

app.get("/payments", async (req, res) => {  
  try {
    const allPayments = await payments.find({}).toArray();
    res.json(allPayments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3200;
app.listen(PORT, () => console.log(`🚀 Server Running on ${PORT}`));



/////////////////////////////////////
//////////////////////////////////
//SABBA //
///////////////////////////////
//////////////////////
/////////////
//////////
// server.js - add this block (after your /payments route)
// make sure these middlewares exist somewhere before routes:
const express = require("express");
const cors = require("cors");


app.use(cors());            // allow cross-origin requests
app.use(express.json());    // parse JSON bodies

// existing DB setup...
// const payments = <your mongo collection instance>

app.post("/api/submit", async (req, res) => {
  try {
    // now reading name and transactionId from req.body
    const { paymentMethod, name, transactionId, message, submittedAt } = req.body;

    // Validate required fields
    if (!paymentMethod) {
      return res.status(400).json({
        error: "paymentMethod is required",
      });
    }

    // Build document (keep defaults for missing optional fields)
    const doc = {
      paymentMethod,
      name: name || null,
      transactionId: transactionId || null,
      message: message || null,
      submittedAt: submittedAt ? new Date(submittedAt) : new Date(),
      status: "created",
      meta: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await payments.insertOne(doc); // or PaymentModel.create(doc) if using Mongoose

    const paymentId = result.insertedId;

    // optional: generate a payment URL (if needed)
    const paymentUrl = `https://example.com/pay/${paymentId}`;

    // debug log (helps during dev)
    console.log("Saved payment:", { paymentId, paymentMethod, name, transactionId });

    res.json({
      message: "Payment record created successfully",
      paymentId,
      paymentUrl,
    });
  } catch (err) {
    console.error("Error in /api/submit:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});






// GET /api/submit - receive data from frontend through query params
// app.get("/api/submit", async (req, res) => {
//   try {
//     const { paymentMethod, message, submittedAt } = req.query;

//     if (!paymentMethod) {
//       return res.status(400).json({ error: "paymentMethod is required" });
//     }

//     const doc = {
//       paymentMethod,
//       message: message || null,
//       submittedAt: submittedAt || new Date().toISOString(),
//       status: "created",
//       meta: {},
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     };

//     const result = await payments.insertOne(doc);

//     res.json({
//       message: "Payment record created successfully (GET)",
//       paymentId: result.insertedId,
//     });
//   } catch (err) {
//     console.error("GET /api/submit error:", err);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });


// app.get("/api/submit", async (req, res) => {
//   console.log("GET /api/submit - req.query:", req.query);
//   const { paymentMethod, message, submittedAt } = req.query;
//   if (!paymentMethod) return res.status(400).json({ error: "paymentMethod is required" });
//   // ... continue saving to DB ...
// });
