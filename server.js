const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ==========================
// 🔹 MongoDB Connection
// ==========================
const url = "mongodb://ataur_dev:2700418579@72.244.153.24:27017/admin";
const dbName = "flutterwaveDB";
let db;
let paymentsCollection;

MongoClient.connect(url)
  .then(async (client) => {
    console.log("Connected to MongoDB ✔");
    db = client.db(dbName);

    paymentsCollection = db.collection("payments");

    const collections = await db.listCollections({ name: "payments" }).toArray();
    if (collections.length === 0) {
      await db.createCollection("payments");
      console.log("Collection 'payments' created!");
    }
  })
  .catch((err) => console.log("Mongo Error:", err));

// ==========================
// 🔹 Flutterwave Config
// ==========================
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || "YOUR_FLUTTERWAVE_SECRET_KEY";

// ==========================
// 🔹 Create Payment Route
// ==========================
app.post("/create-payment", async (req, res) => {
  try {
    const { name, email, amount } = req.body;

    const payload = {
      tx_ref: "tx-" + Date.now(),
      amount,
      currency: "NGN",
      redirect_url: "https://your-frontend.com/payment-success",
      customer: { email, name },
      customization: { title: "Your Store Payment", description: "Payment for items" },
    };

    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      payload,
      { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` } }
    );

    await paymentsCollection.insertOne({
      name,
      email,
      amount,
      tx_ref: payload.tx_ref,
      status: "pending",
      createdAt: new Date(),
    });

    res.send({ link: response.data.data.link });
  } catch (error) {
    res.status(500).send({ message: "Payment error", error: error.message });
  }
});

// ==========================
// 🔹 Verify Payment
// ==========================
app.get("/verify-payment/:tx_ref", async (req, res) => {
  try {
    const { tx_ref } = req.params;

    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${tx_ref}`,
      { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` } }
    );

    const status = response.data.data.status;

    await paymentsCollection.updateOne({ tx_ref }, { $set: { status } });

    res.send({ message: "Payment Verified", status });
  } catch (error) {
    res.status(500).send({ message: "Verification error", error: error.message });
  }
});


// to get all payments (for testing)
app.get("/payments", async (req, res) => {
  try {
    const payments = await paymentsCollection.find({}).toArray();
    res.send(payments);
  } catch (error) {
    res.status(500).send({ message: "Error fetching payments", error: error.message });
  }
});

// ==========================
// 🔹 Default Route
// ==========================
app.get("/", (req, res) => res.send("Flutterwave Payment API Running ✔"));

// ==========================
// 🔹 Start Server
// ==========================
const PORT = 3200;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
