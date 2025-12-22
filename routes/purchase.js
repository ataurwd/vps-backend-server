const express = require("express");
const { MongoClient } = require("mongodb");

const router = express.Router();

const MONGO_URI = process.env.MONGO_URI;

// Mongo DB
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const mypurchase = db.collection("mypurchase");
(async () => await client.connect())();


//  to post purchase data
// api endpoint =====/purchase/post
router.post("/post", async (req, res) => {
    const data = req.body;
    const result = await mypurchase.insertOne(data);
    res.send(result)
})

// to get all purchase data
// api endpoint =====/purchase/getall
router.get("/getall", async (req, res) => {
    try {
      
        const notifications = await mypurchase.find({}).toArray();
        res.status(200).send(notifications);
    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
});


module.exports = router;