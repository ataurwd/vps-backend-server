const express = require("express");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const router = express.Router();
router.use(express.json());

const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const settingsCollection = db.collection("settings");

(async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB (settings route)");
  } catch (err) {
    console.error("MongoDB Connection Error (settings):", err);
  }
})();

// GET /api/settings  -> returns settings (creates default if missing)
router.get("/", async (req, res) => {
  try {
    let doc = await settingsCollection.findOne({ _id: "config" });
    if (!doc) {
      doc = { _id: "config", registrationFee: 15 };
      await settingsCollection.insertOne(doc);
    }
    res.json({ success: true, settings: doc });
  } catch (err) {
    console.error("GET /api/settings error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/settings -> update settings (body: { registrationFee })
router.post("/", async (req, res) => {
  try {
    const { registrationFee } = req.body;
    if (registrationFee === undefined || isNaN(Number(registrationFee))) {
      return res.status(400).json({ success: false, message: "Invalid registrationFee" });
    }

    const fee = Number(registrationFee);
    await settingsCollection.updateOne(
      { _id: "config" },
      { $set: { registrationFee: fee } },
      { upsert: true }
    );

    res.json({ success: true, registrationFee: fee });
  } catch (err) {
    console.error("POST /api/settings error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
