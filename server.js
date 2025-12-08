const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Raw body for Korapay webhook
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

app.use(cors());

// Load payment modules
const flutterwaveRoutes = require("./flutterwave");
const korapayRoutes = require("./korapay");

app.use("/flutterwave", flutterwaveRoutes);
app.use("/korapay", korapayRoutes);

app.get("/", (req, res) => {
  res.send("Payment API Running ✔");
});


// to get all payment data
const { MongoClient } = require("mongodb");
const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);
const db = client.db("flutterwaveDB");
const payments = db.collection("payments");
(async () => await client.connect())();

app.get("/payments", async (req, res) => {  
  try {
    const allPayments = await payments.find({}).toArray();
    res.json(allPayments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3200;
app.listen(PORT, () => console.log(`🚀 Server Running on ${PORT}`));
