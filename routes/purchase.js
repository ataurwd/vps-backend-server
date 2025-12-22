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

router.post("/post", async (req, res) => {
  const { email: buyerEmail } = req.body;
  
  if (!buyerEmail) return res.status(400).json({ success: false, message: "Buyer email required" });

  try {
    const cartItems = await cartCollection.find({ UserEmail: buyerEmail }).toArray();
    if (!cartItems.length) return res.status(400).json({ success: false, message: "Cart empty" });

    const totalPrice = cartItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const buyer = await db.collection("userCollection").findOne({ email: buyerEmail });
    
    if (!buyer || Number(buyer.balance || 0) < totalPrice) {
      return res.status(400).json({ 
        success: false, 
        message: "Insufficient balance",
        required: totalPrice,
        available: buyer?.balance || 0
      });
    }

    // Deduct balance, save purchases, clear cart
    await db.collection("userCollection").updateOne({ email: buyerEmail }, { $inc: { balance: -totalPrice } });
    
    await purchaseCollection.insertMany(cartItems.map(item => ({
      buyerEmail,
      productName: item.name,
      price: Number(item.price),
      sellerEmail: item.sellerEmail,
      productId: item._id ? new ObjectId(item._id) : null,
      purchaseDate: new Date(),
      status: "pending"
    })));
    
    await cartCollection.deleteMany({ UserEmail: buyerEmail });

    res.json({
      success: true,
      message: "Purchase successful!",
      totalDeducted: totalPrice,
      newBalance: Number(buyer.balance) - totalPrice,
      itemsPurchased: cartItems.length
    });

  } catch (err) {
    console.error("Purchase error:", err);
    res.status(500).json({ success: false, message: "Server error" });
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