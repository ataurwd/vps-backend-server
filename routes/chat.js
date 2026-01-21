// const express = require("express");
// const { MongoClient, ObjectId } = require("mongodb"); // ObjectId ইমপোর্ট করতে হবে
// const router = express.Router();

// const MONGO_URI = process.env.MONGO_URI;
// const client = new MongoClient(MONGO_URI);

// async function run() {
//   try {
//     await client.connect();
//     const db = client.db("mydb");
//     const chatCollection = db.collection("chatCollection");

//     await chatCollection.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 2592000 });


//     // ---------------------------------------------------------
//     // 1. POST: Send Message (Save with Order ID)
//     // ---------------------------------------------------------
//     router.post("/send", async (req, res) => {
//       try {
//         const { senderId, receiverId, message, orderId } = req.body;

//         if (!senderId || !receiverId || !message || !orderId) {
//           return res.status(400).json({ 
//             error: "All fields including 'orderId' are required" 
//           });
//         }

//         const newMessage = {
//           senderId,
//           receiverId,
//           message,
//           orderId, 
//           // এখানে new Date() ব্যবহার করা জরুরি, কারণ TTL ইনডেক্স Date অবজেক্টের ওপর কাজ করে
//           timestamp: new Date(), 
//         };

//         const result = await chatCollection.insertOne(newMessage);
//         res.status(201).json({ success: true, data: result });
//       } catch (error) {
//         console.error("Send Error:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//       }
//     });

//     // ---------------------------------------------------------
//     // 2. GET: Chat History (Filtered by User AND Order ID)
//     // ---------------------------------------------------------
//     router.get("/history/:user1/:user2", async (req, res) => {
//       try {
//         const { user1, user2 } = req.params;
//         const { orderId } = req.query; 

//         if (!orderId) {
//           return res.status(400).json({ 
//             error: "Order ID is required to fetch specific chat history" 
//           });
//         }

//         const query = {
//           $and: [
//             {
//               $or: [
//                 { senderId: user1, receiverId: user2 },
//                 { senderId: user2, receiverId: user1 },
//               ],
//             },
//             { orderId: orderId } 
//           ],
//         };

//         const chats = await chatCollection
//           .find(query)
//           .sort({ timestamp: 1 }) 
//           .toArray();

//         res.status(200).json(chats);
//       } catch (error) {
//         console.error("History Error:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//       }
//     });

//     // ---------------------------------------------------------
//     // 3. DELETE: Delete Specific Message (For Frontend Manual Call)
//     // ---------------------------------------------------------
//     // যদি ফ্রন্টএন্ড থেকে ম্যানুয়ালি ডিলিট রিকোয়েস্ট আসে, এটা হ্যান্ডেল করবে
//     router.delete("/:id", async (req, res) => {
//       try {
//         const id = req.params.id;
//         const query = { _id: new ObjectId(id) };
//         const result = await chatCollection.deleteOne(query);
//         res.send(result);
//       } catch (error) {
//         console.error("Delete Error:", error);
//         res.status(500).json({ error: "Could not delete message" });
//       }
//     });

//   } catch (error) {
//     console.error("Database connection error:", error);
//   }
// }



// run();

// module.exports = router;



//ArifurRahman Updated Code Below



// const express = require("express");
// const { MongoClient, ObjectId } = require("mongodb"); // ObjectId ইমপোর্ট করতে হবে
// const router = express.Router();

// const MONGO_URI = process.env.MONGO_URI;
// const client = new MongoClient(MONGO_URI);

// async function run() {
//   try {
//     await client.connect();
//     const db = client.db("mydb");
//     const chatCollection = db.collection("chatCollection");

//     const presenceCollection = db.collection("presenceCollection");

//     await chatCollection.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 2592000 });
//     // keep presence docs for up to 1 hour (cleanup)
//     await presenceCollection.createIndex({ "lastSeen": 1 }, { expireAfterSeconds: 3600 });
//     const notificationCollection = db.collection("notifiCollection");


//     // ---------------------------------------------------------
//     // 1. POST: Send Message (Save with Order ID)
//     // ---------------------------------------------------------
//     router.post("/send", async (req, res) => {
//       try {
//         const { senderId, receiverId, message, orderId } = req.body;

//         if (!senderId || !receiverId || !message || !orderId) {
//           return res.status(400).json({ 
//             error: "All fields including 'orderId' are required" 
//           });
//         }

//         const newMessage = {
//           senderId,
//           receiverId,
//           message,
//           orderId, 
//           // এখানে new Date() ব্যবহার করা জরুরি, কারণ TTL ইনডেক্স Date অবজেক্টের ওপর কাজ করে
//           timestamp: new Date(), 
//         };

//         const result = await chatCollection.insertOne(newMessage);
//         // mark sender presence as online when they send a message
//         try {
//           await presenceCollection.updateOne({ userId: senderId }, { $set: { lastSeen: new Date(), status: 'online' } }, { upsert: true });
//         } catch (e) { /* ignore presence update errors */ }

//         // create a notification for the receiver so they can be alerted when chat is closed
//         try {
//           await notificationCollection.insertOne({
//             userEmail: receiverId,
//             type: 'chat',
//             from: senderId,
//             message,
//             orderId: orderId || null,
//             read: false,
//             createdAt: new Date(),
//           });
//         } catch (e) { /* ignore notification errors */ }
//         res.status(201).json({ success: true, data: result });
//       } catch (error) {
//         console.error("Send Error:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//       }
//     });

//     // ---------------------------------------------------------
//     // 2. GET: Chat History (Filtered by User AND Order ID)
//     // ---------------------------------------------------------
//     router.get("/history/:user1/:user2", async (req, res) => {
//       try {
//         const { user1, user2 } = req.params;
//         const { orderId } = req.query; 

//         if (!orderId) {
//           return res.status(400).json({ 
//             error: "Order ID is required to fetch specific chat history" 
//           });
//         }

//         const query = {
//           $and: [
//             {
//               $or: [
//                 { senderId: user1, receiverId: user2 },
//                 { senderId: user2, receiverId: user1 },
//               ],
//             },
//             { orderId: orderId } 
//           ],
//         };

//         const chats = await chatCollection
//           .find(query)
//           .sort({ timestamp: 1 }) 
//           .toArray();

//         res.status(200).json(chats);
//       } catch (error) {
//         console.error("History Error:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//       }
//     });

//     // ---------------------------------------------------------
//     // 3. DELETE: Delete Specific Message (For Frontend Manual Call)
//     // ---------------------------------------------------------
//     // যদি ফ্রন্টএন্ড থেকে ম্যানুয়ালি ডিলিট রিকোয়েস্ট আসে, এটা হ্যান্ডেল করবে
//     router.delete("/:id", async (req, res) => {
//       try {
//         const id = req.params.id;
//         const query = { _id: new ObjectId(id) };
//         const result = await chatCollection.deleteOne(query);
//         res.send(result);
//       } catch (error) {
//         console.error("Delete Error:", error);
//         res.status(500).json({ error: "Could not delete message" });
//       }
//     });

//     // ---------------------------------------------------------
//     // 4. POST: Update presence (online/offline)
//     // body: { userId: string, status?: 'online'|'offline' }
//     // If status === 'online' we set lastSeen = now; if 'offline' we set lastSeen to epoch
//     // ---------------------------------------------------------
//     router.post('/status', async (req, res) => {
//       try {
//         const { userId, status } = req.body;
//         if (!userId) return res.status(400).json({ error: 'userId is required' });

//         const now = new Date();
//         if (status === 'offline') {
//           await presenceCollection.updateOne({ userId }, { $set: { lastSeen: new Date(0), status: 'offline' } }, { upsert: true });
//           return res.status(200).json({ success: true });
//         }

//         await presenceCollection.updateOne({ userId }, { $set: { lastSeen: now, status: 'online' } }, { upsert: true });
//         return res.status(200).json({ success: true });
//       } catch (error) {
//         console.error('Status Error:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//       }
//     });

//     // ---------------------------------------------------------
//     // 5. GET: Get presence for a single user
//     // ---------------------------------------------------------
//     router.get('/status/:userId', async (req, res) => {
//       try {
//         const { userId } = req.params;
//         const doc = await presenceCollection.findOne({ userId });
//         const lastSeen = doc?.lastSeen || null;
//         const online = lastSeen ? (Date.now() - new Date(lastSeen).getTime()) < 300000 : false; // online if seen within 5 minutes
//         return res.status(200).json({ userId, lastSeen, online });
//       } catch (error) {
//         console.error('Get Status Error:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//       }
//     });

//     // ---------------------------------------------------------
//     // 6. GET: Get presence for two users at once
//     // ---------------------------------------------------------
//     router.get('/status/pair/:user1/:user2', async (req, res) => {
//       try {
//         const { user1, user2 } = req.params;
//         const docs = await presenceCollection.find({ userId: { $in: [user1, user2] } }).toArray();
//         const map = {};
//         [user1, user2].forEach(u => {
//           const doc = docs.find(d => d.userId === u);
//           const lastSeen = doc?.lastSeen || null;
//           const online = lastSeen ? (Date.now() - new Date(lastSeen).getTime()) < 300000 : false; // 5 minutes
//           map[u] = { userId: u, lastSeen, online };
//         });
//         return res.status(200).json(map);
//       } catch (error) {
//         console.error('Pair Status Error:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//       }
//     });

//   } catch (error) {
//     console.error("Database connection error:", error);
//   }
// }



// run();

// module.exports = router;


//ArifurRahman Final Updated Code Below






const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);

/* ===============================
   Ensure uploads folder exists
================================ */
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* ===============================
   Multer config
================================ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

async function run() {
  try {
    await client.connect();
    const db = client.db("mydb");

    const chatCollection = db.collection("chatCollection");
    const presenceCollection = db.collection("presenceCollection");
    const notificationCollection = db.collection("notifiCollection");

    /* ===============================
       TTL Index
    ================================ */
    await chatCollection.createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 2592000 }
    );

    await presenceCollection.createIndex(
      { lastSeen: 1 },
      { expireAfterSeconds: 3600 }
    );

    /* ===============================
       POST: Send Message
    ================================ */
    router.post("/send", upload.single("image"), async (req, res) => {
      try {
        console.log("BODY:", req.body);
        console.log("FILE:", req.file);

        const { senderId, receiverId, orderId } = req.body;
        const message = req.body.message || "";

        if (!senderId || !receiverId || !orderId) {
          return res.status(400).json({
            error: "senderId, receiverId and orderId are required",
          });
        }

        const imageUrl = req.file
          ? `/uploads/${req.file.filename}`
          : null;

        const newMessage = {
          senderId: senderId.toString(),
          receiverId: receiverId.toString(),
          orderId: orderId.toString(),
          message,
          imageUrl,
          timestamp: new Date(),
        };

        const result = await chatCollection.insertOne(newMessage);

        /* ---- presence update ---- */
        await presenceCollection.updateOne(
          { userId: senderId },
          { $set: { lastSeen: new Date(), status: "online" } },
          { upsert: true }
        );

        /* ---- notification ---- */
        await notificationCollection.insertOne({
          userEmail: receiverId,
          type: "chat",
          from: senderId,
          message: message || (imageUrl ? "[Image]" : ""),
          orderId,
          read: false,
          createdAt: new Date(),
        });

        res.status(201).json({
          success: true,
          data: result,
        });
      } catch (error) {
        console.error("Send Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    /* ===============================
       GET: Chat History
    ================================ */
    router.get("/history/:user1/:user2", async (req, res) => {
      try {
        const { user1, user2 } = req.params;
        const { orderId } = req.query;

        if (!orderId) {
          return res.status(400).json({ error: "Order ID is required" });
        }

        const chats = await chatCollection
          .find({
            orderId,
            $or: [
              { senderId: user1, receiverId: user2 },
              { senderId: user2, receiverId: user1 },
            ],
          })
          .sort({ timestamp: 1 })
          .toArray();

        res.status(200).json(chats);
      } catch (error) {
        console.error("History Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // /* ===============================
    //    DELETE: Message
    // ================================ */
    // router.delete("/:id", async (req, res) => {
    //   try {
    //     const id = req.params.id;
    //     const result = await chatCollection.deleteOne({
    //       _id: new ObjectId(id),
    //     });
    //     res.json(result);
    //   } catch (error) {
    //     console.error("Delete Error:", error);
    //     res.status(500).json({ error: "Could not delete message" });
    //   }
    // });

    /* ===============================
       Presence APIs
    ================================ */
    router.post("/status", async (req, res) => {
      try {
        const { userId, status } = req.body;

        if (!userId) {
          return res.status(400).json({ error: "userId is required" });
        }

        if (status === "offline") {
          await presenceCollection.updateOne(
            { userId },
            { $set: { lastSeen: new Date(0), status: "offline" } },
            { upsert: true }
          );
          return res.json({ success: true });
        }

        await presenceCollection.updateOne(
          { userId },
          { $set: { lastSeen: new Date(), status: "online" } },
          { upsert: true }
        );

        res.json({ success: true });
      } catch (error) {
        console.error("Status Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    router.get("/status/:userId", async (req, res) => {
      try {
        const { userId } = req.params;
        const doc = await presenceCollection.findOne({ userId });

        const lastSeen = doc?.lastSeen || null;
        const online = lastSeen
          ? Date.now() - new Date(lastSeen).getTime() < 300000
          : false;

        res.json({ userId, lastSeen, online });
      } catch (error) {
        console.error("Get Status Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });
  } catch (error) {
    console.error("Database connection error:", error);
  }
}

run();
module.exports = router;








// routes/chat.js
// const express = require("express");
// const { MongoClient, ObjectId } = require("mongodb");
// const router = express.Router();

// const MONGO_URI = process.env.MONGO_URI;
// const client = new MongoClient(MONGO_URI);

// async function run() {
//   try {
//     await client.connect();
//     const db = client.db("mydb");
//     const chatCollection = db.collection("chatCollection");
//     const presenceCollection = db.collection("presenceCollection");
//     const notificationCollection = db.collection("notifiCollection");

//     // TTL Indexes
//     await chatCollection.createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 days
//     await presenceCollection.createIndex({ lastSeen: 1 }, { expireAfterSeconds: 3600 }); // 1 hour

//     // ----------------------
//     // 1. POST: Send Message
//     // ----------------------
//     router.post("/send", async (req, res) => {
//       try {
//         const { senderId, receiverId, message, orderId } = req.body || {};
//         if (!senderId || !receiverId || !message || !orderId) {
//           return res.status(400).json({ error: "All fields including 'orderId' are required" });
//         }

//         const newMessage = { senderId, receiverId, message, orderId, timestamp: new Date() };
//         const result = await chatCollection.insertOne(newMessage);

//         // Update sender presence
//         try {
//           await presenceCollection.updateOne(
//             { userId: senderId },
//             { $set: { lastSeen: new Date(), status: "online" } },
//             { upsert: true }
//           );
//         } catch (e) {}

//         // Notification for receiver
//         try {
//           await notificationCollection.insertOne({
//             userEmail: receiverId,
//             type: "chat",
//             from: senderId,
//             message,
//             orderId,
//             read: false,
//             createdAt: new Date(),
//           });
//         } catch (e) {}

//         res.status(201).json({ success: true, data: result });
//       } catch (error) {
//         console.error("Send Error:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//       }
//     });

//     // ----------------------
//     // 2. GET: Chat History
//     // ----------------------
//     router.get("/history/:user1/:user2", async (req, res) => {
//       try {
//         const { user1, user2 } = req.params;
//         const { orderId } = req.query || {};
//         if (!orderId) return res.status(400).json({ error: "Order ID is required" });

//         const query = {
//           $and: [
//             {
//               $or: [
//                 { senderId: user1, receiverId: user2 },
//                 { senderId: user2, receiverId: user1 },
//               ],
//             },
//             { orderId },
//           ],
//         };

//         const chats = await chatCollection.find(query).sort({ timestamp: 1 }).toArray();
//         res.status(200).json(chats);
//       } catch (error) {
//         console.error("History Error:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//       }
//     });

//     // ----------------------
//     // 3. DELETE: Delete Message
//     // ----------------------
//     router.delete("/:id", async (req, res) => {
//       try {
//         const id = req.params.id;
//         const result = await chatCollection.deleteOne({ _id: new ObjectId(id) });
//         res.json(result);
//       } catch (error) {
//         console.error("Delete Error:", error);
//         res.status(500).json({ error: "Could not delete message" });
//       }
//     });

//     // ----------------------
//     // 4. POST: Update Presence
//     // ----------------------
//     router.post("/status", async (req, res) => {
//       try {
//         const { userId, status } = req.body || {};
//         if (!userId) return res.status(400).json({ error: "userId is required" });

//         const now = new Date();
//         if (status === "offline") {
//           await presenceCollection.updateOne(
//             { userId },
//             { $set: { lastSeen: new Date(0), status: "offline" } },
//             { upsert: true }
//           );
//           return res.status(200).json({ success: true });
//         }

//         await presenceCollection.updateOne(
//           { userId },
//           { $set: { lastSeen: now, status: "online" } },
//           { upsert: true }
//         );
//         res.status(200).json({ success: true });
//       } catch (error) {
//         console.error("Status Error:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//       }
//     });

//     // ----------------------
//     // 5. GET: Presence Single User
//     // ----------------------
//     router.get("/status/:userId", async (req, res) => {
//       try {
//         const { userId } = req.params;
//         const doc = await presenceCollection.findOne({ userId });
//         const lastSeen = doc?.lastSeen || null;
//         const online = lastSeen ? Date.now() - new Date(lastSeen).getTime() < 300000 : false;
//         res.json({ userId, lastSeen, online });
//       } catch (error) {
//         console.error("Get Status Error:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//       }
//     });

//     // ----------------------
//     // 6. GET: Presence Pair Users
//     // ----------------------
//     router.get("/status/pair/:user1/:user2", async (req, res) => {
//       try {
//         const { user1, user2 } = req.params;
//         const docs = await presenceCollection.find({ userId: { $in: [user1, user2] } }).toArray();
//         const map = {};
//         [user1, user2].forEach(u => {
//           const doc = docs.find(d => d.userId === u);
//           const lastSeen = doc?.lastSeen || null;
//           const online = lastSeen ? Date.now() - new Date(lastSeen).getTime() < 300000 : false;
//           map[u] = { userId: u, lastSeen, online };
//         });
//         res.json(map);
//       } catch (error) {
//         console.error("Pair Status Error:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//       }
//     });

//   } catch (error) {
//     console.error("Database connection error:", error);
//   }
// }

// run();
// module.exports = router;
