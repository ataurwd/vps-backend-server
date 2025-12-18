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
    userCollection = db.collection("userCollection");
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
const cart = require('./routes/cart')

app.use("/flutterwave", flutterwaveRoutes);
app.use("/korapay", korapayRoutes);
app.use("/api/user", userRoute);
app.use("/api/notification", notificationRoute);
app.use("/product", allProduct)
app.use("/chat", chat)
app.use("/cart", cart)

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
  const data = req.body
  const result = await payments.insertOne(data);
  res.send(result)
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



// complete payment after approved
app.patch("/payments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    // 1️⃣ payment খুঁজে বের করি
    const payment = await payments.findOne({ _id: new ObjectId(id) });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // 2️⃣ payment status update
    await payments.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          "meta.updatedAt": new Date(),
        },
      }
    );

    // 3️⃣ যদি Approved হয় → user balance update
    if (status === "Approved") {
      const user = await userCollection.findOne({ email: payment.email });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found for this payment",
        });
      }

      await userCollection.updateOne(
        { _id: user._id },
        {
          $inc: {
            balance: Number(payment.amount), // 🔥 amount add হচ্ছে
          },
        }
      );
    }

    res.json({
      success: true,
      message:
        status === "Approved"
          ? "Payment approved & user balance updated"
          : "Payment status updated",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
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
