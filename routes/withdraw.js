const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const router = express.Router();

// MongoDB connection URI from environment variables
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    throw new Error("Please define the MONGO_URI environment variable.");
}

// Create MongoDB client
const client = new MongoClient(MONGO_URI);

// Database and collection references
let cartCollection; // We'll assign this after successful connection

// Connect to MongoDB once when the module loads
(async () => {
    try {
        await client.connect();
        console.log("Connected to MongoDB successfully!");

        const db = client.db("mydb");
        cartCollection = db.collection("withdraw"); // Fixed typo: "withdraw" not "cartCollectoin"
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        process.exit(1); // Exit if connection fails
    }
})();

// POST: Create a new withdrawal request
// Endpoint: POST /withdraw/post
router.post("/post", async (req, res) => {
    try {
        if (!cartCollection) {
            return res.status(503).send({ message: "Database not ready yet." });
        }

        const data = req.body;

        // Basic validation (optional: add more as needed)
        if (!data.userId || !data.amount) {
            return res.status(400).send({ message: "userId and amount are required." });
        }

        const result = await cartCollection.insertOne({
            ...data,
            status: "pending",        // Default status
            createdAt: new Date(),
        });

        res.status(201).send({
            success: true,
            insertedId: result.insertedId,
            message: "Withdrawal request submitted successfully.",
        });
    } catch (error) {
        console.error("Insert Error:", error);
        res.status(500).send({ message: "Failed to submit withdrawal request." });
    }
});

// PUT: Approve a withdrawal by ID
// Endpoint: PUT /withdraw/approve/:id
router.put("/approve/:id", async (req, res) => {
    try {
        if (!cartCollection) {
            return res.status(503).send({ message: "Database not ready yet." });
        }

        const { id } = req.params;

        // Validate ObjectId format
        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid withdrawal ID format." });
        }

        const result = await cartCollection.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    status: "approved",
                    approvedAt: new Date(),
                },
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Withdrawal request not found." });
        }

        res.status(200).send({
            success: true,
            modifiedCount: result.modifiedCount,
            message: "Withdrawal approved successfully.",
        });
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
});

// GET: Get all withdrawal requests (for admin)
// Endpoint: GET /withdraw/getall
router.get("/getall", async (req, res) => {
    try {
        if (!cartCollection) {
            return res.status(503).send({ message: "Database not ready yet." });
        }

        const withdrawals = await cartCollection
            .find({})
            .sort({ createdAt: -1 }) // Latest first
            .toArray();

        res.status(200).send(withdrawals);
    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).send({ message: "Failed to fetch withdrawals." });
    }
});

router.get("/get/:id", async (req, res) => {
    try {
        if (!cartCollection) return res.status(503).send({ message: "DB not ready" });

        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid withdrawal ID format" });
        }

        const withdrawal = await cartCollection.findOne({ _id: new ObjectId(id) });

        if (!withdrawal) {
            return res.status(404).send({ message: "Withdrawal not found" });
        }

        res.status(200).send(withdrawal);
    } catch (error) {
        console.error("Fetch Single Error:", error);
        res.status(500).send({ message: "Server error" });
    }
});
module.exports = router;