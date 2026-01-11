const express = require("express");
const axios = require("axios");
const { MongoClient } = require("mongodb");

const router = express.Router();

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const MONGO_URI = process.env.MONGO_URI;

// MongoDB
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const payments = db.collection("payments");

(async () => {
  await client.connect();
  console.log("MongoDB connected");
})();

// CREATE PAYMENT (Redirect link)
router.post("/create", async (req, res) => {
  try {
    const { name, email, amount } = req.body;

    const tx_ref = "flw-" + Date.now();

    const payload = {
      tx_ref,
      amount,
      currency: "USD",
      redirect_url: "http://localhost:3000/wallet",
      customer: { name, email },
      customizations: {
        title: "AcctEmpire Deposit",
        description: "Wallet funding",
      },
    };

    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      payload,
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET_KEY}`,
        },
      }
    );

    await payments.insertOne({
      tx_ref,
      email,
      amount,
      status: "pending",
      createdAt: new Date(),
    });

    res.json({ link: response.data.data.link });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VERIFY PAYMENT
router.get("/verify/:tx_ref", async (req, res) => {
  try {
    const { tx_ref } = req.params;

    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${tx_ref}`,
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET_KEY}`,
        },
      }
    );

    const status = response.data.data.status;

    await payments.updateOne(
      { tx_ref },
      { $set: { status, flutterwaveData: response.data.data } }
    );

    res.json({ status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
