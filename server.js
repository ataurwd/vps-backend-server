// =======================================
// server.js (FULLY FIXED & CLEAN VERSION)
// =======================================

const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient } = require("mongodb");

const app = express();

// Enable normal JSON body + rawBody for Korapay webhooks
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

app.use(cors());


// ---------------------------
// 💾 DATABASE CONNECTION
// ---------------------------
const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);

let payments; // collection instance

async function connectDB() {
  try {
    await client.connect();
    const db = client.db("mydb");
    payments = db.collection("payments");
    console.log("📦 MongoDB Connected Successfully");
  } catch (err) {
    console.error("❌ MongoDB Error:", err);
  }
}
connectDB();




// ---------------------------
//  ROUTES
// ---------------------------
const flutterwaveRoutes = require("./flutterwave");
const korapayRoutes = require("./korapay");
const userRoute = require('./routes/user');
const notificationRoute = require('./routes/notification')


app.use("/flutterwave", flutterwaveRoutes);
app.use("/korapay", korapayRoutes);
app.use("/api/user", userRoute);
app.use("/api/notification", notificationRoute);


// ---------------------------
// ROOT CHECK
// ---------------------------
app.get("/", (req, res) => {
  res.send("Payment API Running ✔");
});


// ---------------------------
// GET ALL PAYMENTS
// ---------------------------
app.get("/payments", async (req, res) => {
  try {
    const allPayments = await payments.find({}).toArray();
    res.json(allPayments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ====================================================================
// 🚀 NEW FIXED: POST /api/submit  (this had errors earlier)
// ====================================================================
app.post("/api/submit", async (req, res) => {
  try {
    const { paymentMethod, name, transactionId, message, submittedAt } = req.body;

    // Required field check
    if (!paymentMethod) {
      return res.status(400).json({
        error: "paymentMethod is required",
      });
    }

    // Build DB document
    const doc = {
      paymentMethod,
      name: name || null,
      transactionId: transactionId || null,
      message: message || null,
      submittedAt: submittedAt ? new Date(submittedAt) : new Date(),
      status: "Pending",
      meta: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await payments.insertOne(doc);
    const paymentId = result.insertedId;

    const paymentUrl = `https://example.com/pay/${paymentId}`;

    console.log("💾 Saved Payment:", {
      paymentId,
      paymentMethod,
      name,
      transactionId,
    });

    res.json({
      message: "Payment record created successfully",
      paymentId,
      paymentUrl,
    });
  } catch (err) {
    console.error("❌ Error in /api/submit:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ---------------------------
// START SERVER
// ---------------------------
const PORT = process.env.PORT || 3200;
app.listen(PORT, () => console.log(`🚀 Server Running on ${PORT}`));




///////////////////// --------Sabba---------//////////////////////


async function connectDB() {
  try {
    await client.connect();
    const db = client.db("mydb");

    // collections
    payments = db.collection("payments");
    const notifications = db.collection("notifications");

    // expose to routes via app.set (so routes can get with req.app.get('notifications'))
    app.set("payments", payments);
    app.set("notifications", notifications);

    console.log("📦 MongoDB Connected Successfully");
  } catch (err) {
    console.error("❌ MongoDB Error:", err);
  }
}
connectDB();