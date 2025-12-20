const express = require("express");
const { MongoClient } = require("mongodb");

const router = express.Router();

const MONGO_URI = process.env.MONGO_URI;

// Mongo DB
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const cartCollectoin = db.collection("cart");

(async () => await client.connect())();


// to post add cart data
// api endpoint =====/cart/post
router.post("/post", async (req, res) => {
    const data = req.body;
    const result = await cartCollectoin.insertOne(data);
    res.send(result)
})


// ai endpoint =======/cart/getall
router.get("/getall", async (req, res) => {
     const notifications = await cartCollectoin.find({}).toArray();
  res.send(notifications);
})


module.exports = router;
