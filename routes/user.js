const express = require("express");
const axios = require("axios");
const { MongoClient } = require("mongodb");

const router = express.Router();

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const MONGO_URI = process.env.MONGO_URI;

// Mongo DB
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const users = db.collection("userCollection");

(async () => await client.connect())();


router.post("/register", async (req, res) => {
    const userData = req.body;
    const result = await users.insertOne(userData);
    res.send(result);
})

// to get all users data
// API: /api/user/getall
router.get("/getall", async (req, res) => {
    const allUsers = await users.find({}).toArray();
    res.send(allUsers);
});


router.post("/login", async (req, res) => {
  const { email, password } = req.body;

    const user = await users.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.password !== password) {
      return res.status(400).json({ success: false, message: "Wrong password" });
    }

    res.json({
      success: true,
      message: "Login successful",
      user,
    });

});

module.exports = router;