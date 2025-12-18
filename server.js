// =======================================
// server.js (FULLY FIXED & CLEAN VERSION)
// =======================================

const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");

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
    iconsdb = db.collection("icons")
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
const allProduct = require('./routes/product')
const chat = require('./routes/chat')

app.use("/flutterwave", flutterwaveRoutes);
app.use("/korapay", korapayRoutes);
app.use("/api/user", userRoute);
app.use("/api/notification", notificationRoute);
app.use("/product", allProduct)
app.use("/chat", chat)

// ---------------------------
// ROOT CHECK
// ---------------------------
app.get("/", (req, res) => {
  res.send("Payment API Running ✔");
});


// ---------------------------
// GET ALL PAYMENTS
// ---------------------------




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

app.get("/payments", async (req, res) => {
  try {
    const allPayments = await payments.find({}).toArray();
    res.json(allPayments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// get single data based on the id
app.get("/payments/:id", async (req, res) => {
  const { id } = req.params;

  const payment = await payments.findOne({ _id: new ObjectId(id) });

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: "Payment not found",
    });
  }

  res.json(payment);
});


// edit status
app.patch("/payments/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      message: "Status is required",
    });
  }

  const result = await payments.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status,
        "meta.updatedAt": new Date(),
      },
    }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({
      success: false,
      message: "Payment not found",
    });
  }

  res.json({
    success: true,
    message: "Payment status updated successfully",
  });
});

// get all icons collection
app.get("/icon-data", async (req, res) => {
  try {
    const data = await iconsdb.find({}).toArray();

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Error fetching icon data:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch icon data",
    });
  }
});



// to get all data fron icons collection

// ---------------------------
// START SERVER
// ---------------------------
const PORT = process.env.PORT || 3200;
app.listen(PORT, () => console.log(`🚀 Server Running on ${PORT}`));
