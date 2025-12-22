const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const router = express.Router();

const MONGO_URI = process.env.MONGO_URI;

// MongoClient একবারই তৈরি করো
const client = new MongoClient(MONGO_URI);

let db;
let cartCollection;
let purchaseCollection;

// App start-এ connect করো (একবারই)
(async () => {
  try {
    await client.connect();
    console.log("MongoDB connected successfully");

    db = client.db("mydb"); // তোমার database name
    cartCollection = db.collection("cart");       // assuming তোমার cart collection এর নাম "cart"
    purchaseCollection = db.collection("mypurchase");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
})();

// ================================
// POST /purchase/post
// Body: { email: "user@example.com" }
// ================================
// POST /purchase/post
// POST /purchase/post
// POST /purchase/post
router.post("/post", async (req, res) => {
  const { email: buyerEmail } = req.body;

  if (!buyerEmail) {
    return res.status(400).json({ success: false, message: "Buyer email is required" });
  }

  try {
    // 1. Buyer-এর cart items নিয়ে আসো
    const cartItems = await cartCollection.find({ UserEmail: buyerEmail }).toArray();

    if (cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Your cart is empty" });
    }

    // 2. Total price calculate করো
    const totalPrice = cartItems.reduce((sum, item) => sum + Number(item.price || 0), 0);

    // 3. Users collection access করো
    const userCollection = db.collection("userCollection"); // তোমার collection name "users" ধরে নিচ্ছি

    // 4. Buyer-এর current balance চেক করো
    const buyer = await userCollection.findOne({ email: buyerEmail });

    if (!buyer) {
      return res.status(404).json({ success: false, message: "Buyer not found" });
    }

    const currentBalance = Number(buyer.balance || 0);

    // 5. Balance sufficient কিনা চেক করো
    if (currentBalance < totalPrice) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance",
        required: totalPrice,
        available: currentBalance,
      });
    }

    // 6. Buyer-এর balance থেকে টাকা কাটো
    const updateBuyer = await userCollection.updateOne(
      { email: buyerEmail },
      { $inc: { balance: -totalPrice } } // balance -= totalPrice
    );

    if (updateBuyer.modifiedCount === 0) {
      return res.status(500).json({ success: false, message: "Failed to deduct balance" });
    }

    // 7. Purchase history-তে save করো (প্রতিটি item আলাদা document + status: pending)
    const purchaseDocuments = cartItems.map(item => ({
      buyerEmail: buyerEmail,
      productName: item.name,
      price: Number(item.price),
      sellerEmail: item.sellerEmail,
      productId: item._id ? new ObjectId(item._id) : null,
      purchaseDate: new Date(),
      status: "pending",  // এখানে pending
    }));

    const insertResult = await purchaseCollection.insertMany(purchaseDocuments);

    // 8. Cart clear করো
    const deleteResult = await cartCollection.deleteMany({ UserEmail: buyerEmail });

    // 9. Success response
    res.json({
      success: true,
      message: "Purchase successful! Amount deducted from your balance.",
      totalDeducted: totalPrice,
      newBalance: currentBalance - totalPrice,
      itemsPurchased: cartItems.length,
      purchaseStatus: "pending",
      insertedCount: insertResult.insertedCount,
    });

  } catch (err) {
    console.error("Purchase error:", err);
    res.status(500).json({ success: false, message: "Server error during purchase" });
  }
});

// ================================
// GET /purchase/getall
// Optional: শুধু নিজের purchase দেখার জন্য query দিয়ে email পাঠাতে পারো
// ================================
router.get("/getall", async (req, res) => {
  const { email } = req.query; // optional filter by user

  try {
    const query = email ? { buyerEmail: email } : {};
    const purchases = await purchaseCollection.find(query).sort({ purchaseDate: -1 }).toArray();

    res.status(200).json(purchases);
  } catch (error) {
    console.error("Fetch purchases error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch purchases" });
  }
});

module.exports = router;