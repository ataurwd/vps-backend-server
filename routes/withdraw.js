const express = require("express");
const { MongoClient } = require("mongodb");

const router = express.Router();

const MONGO_URI = process.env.MONGO_URI;

// Mongo DB
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const cartCollectoin = db.collection("withdraw");
(async () => await client.connect())();

// to post withdraw 
// api endpoint =====/withdraw/post
router.post("/post", async (req, res) => {
    const data = req.body;
    const result = await cartCollectoin.insertOne(data);
    res.send(result)
})

// to get all withdraw data
// api endpoint =====/withdraw/getall
router.get("/getall", async (req, res) => {
    try {
      
        const notifications = await cartCollectoin.find({}).toArray();
        res.status(200).send(notifications);
    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
});


module.exports = router;