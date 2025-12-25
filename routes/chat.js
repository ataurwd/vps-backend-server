const express = require("express");
const { MongoClient, ObjectId } = require("mongodb"); // ObjectId ইমপোর্ট করতে হবে
const router = express.Router();

const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);

async function run() {
  try {
    await client.connect();
    const db = client.db("mydb");
    const chatCollection = db.collection("chatCollection");

    console.log("Connected to MongoDB for Chats");

    // =========================================================
    // 🔥 AUTO DELETE SETUP (MongoDB TTL Index)
    // =========================================================
    // এই লাইনটি একবার রান হলেই ডাটাবেস বুঝে যাবে যে 'timestamp' ফিল্ডটি
    // ৩০ দিনের (২৫৯২০০০ সেকেন্ড) বেশি পুরনো হলে অটো ডিলিট করতে হবে।
    // আপনাকে আর ফ্রন্টএন্ড বা ব্যাকএন্ডে ম্যানুয়ালি চেক করতে হবে না।
    await chatCollection.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 2592000 });


    // ---------------------------------------------------------
    // 1. POST: Send Message (Save with Order ID)
    // ---------------------------------------------------------
    router.post("/send", async (req, res) => {
      try {
        const { senderId, receiverId, message, orderId } = req.body;

        if (!senderId || !receiverId || !message || !orderId) {
          return res.status(400).json({ 
            error: "All fields including 'orderId' are required" 
          });
        }

        const newMessage = {
          senderId,
          receiverId,
          message,
          orderId, 
          // এখানে new Date() ব্যবহার করা জরুরি, কারণ TTL ইনডেক্স Date অবজেক্টের ওপর কাজ করে
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
        const { orderId } = req.query; 

        if (!orderId) {
          return res.status(400).json({ 
            error: "Order ID is required to fetch specific chat history" 
          });
        }

        const query = {
          $and: [
            {
              $or: [
                { senderId: user1, receiverId: user2 },
                { senderId: user2, receiverId: user1 },
              ],
            },
            { orderId: orderId } 
          ],
        };

        const chats = await chatCollection
          .find(query)
          .sort({ timestamp: 1 }) 
          .toArray();

        res.status(200).json(chats);
      } catch (error) {
        console.error("History Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // ---------------------------------------------------------
    // 3. DELETE: Delete Specific Message (For Frontend Manual Call)
    // ---------------------------------------------------------
    // যদি ফ্রন্টএন্ড থেকে ম্যানুয়ালি ডিলিট রিকোয়েস্ট আসে, এটা হ্যান্ডেল করবে
    router.delete("/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await chatCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ error: "Could not delete message" });
      }
    });

  } catch (error) {
    console.error("Database connection error:", error);
  }
}



run();

module.exports = router;