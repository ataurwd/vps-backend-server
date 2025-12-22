const express = require("express");
const { MongoClient } = require("mongodb");
const router = express.Router();

const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);

async function run() {
  try {
    await client.connect();
    const db = client.db("mydb");
    const chatCollection = db.collection("chatCollection");

    console.log("Connected to MongoDB for Chats");

    // ---------------------------------------------------------
    // 1. POST: Send Message (Save with Order ID)
    // ---------------------------------------------------------
    router.post("/send", async (req, res) => {
      try {
        const { senderId, receiverId, message, orderId } = req.body;

        // Validation: orderId is now mandatory
        if (!senderId || !receiverId || !message || !orderId) {
          return res.status(400).json({ 
            error: "All fields including 'orderId' are required" 
          });
        }

        const newMessage = {
          senderId,
          receiverId,
          message,
          orderId, // This separates the chat rooms per product
          timestamp: new Date(),
        };

        const result = await chatCollection.insertOne(newMessage);
        res.status(201).json({ success: true, data: result });
      } catch (error) {
        console.error("Send Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // ---------------------------------------------------------
    // 2. GET: Chat History (Filtered by User AND Order ID)
    // ---------------------------------------------------------
    router.get("/history/:user1/:user2", async (req, res) => {
      try {
        const { user1, user2 } = req.params;
        const { orderId } = req.query; // Frontend must send ?orderId=...

        if (!orderId) {
          return res.status(400).json({ 
            error: "Order ID is required to fetch specific chat history" 
          });
        }

        // Logic: (User1 <-> User2) AND (Specific Order ID)
        const query = {
          $and: [
            {
              $or: [
                { senderId: user1, receiverId: user2 },
                { senderId: user2, receiverId: user1 },
              ],
            },
            { orderId: orderId } // This ensures messages don't mix up
          ],
        };

        const chats = await chatCollection
          .find(query)
          .sort({ timestamp: 1 }) // Oldest first
          .toArray();

        res.status(200).json(chats);
      } catch (error) {
        console.error("History Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

  } catch (error) {
    console.error("Database connection error:", error);
  }
}

run();

module.exports = router;