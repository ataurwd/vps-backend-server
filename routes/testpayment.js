const express = require("express");
const axios = require("axios");
const { MongoClient } = require("mongodb");

const app = express.Router();
const port = process.env.PORT || 3200;
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const MONGO_URI = process.env.MONGO_URI;

// Mongo DB
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const collection = db.collection("payments");

(async () => await client.connect())();

// ========== API ROUTES WITH /api PREFIX ==========

// Main Verify Endpoint (frontend থেকে কল হবে)
app.post('/verify-payment', async (req, res) => {
  const { transaction_id, userEmail } = req.body;

  if (!transaction_id) {
    return res.status(400).json({ message: 'transaction_id is required' });
  }
  if (!userEmail) {
    return res.status(400).json({ message: 'userEmail is required (authenticated user email)' });
  }

  try {
    // Flutterwave-এ verify করি
    const verifyResponse = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET_KEY}`,
        },
      }
    );

    if (verifyResponse.data.status !== 'success' || verifyResponse.data.data.status !== 'successful') {
      return res.status(400).json({ message: 'Payment verification failed on Flutterwave' });
    }

    const { amount, currency } = verifyResponse.data.data;

    // Duplicate check
    const existing = await collection.findOne({ transactionId: transaction_id });
    if (existing) {
      return res.json({
        message: 'Payment already verified and saved',
        data: existing,
      });
    }

    // Save to DB — শুধু তোমার লগইন ইউজারের email সেভ হবে
    const paymentData = {
      transactionId: transaction_id,
      amount,
      currency,
      status: 'successful',
      customerEmail: userEmail,  // ← এটাই তোমার website-এর লগইন ইউজারের email
      createdAt: new Date(),
    };

    await collection.insertOne(paymentData);
    console.log(`Payment saved for user: ${userEmail} | Amount: ₦${amount}`);

    res.json({
      message: 'Payment successfully verified and saved',
      data: paymentData,
    });
  } catch (error) {
    console.error('Verification/Save error:', error.message);
    res.status(500).json({ message: 'Server error during verification' });
  }
});

// Optional Webhook with /api prefix
app.post('/webhook/flutterwave', async (req, res) => {
  const secretHash = req.headers['verif-hash'];
  if (!secretHash) return res.status(401).send('Missing verif-hash');

  const hash = crypto
    .createHmac('sha256', FLW_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== secretHash) return res.status(401).send('Invalid signature');

  console.log('Webhook received:', req.body);
  res.status(200).send('OK');
});

// Test route
app.get('/api', (req, res) => {
  res.json({
    message: 'Flutterwave API Backend Running',
    endpoints: {
      verify: 'POST /api/verify-payment',
      webhook: 'POST /api/webhook/flutterwave',
    },
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  if (client) await client.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

module.exports = app;