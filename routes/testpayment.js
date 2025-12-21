// server.js
const express = require('express');
const { MongoClient } = require('mongodb');
const axios = require('axios');
const crypto = require('crypto');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const MONGO_URI = process.env.MONGO_URI;
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;

if (!MONGO_URI || !FLW_SECRET_KEY) {
  console.error('MONGO_URI and FLW_SECRET_KEY must be set in .env');
  process.exit(1);
}

app.use(bodyParser.json());

// MongoDB Client
let client;
let db;
let collection;

async function connectToDatabase() {
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db('mydb'); // Database name: mydb
    collection = db.collection('testpayment'); // Collection name: testpayment
    console.log('Connected to MongoDB - Database: mydb, Collection: testpayment');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Connect on startup
connectToDatabase();

// Webhook endpoint for Flutterwave
// api endpint: /api/webhook/flutterwave
app.post('/webhook/flutterwave', async (req, res) => {
  // Verify webhook signature (Flutterwave uses HMAC SHA256)
  const secretHash = req.headers['verif-hash'];
  if (!secretHash) {
    return res.status(401).send('Missing verif-hash');
  }

  const hash = crypto
    .createHmac('sha256', FLW_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== secretHash) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;

  // Only process successful charges
  if (event.event === 'charge.completed' && event.data.status === 'successful') {
    const { id: transaction_id, amount, currency, customer } = event.data;

    try {
      // Optional: Verify with Flutterwave API for extra security
      const verifyRes = await axios.get(
        `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
        {
          headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
        }
      );

      if (verifyRes.data.status === 'success' && verifyRes.data.data.status === 'successful') {
        // Check if already saved (avoid duplicates)
        const existing = await collection.findOne({ transactionId: transaction_id });

        if (!existing) {
          const paymentData = {
            transactionId: transaction_id,
            amount,
            currency,
            status: 'successful',
            customerEmail: customer.email,
            createdAt: new Date(),
          };

          await collection.insertOne(paymentData);
          console.log('Payment saved to testpayment collection');
        } else {
          console.log('Payment already exists in DB');
        }
      }
    } catch (error) {
      console.error('Webhook processing error:', error.message);
    }
  }

  // Always respond 200 quickly
  res.status(200).send('OK');
});

// API for frontend to verify payment (optional but recommended)
// API endpoint: /api/verify-payment
app.post('/verify-payment', async (req, res) => {
  const { transaction_id } = req.body;

  if (!transaction_id) {
    return res.status(400).json({ message: 'transaction_id is required' });
  }

  try {
    const verifyRes = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
      }
    );

    if (verifyRes.data.status === 'success' && verifyRes.data.data.status === 'successful') {
      const { amount, currency, customer } = verifyRes.data.data;

      // Prevent duplicate
      const existing = await collection.findOne({ transactionId: transaction_id });
      if (existing) {
        return res.json({ message: 'Payment already saved' });
      }

      const paymentData = {
        transactionId: transaction_id,
        amount,
        currency,
        status: 'successful',
        customerEmail: customer.email,
        createdAt: new Date(),
      };

      await collection.insertOne(paymentData);

      res.json({ message: 'Payment verified and saved to testpayment collection' });
    } else {
      res.status(400).json({ message: 'Payment not successful' });
    }
  } catch (error) {
    console.error('Verification error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
  process.exit(0);
});


module.exports = app;