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
router.get("/getall", async (req, res) => {
    const allUsers = await users.find({}).toArray();
    res.send(allUsers);
});

module.exports = router;