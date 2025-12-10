const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const { MongoClient } = require("mongodb");

const router = express.Router();

const KORAPAY_SECRET_KEY = process.env.KORAPAY_SECRET_KEY;
const MONGO_URI = process.env.MONGO_URI;

// Mongo DB
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const payments = db.collection("payments");

(async () => await client.connect())();


// Create Payment
router.post("/create", async (req, res) => {
  try {
    const { amount, user } = req.body;
    const reference = "kora-" + Date.now();

    const payload = {
      amount,
      currency: "NGN",
      reference,
      redirect_url: "http://localhost:8265/payment-done",
      customer: user,
      notification_url: "http://localhost:3200/korapay/webhook"
    };

    const kpRes = await axios.post(
      "https://api.korapay.com/merchant/api/v1/charges/initialize",
      payload,
      {
        headers: { Authorization: `Bearer ${KORAPAY_SECRET_KEY}` }
      }
    );


    res.json({ checkoutUrl: kpRes.data.data.checkout_url, reference });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Manual verify
router.get("/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;

    const kpRes = await axios.get(
      `https://api.korapay.com/merchant/api/v1/transactions/${reference}`,
      {
        headers: { Authorization: `Bearer ${KORAPAY_SECRET_KEY}` }
      }
    );

    await payments.updateOne(
      { reference },
      { $set: { status: kpRes.data.data.status } }
    );

    res.json({ status: kpRes.data.data.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Webhook
router.post("/webhook", async (req, res) => {
  const signature = req.headers["x-korapay-signature"];
  const hash = crypto.createHmac("sha256", KORAPAY_SECRET_KEY)
    .update(req.rawBody)
    .digest("hex");

  if (hash !== signature) return res.status(401).send("Invalid signature");

  const { reference, status } = req.body.data;

  await payments.updateOne(
    { reference },
    { $set: { status, webhookReceived: true, webhookData: req.body } }
  );

  res.send("OK");
});

module.exports = router;
