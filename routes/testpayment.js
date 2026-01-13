// const express = require("express");
// const axios = require("axios");
// const { MongoClient } = require("mongodb");
// const crypto = require("crypto"); // Added for potential future webhook use

// const app = express.Router();
// const port = process.env.PORT || 3200;
// const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
// const MONGO_URI = process.env.MONGO_URI;

// // Add this if you plan to use proper webhook verification (recommended)
// // const FLW_WEBHOOK_HASH = process.env.FLW_WEBHOOK_HASH; // Set this in your Flutterwave dashboard under Settings > Webhooks

// // MongoDB Client Setup
// let client;
// let db;
// let paymentsCollection;

// (async () => {
//   try {
//     client = new MongoClient(MONGO_URI);
//     await client.connect();
//     db = client.db("mydb");
//     paymentsCollection = db.collection("payments");
//   } catch (err) {
//     console.error("Failed to connect to MongoDB", err);
//     process.exit(1);
//   }
// })();

// // Graceful shutdown
// process.on("SIGINT", async () => {
//   if (client) {
//     await client.close();
//   }
//   process.exit(0);
// });

// // ========== API ROUTES WITH /api PREFIX ==========

// // Main Verify Endpoint (called from frontend after payment redirect)
// app.post("/verify-payment", async (req, res) => {
//   const { transaction_id, userEmail } = req.body;

//   if (!transaction_id) {
//     return res.status(400).json({ message: "transaction_id is required" });
//   }
//   if (!userEmail) {
//     return res.status(400).json({ message: "userEmail is required (authenticated user email)" });
//   }

//   try {
//     // Verify with Flutterwave
//     const verifyResponse = await axios.get(
//       `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
//       {
//         headers: {
//           Authorization: `Bearer ${FLW_SECRET_KEY}`,
//         },
//       }
//     );

//     const verifyData = verifyResponse.data;

//     if (verifyData.status !== "success" || verifyData.data.status !== "successful") {
//       return res.status(400).json({ message: "Payment verification failed on Flutterwave" });
//     }

//     const { amount, currency, customer } = verifyData.data;

//     // Optional: Extra security - check if email matches (if passed from frontend during payment)
//     // if (customer?.email && customer.email !== userEmail) {
//     //   return res.status(400).json({ message: "Email mismatch" });
//     // }

//     // Duplicate check
//     const existing = await paymentsCollection.findOne({ transactionId: transaction_id });
//     if (existing) {
//       return res.json({
//         message: "Payment already verified and saved",
//         data: existing,
//       });
//     }

//     // Save to DB
//     const paymentData = {
//       transactionId: transaction_id,
//       amount,
//       currency,
//       status: "successful",
//       customerEmail: userEmail,
//       createdAt: new Date(),
//       credited: false, // For balance update tracking
//     };

//     await paymentsCollection.insertOne(paymentData);

//     res.json({
//       message: "Payment successfully verified and saved",
//       data: paymentData,
//     });
//   } catch (error) {
//     console.error("Verification/Save error:", error.message || error);
//     res.status(500).json({ message: "Server error during verification" });
//   }
// });

// // Optional Webhook Endpoint (recommended for async payments like bank transfers)
// // Note: Current code is fixed to use direct comparison (verif-hash). For HMAC, uncomment the block below.
// app.post("/webhook/flutterwave", express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }), async (req, res) => {
//   // Simple verif-hash verification (most common and recommended by Flutterwave docs)
//   const signature = req.headers["verif-hash"];

//   res.status(200).send("OK");
// });

// // Get all payments (for admin/debug)
// app.get("/payments", async (req, res) => {
//   try {
//     const allPayments = await paymentsCollection.find({}).sort({ createdAt: -1 }).toArray();
//     res.json(allPayments);
//   } catch (error) {
//     res.status(500).json({ message: "Error fetching payments" });
//   }
// });

// // Update user balance based on successful uncredited payments
// app.patch("/update-balance", async (req, res) => {
//   try {
//     const usersCollection = db.collection("userCollection");

//     const { email } = req.body;

//     if (!email) {
//       return res.status(400).json({ message: "Email is required" });
//     }

//     // Find user
//     const user = await usersCollection.findOne({ email });
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Find uncredited successful payments for this user
//     const payments = await paymentsCollection
//       .find({ customerEmail: email, status: "successful", credited: { $ne: true } })
//       .toArray();

//     if (payments.length === 0) {
//       return res.status(200).json({ message: "No new payments to credit", totalAdded: 0 });
//     }

//     // Calculate total amount to add
//     const totalAmount = payments.reduce((acc, p) => acc + p.amount, 0);

//     // Update user balance
//     const updatedUser = await usersCollection.findOneAndUpdate(
//       { email },
//       { $inc: { balance: totalAmount } },
//       { returnDocument: "after" }
//     );

//     // Mark payments as credited
//     const paymentIds = payments.map(p => p._id);
//     await paymentsCollection.updateMany(
//       { _id: { $in: paymentIds } },
//       { $set: { credited: true } }
//     );

//     res.status(200).json({
//       message: "User balance updated successfully",
//       updatedUser: updatedUser.value,
//       totalAdded: totalAmount,
//       creditedPayments: payments.length,
//     });
//   } catch (error) {
//     console.error("Balance update error:", error);
//     res.status(500).json({ message: "Server error during balance update" });
//   }
// });

// module.exports = app;








const express = require("express");
const axios = require("axios");
const { MongoClient } = require("mongodb");
const crypto = require("crypto"); // Added for potential future webhook use

const app = express.Router();
const port = process.env.PORT || 3200;
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const MONGO_URI = process.env.MONGO_URI;

// Add this if you plan to use proper webhook verification (recommended)
// const FLW_WEBHOOK_HASH = process.env.FLW_WEBHOOK_HASH; // Set this in your Flutterwave dashboard under Settings > Webhooks

// MongoDB Client Setup
let client;
let db;
let paymentsCollection;

(async () => {
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db("mydb");
    paymentsCollection = db.collection("payments");
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on("SIGINT", async () => {
  if (client) {
    await client.close();
  }
  process.exit(0);
});

// ========== API ROUTES WITH /api PREFIX ==========

// Main Verify Endpoint (called from frontend after payment redirect)
app.post("/verify-payment", async (req, res) => {
  const { transaction_id, userEmail } = req.body;

  if (!transaction_id) {
    return res.status(400).json({ message: "transaction_id is required" });
  }
  if (!userEmail) {
    return res.status(400).json({ message: "userEmail is required (authenticated user email)" });
  }

  try {
    // Verify with Flutterwave
    const verifyResponse = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET_KEY}`,
        },
      }
    );

    const verifyData = verifyResponse.data;

    if (verifyData.status !== "success" || verifyData.data.status !== "successful") {
      return res.status(400).json({ message: "Payment verification failed on Flutterwave" });
    }

    const { amount, currency, customer } = verifyData.data;

    // Optional: Extra security - check if email matches (if passed from frontend during payment)
    // if (customer?.email && customer.email !== userEmail) {
    //   return res.status(400).json({ message: "Email mismatch" });
    // }

    // Duplicate check
    const existing = await paymentsCollection.findOne({ transactionId: transaction_id });
    if (existing) {
      return res.json({
        message: "Payment already verified and saved",
        data: existing,
      });
    }

    // Save to DB
    const paymentData = {
      transactionId: transaction_id,
      amount,
      currency,
      status: "successful",
      customerEmail: userEmail,
      createdAt: new Date(),
      credited: false, // For balance update tracking
    };

    await paymentsCollection.insertOne(paymentData);

    res.json({
      message: "Payment successfully verified and saved",
      data: paymentData,
    });
  } catch (error) {
    console.error("Verification/Save error:", error.message || error);
    res.status(500).json({ message: "Server error during verification" });
  }
});

// Optional Webhook Endpoint (recommended for async payments like bank transfers)
// Note: Current code is fixed to use direct comparison (verif-hash). For HMAC, uncomment the block below.
app.post("/webhook/flutterwave", express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }), async (req, res) => {
  // Simple verif-hash verification (most common and recommended by Flutterwave docs)
  const signature = req.headers["verif-hash"];

  res.status(200).send("OK");
});

// Get all payments (for admin/debug)
app.get("/payments", async (req, res) => {
  try {
    const allPayments = await paymentsCollection.find({}).sort({ createdAt: -1 }).toArray();
    res.json(allPayments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching payments" });
  }
});

// Update user balance based on successful uncredited payments
app.patch("/update-balance", async (req, res) => {
  try {
    const usersCollection = db.collection("userCollection");

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find user
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find uncredited successful payments for this user
    const payments = await paymentsCollection
      .find({ customerEmail: email, status: "successful", credited: { $ne: true } })
      .toArray();

    if (payments.length === 0) {
      return res.status(200).json({ message: "No new payments to credit", totalAdded: 0 });
    }

    // Load buyer deposit rate from settings and credit net amounts
    const settingsCol = db.collection("settings");
    const settingsDoc = await settingsCol.findOne({ _id: "config" });
    const rate = (settingsDoc && settingsDoc.buyerDepositRate) ? Number(settingsDoc.buyerDepositRate) : 0;

    let totalAdded = 0;
    const paymentIds = [];

    for (const p of payments) {
      const amt = Number(p.amount || 0);
      const fee = Number(((amt * rate) / 100).toFixed(2));
      const net = Number((amt - fee).toFixed(2));

      // Credit user with net amount
      await usersCollection.updateOne({ email }, { $inc: { balance: net } });

      // Mark this payment as credited and store computed values
      await paymentsCollection.updateOne({ _id: p._id }, { $set: { credited: true, creditedAmount: net, fee: fee, feeRate: rate } });

      totalAdded += net;
      paymentIds.push(p._id);
    }

    const updatedUser = await usersCollection.findOne({ email });

    res.status(200).json({
      message: "User balance updated successfully",
      updatedUser,
      totalAdded,
      creditedPayments: payments.length,
    });
  } catch (error) {
    console.error("Balance update error:", error);
    res.status(500).json({ message: "Server error during balance update" });
  }
});

module.exports = app;