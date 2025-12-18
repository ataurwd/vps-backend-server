


const express = require("express");
const { MongoClient, ObjectId } = require("mongodb"); // ObjectId ইম্পোর্ট করতে হবে

const router = express.Router();

const MONGO_URI = process.env.MONGO_URI;

// Mongo DB
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const productCollection = db.collection("products");

(async () => await client.connect())();


// API: /product/sell (ডাটা ইনসার্ট করা)
router.post("/sell", async (req, res) => {
    const data = req.body;
    const result = await productCollection.insertOne(data);
    res.send(result);
});

// API: /product/all-sells (সব ডাটা গেট করা)
router.get("/all-sells", async (req, res) => {
    const allData = await productCollection.find({}).toArray();
    res.send(allData);
});

// --- নতুন রাউট: স্ট্যাটাস আপডেট করার জন্য ---
// API: /product/update-status/:id
router.patch("/update-status/:id", async (req, res) => {
    const id = req.params.id; // ফ্রন্টএন্ড থেকে পাঠানো আইডি
    const status = req.body.status; // ফ্রন্টএন্ড থেকে পাঠানো নতুন স্ট্যাটাস

    try {
        const filter = { _id: new ObjectId(id) }; // আইডি অনুযায়ী ফিল্টার তৈরি
        const updateDoc = {
            $set: { status: status }, // শুধুমাত্র স্ট্যাটাস ফিল্ডটি আপডেট করবে
        };

        const result = await productCollection.updateOne(filter, updateDoc);
        
        if (result.modifiedCount > 0) {
            res.status(200).send({ message: "Status updated successfully", success: true });
        } else {
            res.status(404).send({ message: "Product not found or status already same", success: false });
        }
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).send({ message: "Internal server error" });
    }
});

module.exports = router;