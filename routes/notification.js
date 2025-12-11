const express = require("express");
const axios = require("axios");
const { MongoClient } = require("mongodb");

const router = express.Router();

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const MONGO_URI = process.env.MONGO_URI;

// Mongo DB
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const users = db.collection("notificationCollection");

(async () => await client.connect())();


router.post("/notify", async (req, res) => {
    const notificationData = req.body;
    const result = await users.insertOne(notificationData);
    res.send(result);
})
// to get all notifications data
router.get("/getall", async (req, res) => {
    const allNotifications = await users.find({}).toArray();
    res.send(allNotifications);
});

module.exports = router;
