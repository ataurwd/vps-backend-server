const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const crypto = require("crypto");

const app = express();

// Raw body for webhook verification (KoraPay requires this)
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString(); // Store raw body
    },
  })
);
app.use(cors());

// ==========================
// MongoDB Connection
// ==========================
const url = process.env.MONGO_URI;
if (!url) {
  console.error("MONGO_URI is missing in .env");
  process.exit(1);
}

const client = new MongoClient(url);
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
// Flutterwave & Korapay Config
// ==========================
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const KORAPAY_SECRET_KEY = process.env.KORAPAY_SECRET_KEY;

if (!FLW_SECRET_KEY || !KORAPAY_SECRET_KEY) {
  console.error("Missing FLW_SECRET_KEY or KORAPAY_SECRET_KEY in .env");
  process.exit(1);
}

// ==========================
// Routes (Only after DB is connected)
// ==========================
async function startServer() {
  await connectDB();

  // Flutterwave: Create Payment
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
        redirect_url: "http://localhost:3000/payment-success",
        customer: { email, name },
        meta: { user_email: email },
        customization: {
          title: "Payment for Order",
          description: "Thank you for shopping with us",
        },
      };

      const response = await axios.post(
        "https://api.flutterwave.com/v3/payments",
        payload,
        {
          headers: {
            Authorization: `Bearer ${FLW_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Save to DB
      await paymentsCollection.insertOne({
        name,
        email,
        amount: Number(amount),
        tx_ref,
        provider: "flutterwave",
        status: "pending",
        createdAt: new Date(),
      });

      res.json({ link: response.data.data.link, tx_ref });
    } catch (error) {
      console.error("Flutterwave Error:", error.response?.data || error.message);
      res.status(500).json({
        message: "Payment initialization failed",
        error: error.response?.data || error.message,
      });
    }
  });

  // Flutterwave: Verify Payment
  app.get("/verify-payment/:tx_ref", async (req, res) => {
    try {
      const { tx_ref } = req.params;

      const response = await axios.get(
        `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${tx_ref}`,
        {
          headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
        }
      );

      const status = response.data.data.status; // successful, failed, pending

      await paymentsCollection.updateOne(
        { tx_ref },
        { $set: { status, flutterwave_data: response.data.data, updatedAt: new Date() } }
      );

      res.json({ message: "Payment verified", status });
    } catch (error) {
      console.error("Verify Error:", error.response?.data || error.message);
      res.status(500).json({ message: "Verification failed", error: error.message });
    }
  });

    // Korapay: Verify Payment (Manual)
  app.get("/api/korapay/verify/:reference", async (req, res) => {
    try {
      const { reference } = req.params;

      const response = await axios.get(
        `https://api.korapay.com/merchant/api/v1/transactions/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${KORAPAY_SECRET_KEY}`,
          },
        }
      );

      const status = response.data.data.status; // "success", "failed", "pending"

      await paymentsCollection.updateOne(
        { reference },
        { $set: { status, korapay_data: response.data.data, updatedAt: new Date() } }
      );

      res.json({ status, message: "Verified" });
    } catch (error) {
      console.error("KoraPay Verify Error:", error.response?.data || error.message);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // Korapay: Webhook (Most Important - Must be correct)
  app.post("/api/korapay/webhook", async (req, res) => {
    try {
      const signature = req.headers["x-korapay-signature"];
      const rawBody = req.rawBody;

      if (!signature || !rawBody) {
        return res.status(400).send("Missing signature or body");
      }

      const hash = crypto
        .createHmac("sha256", KORAPAY_SECRET_KEY)
        .update(rawBody)
        .digest("hex");

      if (hash !== signature) {
        console.log("Invalid webhook signature");
        return res.status(401).send("Invalid signature");
      }

      const event = req.body;
      const { reference, status } = event.data || {};

      if (reference && status) {
        await paymentsCollection.updateOne(
          { reference },
          {
            $set: {
              status,
              webhook_received: true,
              webhook_data: event,
              updatedAt: new Date(),
            },
          }
        );

        console.log(`Webhook processed: ${reference} -> ${status}`);
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook Error:", error);
      res.status(500).send("Error");
    }
  });

  // Korapay: Initialize Payment
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
        redirect_url: `http://localhost:3000/`,
        customer: {
          name: user.name,
          email: user.email,
        },
        notification_url: "http://localhost:3000/api/korapay/webhook", // Change in production
      };

      const response = await axios.post(
        "https://api.korapay.com/merchant/api/v1/charges/initialize",
        payload,
        {
          headers: {
            Authorization: `Bearer ${KORAPAY_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      await paymentsCollection.insertOne({
        name: user.name,
        email: user.email,
        amount: Number(amount),
        reference,
        provider: "korapay",
        status: "pending",
        createdAt: new Date(),
      });

      res.json({
        checkoutUrl: response.data.data.checkout_url,
        reference,
      });
    } catch (error) {
      console.error("KoraPay Init Error:", error.response?.data || error.message);
      res.status(500).json({
        message: "Payment failed",
        error: error.response?.data || error.message,
      });
    }
  });


  // Get all payments (for testing)
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
    res.send("Payment Gateway API Running - Flutterwave + KoraPay");
  });

  // Start server
  const PORT = process.env.PORT || 3200;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Start everything
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});