const express = require("express");
const { MongoClient } = require("mongodb");

const router = express.Router();

const MONGO_URI = process.env.MONGO_URI;

// Mongo DB
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const notification = db.collection("notifiCollection");

(async () => await client.connect())();

// POST /api/notification/notify
router.post("/notify", async (req, res) => {
  const data = req.body;
  const result = await notification.insertOne(data)
  res.send(result)
});

// GET /api/notification/getall
router.get("/getall", async (req, res) => {
  const notifications = await notification.find({}).toArray();
  res.send(notifications);
});

// ... (আপনার আগের কোড) ...

// DELETE: Clear all notifications for a specific user
router.delete("/clear-all/:email", async (req, res) => {
  const email = req.params.email;
  
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const result = await notification.deleteMany({ userEmail: email });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error("Clear All Error:", err);
    res.status(500).json({ error: "Failed to clear notifications" });
  }
});


module.exports = router;
