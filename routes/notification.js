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


module.exports = router;
