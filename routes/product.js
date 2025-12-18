


const express = require("express");
const { MongoClient, ObjectId } = require("mongodb"); 

const router = express.Router();

const MONGO_URI = process.env.MONGO_URI;

// Mongo DB
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const productCollection = db.collection("products");

(async () => await client.connect())();



router.post("/sell", async (req, res) => {
    const data = req.body;
    const result = await productCollection.insertOne(data);
    res.send(result);
});


router.get("/all-sells", async (req, res) => {
    const allData = await productCollection.find({}).toArray();
    res.send(allData);
});


router.patch("/update-status/:id", async (req, res) => {
    const id = req.params.id; 
    const status = req.body.status; 

    try {
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
            $set: { status: status }, 
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