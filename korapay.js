const express = require("express");
const axios = require("axios");
const { MongoClient } = require("mongodb");

const router = express.Router();

const KORAPAY_SECRET_KEY = process.env.KORAPAY_SECRET_KEY;
const MONGO_URI = process.env.MONGO_URI;

// ================= Mongo =================
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");

const payments = db.collection("payments");
const users = db.collection("userCollection");

(async () => {
  await client.connect();
  console.log("MongoDB connected (Korapay)");
})();

// ================= CREATE PAYMENT =================
router.post("/create", async (req, res) => {
  try {
    const { amount, email } = req.body;

    if (!amount || !email) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    const reference = "kora-" + Date.now();

    const payload = {
      amount: String(amount), // Korapay requires string
      currency: "NGN",
      reference,
      redirect_url: `http://localhost:3000/payment?reference=${reference}`,
      customer: {
        email, // ✅ LOGIN USER EMAIL
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

    // 🔐 SOURCE OF TRUTH
    await payments.insertOne({
      reference,
      customerEmail: email,
      amount: Number(amount),
      method: "korapay",
      status: "pending",
      credited: false,
      createdAt: new Date(),
    });

    res.json({
      checkoutUrl: kpRes.data.data.checkout_url,
    });
  } catch (err) {
    console.error("Korapay create error:", err.response?.data || err.message);
    res.status(500).json({ message: "Korapay create failed" });
  }
});

// ================= VERIFY (MANUAL REDIRECT) =================
router.get("/verify", async (req, res) => {
  try {
    const { reference } = req.query;
    if (!reference) return res.status(400).json({ success: false });

    const kpRes = await axios.get(
      `https://api.korapay.com/merchant/api/v1/transactions/${reference}`,
      {
        headers: { Authorization: `Bearer ${KORAPAY_SECRET_KEY}` },
      }
    );

    const data = kpRes.data.data;
    if (data.status !== "successful") {
      return res.json({ success: false });
    }

    const payment = await payments.findOne({ reference });
    if (!payment || payment.credited) {
      return res.json({ success: true });
    }

    // ✅ UPDATE PAYMENT
    await payments.updateOne(
      { reference },
      {
        $set: {
          status: "successful",
          transactionId: data.id,
          credited: true,
          verifiedAt: new Date(),
        },
      }
    );

    // ✅ ADD BALANCE
    await users.updateOne(
      { email: payment.customerEmail },
      { $inc: { balance: payment.amount } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Korapay verify error:", err.response?.data || err.message);
    res.status(500).json({ success: false });
  }
});

// ================= WEBHOOK =================
router.post("/webhook", async (req, res) => {
  try {
    const data = req.body?.data;
    if (!data?.reference) return res.sendStatus(200);

    const payment = await payments.findOne({ reference: data.reference });
    if (!payment || payment.credited) return res.sendStatus(200);

    if (data.status === "successful") {
      await payments.updateOne(
        { reference: data.reference },
        {
          $set: {
            status: "successful",
            credited: true,
            webhookReceived: true,
            verifiedAt: new Date(),
          },
        }
      );

      await users.updateOne(
        { email: payment.customerEmail },
        { $inc: { balance: payment.amount } }
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Korapay webhook error:", err.message);
    res.sendStatus(200);
  }
});

module.exports = router;
