// const express = require("express");
// const { MongoClient, ObjectId } = require("mongodb");

// const router = express.Router();

// const MONGO_URI = process.env.MONGO_URI;

// // MongoClient একবারই তৈরি করো
// const client = new MongoClient(MONGO_URI);

// let db;
// let cartCollection;
// let purchaseCollection;

// // App start-এ connect করো (একবারই)
// (async () => {
//   try {
//     await client.connect();
//     console.log("MongoDB connected successfully");

//     db = client.db("mydb"); // তোমার database name
//     cartCollection = db.collection("cart");       // assuming তোমার cart collection এর নাম "cart"
//     purchaseCollection = db.collection("mypurchase");
//   } catch (err) {
//     console.error("MongoDB connection failed:", err);
//     process.exit(1);
//   }
// })();

// router.post("/post", async (req, res) => {
//   const { email: buyerEmail } = req.body;
  
//   if (!buyerEmail) return res.status(400).json({ success: false, message: "Buyer email required" });

//   try {
//     const cartItems = await cartCollection.find({ UserEmail: buyerEmail }).toArray();
//     if (!cartItems.length) return res.status(400).json({ success: false, message: "Cart empty" });

//     const totalPrice = cartItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
//     const buyer = await db.collection("userCollection").findOne({ email: buyerEmail });
    
//     if (!buyer || Number(buyer.balance || 0) < totalPrice) {
//       return res.status(400).json({
//         success: false,
//         message: "Insufficient balance",
//         required: totalPrice,
//         available: buyer?.balance || 0
//       });
//     }

//     // Deduct balance, save purchases, clear cart
//     await db.collection("userCollection").updateOne({ email: buyerEmail }, { $inc: { balance: -totalPrice } });
    
//     await purchaseCollection.insertMany(cartItems.map(item => ({
//       buyerEmail,
//       productName: item.name,
//       price: Number(item.price),
//       sellerEmail: item.sellerEmail,
//       productId: item._id ? new ObjectId(item._id) : null,
//       purchaseDate: new Date(),
//       status: "pending"
//     })));
    
//     await cartCollection.deleteMany({ UserEmail: buyerEmail });

//     res.json({
//       success: true,
//       message: "Purchase successful!",
//       totalDeducted: totalPrice,
//       newBalance: Number(buyer.balance) - totalPrice,
//       itemsPurchased: cartItems.length
//     });

//   } catch (err) {
//     console.error("Purchase error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });


// // ================================
// // GET /purchase/getall
// // Optional: শুধু নিজের purchase দেখার জন্য query দিয়ে email পাঠাতে পারো
// // ================================
// router.get("/getall", async (req, res) => {
//   const { email } = req.query; // optional filter by user

//   try {
//     const query = email ? { buyerEmail: email } : {};
//     const purchases = await purchaseCollection.find(query).sort({ purchaseDate: -1 }).toArray();

//     res.status(200).json(purchases);
//   } catch (error) {
//     console.error("Fetch purchases error:", error);
//     res.status(500).json({ success: false, message: "Failed to fetch purchases" });
//   }
// });


// module.exports = router;

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const router = express.Router();

const MONGO_URI = process.env.MONGO_URI;

// ===============================
// Mongo Client (single instance)
// ===============================
const client = new MongoClient(MONGO_URI);

let db;
let cartCollection;
let purchaseCollection;
let userCollection;

// ===============================
// DB Connect (run once)
// ===============================
(async () => {
  try {
    await client.connect();
    console.log("✅ MongoDB connected successfully");

    db = client.db("mydb"); // ⚠️ change if db name different
    cartCollection = db.collection("cart");
    purchaseCollection = db.collection("mypurchase");
    userCollection = db.collection("userCollection");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
})();

// =======================================================
// POST /purchase/post  → Checkout & create purchases
// =======================================================
router.post("/post", async (req, res) => {
  const { email: buyerEmail } = req.body;

  if (!buyerEmail) {
    return res
      .status(400)
      .json({ success: false, message: "Buyer email required" });
  }

  try {
    // 1️⃣ Get cart items
    const cartItems = await cartCollection
      .find({ UserEmail: buyerEmail })
      .toArray();

    if (!cartItems.length) {
      return res
        .status(400)
        .json({ success: false, message: "Cart is empty" });
    }

    // 2️⃣ Calculate total price
    const totalPrice = cartItems.reduce(
      (sum, item) => sum + Number(item.price || 0),
      0
    );

    // 3️⃣ Check buyer balance
    const buyer = await userCollection.findOne({ email: buyerEmail });

    if (!buyer || Number(buyer.balance || 0) < totalPrice) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance",
        required: totalPrice,
        available: buyer?.balance || 0,
      });
    }

    // 4️⃣ Deduct balance
    await userCollection.updateOne(
      { email: buyerEmail },
      { $inc: { balance: -totalPrice } }
    );

    // 5️⃣ Insert purchases
    const purchaseDocs = cartItems.map((item) => ({
      buyerEmail,
      productName: item.name,
      price: Number(item.price),
      sellerEmail: item.sellerEmail,
      productId: item._id ? new ObjectId(item._id) : null,
      purchaseDate: new Date(),
      status: "pending",
    }));

    await purchaseCollection.insertMany(purchaseDocs);

    // 6️⃣ Clear cart
    await cartCollection.deleteMany({ UserEmail: buyerEmail });

    res.json({
      success: true,
      message: "Purchase successful!",
      totalDeducted: totalPrice,
      newBalance: Number(buyer.balance) - totalPrice,
      itemsPurchased: cartItems.length,
    });
  } catch (err) {
    console.error("❌ Purchase error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// =======================================================
// GET /purchase/getall → get purchases (optional email)
// =======================================================
router.get("/getall", async (req, res) => {
  const { email } = req.query;

  try {
    const query = email ? { buyerEmail: email } : {};

    const purchases = await purchaseCollection
      .find(query)
      .sort({ purchaseDate: -1 })
      .toArray();

    res.status(200).json(purchases);
  } catch (error) {
    console.error("❌ Fetch purchases error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch purchases" });
  }
});

// =======================================================
// PATCH /purchase/update-status/:id → Confirm order
// =======================================================
router.patch("/update-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid purchase ID" });
    }

    if (!status) {
      return res
        .status(400)
        .json({ success: false, message: "Status is required" });
    }

    const result = await purchaseCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status } }
    );

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Purchase not found" });
    }

    res.json({
      success: true,
      message: "Purchase status updated successfully",
    });
  } catch (err) {
    console.error("❌ Update status error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// to post a single purseches data and set athe data get userEmail and buyerEmail same
// api endpoint: /purchase/single-purchase
router.post("/single-purchase", async (req, res) => {
  try {
    const { 
      buyerEmail,     // Buyer-এর email (frontend থেকে আসবে)
      productName,    // Product-এর নাম
      price,          // Product-এর দাম (amount)
      sellerEmail,    // Seller-এর email
      productId       // Product-এর _id (optional, কিন্তু রাখা ভালো)
    } = req.body;

    // Validation
    if (!buyerEmail || !sellerEmail || !price || price <= 0 || !productName) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Step 1: Buyer-এর balance check করে deduct করা (atomic)
    const buyerUpdate = await userCollection.updateOne(
      { email: buyerEmail, balance: { $gte: price } },
      { $inc: { balance: -price } }
    );

    if (buyerUpdate.matchedCount === 0) {
      return res.status(400).json({ success: false, message: "Insufficient balance or buyer not found" });
    }

    if (buyerUpdate.modifiedCount === 0) {
      return res.status(500).json({ success: false, message: "Failed to deduct balance" });
    }

    // Step 2: Purchase record insert করা (আপনার দেওয়া exact structure অনুযায়ী)
    const purchaseData = {
      buyerEmail,
      productName,
      price,
      sellerEmail,
      productId: productId ? ObjectId(productId) : null,
      purchaseDate: new Date(),
      status: "pending"  // প্রথমে pending রাখা হলো, পরে success করতে পারবেন
    };

    const result = await purchaseCollection.insertOne(purchaseData);

    // Optional: Seller-এর balance-এ টাকা যোগ করা (যদি instant payout চান)
    await userCollection.updateOne(
      { email: sellerEmail },
      { $inc: { balance: price } }
    );

    // Success response
    res.status(200).json({
      success: true,
      message: "Purchase recorded successfully",
      purchaseId: result.insertedId,
      newBuyerBalance: (await userCollection.findOne({ email: buyerEmail })).balance
    });

  } catch (error) {
    console.error("Purchase error:", error);
    res.status(500).json({ success: false, message: "Server error during purchase" });
  }
});

module.exports = router;
