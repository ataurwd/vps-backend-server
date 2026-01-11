const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const { MongoClient } = require("mongodb");

const router = express.Router();

const KORAPAY_SECRET_KEY = process.env.KORAPAY_SECRET_KEY;
const MONGO_URI = process.env.MONGO_URI;

// Mongo
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const payments = db.collection("payments");

(async () => await client.connect())();

// ================= CREATE PAYMENT =================
router.post("/create", async (req, res) => {
  try {
    const { amount, user } = req.body;

    if (!amount || !user?.email || !user?.name) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const reference = "kora-" + Date.now();

    const payload = {
      amount: String(amount), // MUST be string
      currency: "NGN",
      reference,
      redirect_url: "http://localhost:3000/payment-done",
      customer: {
        name: user.name,
        email: user.email,
      },
    };

    const kpRes = await axios.post(
      "https://api.korapay.com/merchant/api/v1/charges/initialize",
      payload,
      {
        headers: {
          Authorization: `Bearer ${KORAPAY_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    await payments.insertOne({
      reference,
      amount,
      email: user.email,
      status: "pending",
      createdAt: new Date(),
    });

    res.json({
      checkoutUrl: kpRes.data.data.checkout_url,
      reference,
    });
  } catch (err) {
    console.error("Korapay create error:", err.response?.data || err.message);
    res.status(500).json({ error: "Korapay create failed" });
  }
});

// ================= VERIFY =================
router.get("/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;

    const kpRes = await axios.get(
      `https://api.korapay.com/merchant/api/v1/transactions/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${KORAPAY_SECRET_KEY}`,
        },
      }
    );

    const status = kpRes.data.data.status;

    await payments.updateOne(
      { reference },
      { $set: { status, verifiedAt: new Date() } }
    );

    res.json({ status });
  } catch (err) {
    console.error("Korapay verify error:", err.response?.data || err.message);
    res.status(500).json({ error: "Verification failed" });
  }
});

// ================= WEBHOOK =================
// ⚠️ Webhook signature verify optional for now
router.post("/webhook", async (req, res) => {
  try {
    const data = req.body?.data;
    if (!data?.reference) return res.sendStatus(200);

    await payments.updateOne(
      { reference: data.reference },
      {
        $set: {
          status: data.status,
          webhookReceived: true,
          webhookData: req.body,
        },
      }
    );

    res.sendStatus(200);
  } catch (err) {
    console.error("Korapay webhook error:", err.message);
    res.sendStatus(200);
  }
});

module.exports = router;
