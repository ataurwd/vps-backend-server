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

//dlt car
const { ObjectId } = require("mongodb"); // এটি উপরে ইমপোর্ট করে নিন
router.delete("/delete/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }; // আইডি অনুযায়ী কোয়েরি
        const result = await cartCollectoin.deleteOne(query);

        if (result.deletedCount === 1) {
            res.status(200).send({ message: "Successfully deleted", success: true });
        } else {
            res.status(404).send({ message: "Item not found", success: false });
        }
    } catch (error) {
        res.status(500).send({ message: "Error deleting item", error });
    }
});

// ai endpoint =======/cart/getall
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
