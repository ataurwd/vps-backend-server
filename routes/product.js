const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors"); // CORS সমস্যার সমাধান করতে
require("dotenv").config();

const router = express.Router();

// Middleware
router.use(express.json());
router.use(cors());

// MongoDB configuration
const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const productCollection = db.collection("products");


(async () => {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
    } catch (err) {
        console.error("MongoDB Connection Error:", err);
    }
})();


router.post("/sell", async (req, res) => {
    try {
        const data = req.body;
        
        if (!data.status) data.status = "pending"; 
        
        const result = await productCollection.insertOne(data);
        res.status(201).send(result);
    } catch (error) {
        res.status(500).send({ message: "Error inserting product" });
    }
});

router.get("/all-sells", async (req, res) => {
    try {
        const allData = await productCollection.find({}).toArray();
        res.status(200).send(allData);
    } catch (error) {
        res.status(500).send({ message: "Error fetching products" });
    }
});
router.patch("/update-status/:id", async (req, res) => {
    const id = req.params.id;
    const { status, rejectReason } = req.body;

    try {
        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid ID format" });
        }

        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
            $set: {
                status: status,
                rejectReason: status === "reject" ? rejectReason : ""
            },
        };

        const result = await productCollection.updateOne(filter, updateDoc);

        if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Product not found" });
        }

        res.status(200).send({ 
            message: "Status updated successfully", 
            success: true,
            modifiedCount: result.modifiedCount 
        });
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).send({ message: "Internal server error" });
    }
});



// DELETE API
router.delete("/delete/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const result = await productCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount > 0) {
            res.status(200).send({ message: "Deleted successfully" });
        } else {
            res.status(404).send({ message: "Not found" });
        }
    } catch (error) {
        res.status(500).send({ message: "Server error" });
    }
});


module.exports = router;