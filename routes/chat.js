const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const router = express.Router();
const MONGO_URI = process.env.MONGO_URI;

// MongoDB Connection
const client = new MongoClient(MONGO_URI);
let chatCollection;

async function connectDB() {
    try {
        await client.connect();
        const db = client.db("mydb");
        chatCollection = db.collection("chatCollection");
        console.log("Connected to MongoDB for Chats");
    } catch (err) {
        console.error("Failed to connect to MongoDB", err);
    }
}
connectDB();

// 1. POST: Message Pathano (Save Chat)
router.post("/send", async (req, res) => {
    try {
        const { senderId, receiverId, message } = req.body;

        if (!senderId || !receiverId || !message) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const newMessage = {
            senderId,
            receiverId,
            message,
            timestamp: new Date(),
        };

        const result = await chatCollection.insertOne(newMessage);
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// 2. GET: Private Chat History (Specific duijon-er moddhe)
router.get("/history/:user1/:user2", async (req, res) => {
    try {
        const { user1, user2 } = req.params;

        // Query: User1 sender hole User2 receiver, athoba User2 sender hole User1 receiver
        const query = {
            $or: [
                { senderId: user1, receiverId: user2 },
                { senderId: user2, receiverId: user1 }
            ]
        };

        const chats = await chatCollection
            .find(query)
            .sort({ timestamp: 1 }) // Somoy onujayi sajano
            .toArray();

        res.status(200).json(chats);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;