const express = require("express");
const axios = require("axios");
const { MongoClient } = require("mongodb");

const router = express.Router();

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const MONGO_URI = process.env.MONGO_URI;

// ================= MongoDB =================
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");

const payments = db.collection("payments");
const users = db.collection("userCollection");

(async () => {
  await client.connect();
  console.log("MongoDB connected (Flutterwave)");
})();

// ================= CREATE PAYMENT =================
router.post("/create", async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const email = req.body.email; // ✅ LOGIN USER EMAIL

    if (!email) {
      return res.status(400).json({ success: false, message: "Email required" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    const tx_ref = "flw-" + Date.now();

    const payload = {
      tx_ref,
      amount,
      currency: "USD",
      redirect_url: `http://localhost:3000/payment?tx_ref=${tx_ref}`,
      customer: {
        email, // REQUIRED BY FLUTTERWAVE
      },
    };

    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      payload,
      { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` } }
    );

    // 🔐 SOURCE OF TRUTH
    await payments.insertOne({
      tx_ref,
      customerEmail: email,
      amount,
      status: "pending",
      credited: false,
      createdAt: new Date(),
    });

    res.json({ success: true, link: response.data.data.link });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= VERIFY PAYMENT =================
router.get("/verify", async (req, res) => {
  try {
    const { tx_ref } = req.query;

    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${tx_ref}`,
      { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` } }
    );

    const data = response.data.data;
    if (data.status !== "successful") {
      return res.json({ success: false });
    }

    // 🔥 OUR DB IS SOURCE OF TRUTH
    const payment = await payments.findOne({ tx_ref });
    if (!payment || payment.credited) {
      return res.json({ success: true });
    }

    await payments.updateOne(
      { tx_ref },
      {
        $set: {
          transactionId: data.id,
          status: "successful",
          credited: true,
          verifiedAt: new Date(),
        },
      }
    );

    await users.updateOne(
      { email: payment.customerEmail },
      { $inc: { balance: Number(payment.amount) } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
