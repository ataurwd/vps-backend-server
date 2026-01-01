const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const router = express.Router();

const MONGO_URI = process.env.MONGO_URI;

// ===============================
// Mongo Client Setup
// ===============================
const client = new MongoClient(MONGO_URI);

let db;
let cartCollection;
let purchaseCollection;
let userCollection;
let productsCollection;
let reportCollection; // ✅ নিউ কালেকশন ভেরিয়েবল

// ===============================
// DB Connect (Run Once)
// ===============================
(async () => {
  try {
    await client.connect();
    db = client.db("mydb"); 
    cartCollection = db.collection("cart");
    purchaseCollection = db.collection("mypurchase");
    userCollection = db.collection("userCollection");
    productsCollection = db.collection("products");
    reportCollection = db.collection("reports"); // ✅ রিপোর্ট কালেকশন কানেক্ট করা হলো
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
})();

// =======================================================
// 🚀 NEW: POST /purchase/report/create (রিপোর্ট জমা দেওয়া)
// =======================================================
router.post("/report/create", async (req, res) => {
  try {
    const { orderId, reporterEmail, sellerEmail, reason, message } = req.body;

    // ভ্যালিডেশন
    if (!orderId || !reporterEmail || !sellerEmail || !reason || !message) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const newReport = {
      orderId,
      reporterEmail,
      sellerEmail,
      reason,
      message,
      status: "Pending", // ডিফল্ট স্ট্যাটাস
      createdAt: new Date(),
    };

    const result = await reportCollection.insertOne(newReport);

    res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      reportId: result.insertedId,
    });
  } catch (error) {
    console.error("❌ Report Create Error:", error);
    res.status(500).json({ success: false, message: "Server error, failed to submit report" });
  }
});

// =======================================================
// 🚀 NEW: GET /purchase/report/getall (সব রিপোর্ট দেখা - Admin এর জন্য)
// =======================================================
router.get("/report/getall", async (req, res) => {
  try {
    const reports = await reportCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.status(200).json(reports);
  } catch (error) {
    console.error("❌ Fetch Reports Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch reports" });
  }
});

// =======================================================
// POST /purchase/post (Cart Checkout)
// =======================================================
router.post("/post", async (req, res) => {
  const { email: buyerEmail } = req.body;

  if (!buyerEmail) return res.status(400).json({ success: false, message: "Buyer email required" });

  try {
    const cartItems = await cartCollection.find({ UserEmail: buyerEmail }).toArray();
    if (!cartItems.length) return res.status(400).json({ success: false, message: "Cart is empty" });

    const totalPrice = cartItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const buyer = await userCollection.findOne({ email: buyerEmail });

    if (!buyer || Number(buyer.balance || 0) < totalPrice) {
      return res.status(400).json({ success: false, message: "Insufficient balance", required: totalPrice, available: buyer?.balance || 0 });
    }

    await userCollection.updateOne({ email: buyerEmail }, { $inc: { balance: -totalPrice } });

    const purchaseDocs = cartItems.map((item) => ({
      buyerEmail,
      productName: item.name,
      price: Number(item.price),
      sellerEmail: item.sellerEmail,
      productId: item.productId ? new ObjectId(item.productId) : (item._id ? new ObjectId(item._id) : null),
      purchaseDate: new Date(),
      status: "pending",
    }));

    await purchaseCollection.insertMany(purchaseDocs);

    const productUpdatePromises = cartItems.map(async (item) => {
      const productObjectId = item.productId ? new ObjectId(item.productId) : (item._id ? new ObjectId(item._id) : null);
      if (productObjectId) {
        await productsCollection.updateOne(
          { _id: productObjectId },
          { $set: { status: "ongoing" } }
        );
      }
    });

    await Promise.all(productUpdatePromises);
    await cartCollection.deleteMany({ UserEmail: buyerEmail });

    res.json({
      success: true,
      message: "Purchase successful!",
      totalDeducted: totalPrice,
      newBalance: Number(buyer.balance) - totalPrice
    });
  } catch (err) {
    console.error("❌ Cart Purchase error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// =======================================================
// POST /purchase/single-purchase (Direct Buy)
// =======================================================
router.post("/single-purchase", async (req, res) => {
  try {

    const { buyerEmail, productName, price, sellerEmail, productId } = req.body;



    if (!buyerEmail || !productName || !price || !productId) {
      return res.status(400).json({ success: false, message: "Required fields are missing" });
    }

    const amount = Number(price);
    const buyer = await userCollection.findOne({ email: buyerEmail });

    if (!buyer || (buyer.balance || 0) < amount) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    const productObjectId = new ObjectId(productId);
    const product = await productsCollection.findOne({ _id: productObjectId });

    if (!product || product.status !== "active") {
      return res.status(400).json({ success: false, message: "Product is not available" });
    }

    await userCollection.updateOne({ email: buyerEmail }, { $inc: { balance: -amount } });

    const purchaseData = {
      buyerEmail,
      productName,
      price: amount,
      sellerEmail: sellerEmail || "admin@example.com",
      productId: productObjectId,
      purchaseDate: new Date(),
      status: "pending"
    };

    const result = await purchaseCollection.insertOne(purchaseData);
    await productsCollection.updateOne({ _id: productObjectId }, { $set: { status: "ongoing" } });
    await userCollection.updateOne({ email: sellerEmail }, { $inc: { balance: amount } });

    const updatedBuyer = await userCollection.findOne({ email: buyerEmail });

    res.status(200).json({
      success: true,
      message: "Purchase successful",
      purchaseId: result.insertedId,
      newBuyerBalance: updatedBuyer?.balance || 0
    });

  } catch (error) {
    console.error("❌ Single Purchase Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// =======================================================
// GET /purchase/getall (Buyer & Seller এর জন্য একটিই ক্লিন রাউট)
// =======================================================
router.get("/getall", async (req, res) => {
  const { email, role } = req.query;

  try {
    let query = {};
    if (email) {
      if (role === "seller") {
        query = { sellerEmail: email };
      } else {
        query = { buyerEmail: email };
      }
    }

    const purchases = await purchaseCollection
      .find(query)
      .sort({ purchaseDate: -1 })
      .toArray();

    res.status(200).json(purchases);
  } catch (error) {
    console.error("❌ Fetch purchases error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch purchases" });
  }
});

// =======================================================
// PATCH /purchase/update-status/:id → Confirm/Reject Order
// =======================================================
router.patch("/update-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, sellerEmail } = req.body;  // sellerEmail frontend থেকে আসবে

    if (!ObjectId.isValid(id) || !status) {
      return res.status(400).json({ success: false, message: "Invalid ID or Status" });
    }

    if (status !== "completed") {
      const result = await purchaseCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, message: "Purchase not found" });
      }

      return res.json({ success: true, message: `Order status updated to ${status}` });
    }

    // Only for "completed" status
    if (!sellerEmail) {
      return res.status(400).json({ success: false, message: "Seller email is required for completion" });
    }

    const session = await purchaseCollection.db.client.startSession();

    let commissionResult;
    try {
      await session.withTransaction(async () => {
        // Find purchase to get amount
        const purchase = await purchaseCollection.findOne(
          { _id: new ObjectId(id) },
          { session }
        );

        if (!purchase) {
          throw new Error("Purchase not found");
        }

        // Adjust these field names according to your actual schema
        const amount = purchase.amount || purchase.totalPrice || purchase.price || purchase.totalAmount;

        if (typeof amount !== "number" || amount <= 0) {
          throw new Error("Invalid or missing purchase amount");
        }

        const sellerCommission = amount * 0.8;
        const adminCommission = amount * 0.2;

        // Update status
        await purchaseCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: "completed" } },
          { session }
        );

        // Add to seller balance
        const sellerUpdate = await userCollection.updateOne(
          { email: sellerEmail },
          { $inc: { balance: sellerCommission } },
          { session }
        );

        if (sellerUpdate.matchedCount === 0) {
          throw new Error(`Seller not found with email: ${sellerEmail}`);
        }

        // Add to admin balance
        const adminUpdate = await userCollection.updateOne(
          { email: "admin@gmail.com" },
          { $inc: { balance: adminCommission } },
          { session }
        );

        if (adminUpdate.matchedCount === 0) {
          throw new Error("Admin account not found");
        }

        commissionResult = {
          sellerEmail,
          amount,
          sellerCommission,
          adminCommission,
        };
      });
    } catch (transactionError) {
      console.error("Transaction failed:", transactionError);
      return res.status(500).json({
        success: false,
        message: transactionError.message || "Failed to process commission",
      });
    } finally {
      await session.endSession();
    }

    res.json({
      success: true,
      message: "Order completed and commissions distributed successfully",
      data: commissionResult,
    });
  } catch (err) {
    console.error("❌ Update status error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;