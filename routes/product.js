const express = require("express");
const { MongoClient } = require("mongodb");

const router = express.Router();

const MONGO_URI = process.env.MONGO_URI;

// Mongo DB
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const productCollection = db.collection("products");

(async () => await client.connect())();


// API: /product/sell
router.post("/sell", async (req, res) => {
    const data = req.body;
    const result = await productCollection.insertOne(data);
    res.send(result);
})

// to get all product data 
// API: /product/all-sells
router.get("/all-sells", async (req, res) => {
    const allData = await productCollection.find({}).toArray();
    res.send(allData)
})

module.exports = router;
