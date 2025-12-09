// index.js
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const crypto = require("crypto");

const app = express();

// Raw body for webhook verification (KoraPay requires this)
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString(); // Store raw body for signature verification
    },
  })
);
app.use(cors());

// ==========================
// Environment / Config
// ==========================
const url = process.env.MONGO_URI;
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const KORAPAY_SECRET_KEY = process.env.KORAPAY_SECRET_KEY;
const PORT = process.env.PORT || 3200;
const BACKEND_PUBLIC_URL = process.env.BACKEND_PUBLIC_URL || `http://localhost:${PORT}`; // for notification_url (ngrok in dev)
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

if (!url) {
  console.error("MONGO_URI is missing in .env");
  process.exit(1);
}
if (!FLW_SECRET_KEY || !KORAPAY_SECRET_KEY) {
  console.error("Missing FLW_SECRET_KEY or KORAPAY_SECRET_KEY in .env");
  process.exit(1);
}

// ==========================
// MongoDB Connection
// ==========================
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
const dbName = "flutterwaveDB";
let paymentsCollection;

async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB ✔");
    const db = client.db(dbName);
    paymentsCollection = db.collection("payments");

    // Create collection if not exists
    const collections = await db.listCollections({ name: "payments" }).toArray();
    if (collections.length === 0) {
      await db.createCollection("payments");
      console.log("Collection 'payments' created!");
    }
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  }
}

// ==========================
// Start Server & Routes
// ==========================
async function startServer() {
  await connectDB();

  // --------------------------
  // Flutterwave: Create Payment (init only — no DB insert)
  // --------------------------
  app.post("/create-payment", async (req, res) => {
    try {
      const { name, email, amount } = req.body;
      if (!name || !email || !amount) {
        return res.status(400).json({ message: "Name, email and amount are required" });
      }

      const tx_ref = "flw-tx-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);

      const payload = {
        tx_ref,
        amount,
        currency: "NGN",
        // Send user back with tx_ref so frontend can verify later
        redirect_url: `${FRONTEND_URL}/payment-success?tx_ref=${tx_ref}`,
        customer: { email, name },
        meta: { user_email: email },
        customization: {
          title: "Payment for Order",
          description: "Thank you for shopping with us",
        },
      };

      const response = await axios.post("https://api.flutterwave.com/v3/payments", payload, {
        headers: {
          Authorization: `Bearer ${FLW_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      });

      // DO NOT insert pending record here. We'll save only on success (webhook or verify).
      res.json({ link: response.data.data.link, tx_ref });
    } catch (error) {
      console.error("Flutterwave Init Error:", error.response?.data || error.message);
      res.status(500).json({
        message: "Payment initialization failed",
        error: error.response?.data || error.message,
      });
    }
  });

  // --------------------------
  // Flutterwave: Verify Payment (manual verify endpoint)
  // If status === "successful" -> insert/update DB
  // --------------------------
  app.get("/verify-payment/:tx_ref", async (req, res) => {
    try {
      const { tx_ref } = req.params;
      const response = await axios.get(
        `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${tx_ref}`,
        {
          headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
        }
      );

      const status = response.data.data.status; // e.g. successful, failed, pending
      const data = response.data.data;

      if (status === "successful") {
        // Insert or update the payment record
        const existing = await paymentsCollection.findOne({ tx_ref });
        if (existing) {
          await paymentsCollection.updateOne(
            { tx_ref },
            {
              $set: {
                status: "successful",
                flutterwave_data: data,
                updatedAt: new Date(),
              },
            }
          );
        } else {
          await paymentsCollection.insertOne({
            name: data.customer?.name || "Unknown",
            email: data.customer?.email || data.meta?.user_email || "Unknown",
            amount: Number(data.amount) || 0,
            tx_ref,
            provider: "flutterwave",
            status: "successful",
            flutterwave_data: data,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } else {
        // Optionally update DB with non-success status (if you saved pending earlier)
        console.log(`Flutterwave verify for ${tx_ref}: ${status}`);
      }

      res.json({ message: "Payment verified", status, data });
    } catch (error) {
      console.error("Verify Error:", error.response?.data || error.message);
      res.status(500).json({ message: "Verification failed", error: error.response?.data || error.message });
    }
  });

  // --------------------------
  // Korapay: Initialize Payment (no DB insert here)
  // --------------------------
  app.post("/api/korapay/create-payment", async (req, res) => {
    try {
      const { amount, user } = req.body;
      if (!amount || !user?.name || !user?.email) {
        return res.status(400).json({ message: "Invalid request data" });
      }

      const reference = "kora-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);

      const payload = {
        amount: Number(amount),
        currency: "NGN",
        reference,
        // Send user back with reference so frontend can verify later
        redirect_url: `${FRONTEND_URL}/payment-success?reference=${reference}`,
        customer: {
          name: user.name,
          email: user.email,
        },
        // Use your public backend URL here (ngrok for dev)
        notification_url: `${BACKEND_PUBLIC_URL}/api/korapay/webhook`,
      };

      const response = await axios.post("https://api.korapay.com/merchant/api/v1/charges/initialize", payload, {
        headers: {
          Authorization: `Bearer ${KORAPAY_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      });

      // DO NOT insert into DB here
      res.json({
        checkoutUrl: response.data.data.checkout_url,
        reference,
      });
    } catch (error) {
      console.error("KoraPay Init Error:", error.response?.data || error.message);
      res.status(500).json({
        message: "Payment initialization failed",
        error: error.response?.data || error.message,
      });
    }
  });

  // --------------------------
  // Korapay: Manual Verify endpoint (in case frontend calls verify after redirect)
  // If status === "success" -> insert/update DB
  // --------------------------
  app.get("/api/korapay/verify/:reference", async (req, res) => {
    try {
      const { reference } = req.params;
      const response = await axios.get(`https://api.korapay.com/merchant/api/v1/transactions/${reference}`, {
        headers: {
          Authorization: `Bearer ${KORAPAY_SECRET_KEY}`,
        },
      });

      const status = response.data.data.status; // "success", "failed", "pending"
      const data = response.data.data;

      if (status === "success") {
        const existing = await paymentsCollection.findOne({ reference });
        if (existing) {
          await paymentsCollection.updateOne(
            { reference },
            {
              $set: {
                status: "success",
                korapay_data: data,
                updatedAt: new Date(),
              },
            }
          );
        } else {
          await paymentsCollection.insertOne({
            name: data.customer?.name || "Unknown",
            email: data.customer?.email || "Unknown",
            amount: Number(data.amount) || 0,
            reference,
            provider: "korapay",
            status: "success",
            korapay_data: data,
            webhook_received: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } else {
        console.log(`Korapay verify for ${reference}: ${status}`);
      }

      res.json({ status, data });
    } catch (error) {
      console.error("KoraPay Verify Error:", error.response?.data || error.message);
      res.status(500).json({ message: "Verification failed", error: error.response?.data || error.message });
    }
  });

  // --------------------------
  // Korapay: Webhook (signature verification + save only on success)
  // --------------------------
  app.post("/api/korapay/webhook", async (req, res) => {
    try {
      console.log("=== KORAPAY WEBHOOK RECEIVED ===");
      console.log("headers:", req.headers);
      console.log("rawBody length:", req.rawBody?.length);

      const signature = req.headers["x-korapay-signature"];
      const rawBody = req.rawBody;

      if (!signature || !rawBody) {
        console.warn("Missing signature or raw body on webhook");
        return res.status(400).send("Missing signature or body");
      }

      const hash = crypto.createHmac("sha256", KORAPAY_SECRET_KEY).update(rawBody).digest("hex");
      if (hash !== signature) {
        console.warn("Invalid webhook signature", { hash, signature });
        return res.status(401).send("Invalid signature");
      }

      const event = req.body;
      const { reference, status } = event.data || {};

      if (!reference) {
        console.warn("Webhook missing reference:", event);
        return res.status(400).send("No reference");
      }

      if (status === "success") {
        const existing = await paymentsCollection.findOne({ reference });
        if (existing) {
          await paymentsCollection.updateOne(
            { reference },
            {
              $set: {
                status: "success",
                webhook_received: true,
                webhook_data: event,
                updatedAt: new Date(),
              },
            }
          );
        } else {
          await paymentsCollection.insertOne({
            name: event.data?.customer?.name || "Unknown",
            email: event.data?.customer?.email || "Unknown",
            amount: Number(event.data?.amount) || 0,
            reference,
            provider: "korapay",
            status: "success",
            webhook_received: true,
            webhook_data: event,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        console.log(`Saved successful payment from webhook: ${reference}`);
      } else {
        console.log(`Webhook status for ${reference}: ${status}`);
        // If you want, update non-success statuses too.
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook Error:", error);
      res.status(500).send("Error");
    }
  });

  // --------------------------
  // Get all payments (for testing)
  // --------------------------
  app.get("/payments", async (req, res) => {
    try {
      const payments = await paymentsCollection.find({}).sort({ createdAt: -1 }).toArray();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Error fetching payments" });
    }
  });

  // Home route
  app.get("/", (req, res) => {
    res.send("Payment Gateway API Running - Flutterwave + KoraPay (save only on success)");
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`BACKEND_PUBLIC_URL is ${BACKEND_PUBLIC_URL}`);
    console.log(`FRONTEND_URL is ${FRONTEND_URL}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});


// const express = require("express");
// const cors = require("cors");
// require("dotenv").config();

// const app = express();

// // Raw body for Korapay webhook
// app.use(express.json({
//   verify: (req, res, buf) => {
//     req.rawBody = buf.toString();
//   }
// }));

// app.use(cors());

// // Load payment modules
// const flutterwaveRoutes = require("./flutterwave");
// const korapayRoutes = require("./korapay");

// app.use("/flutterwave", flutterwaveRoutes);
// app.use("/korapay", korapayRoutes);

// app.get("/", (req, res) => {
//   res.send("Payment API Running ✔");
// });


// // to get all payment data
// const { MongoClient } = require("mongodb");
// const MONGO_URI = process.env.MONGO_URI;
// const client = new MongoClient(MONGO_URI);
// const db = client.db("flutterwaveDB");
// const payments = db.collection("payments");
// (async () => await client.connect())();

// app.get("/payments", async (req, res) => {  
//   try {
//     const allPayments = await payments.find({}).toArray();
//     res.json(allPayments);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// const PORT = process.env.PORT || 3200;
// app.listen(PORT, () => console.log(`🚀 Server Running on ${PORT}`));
