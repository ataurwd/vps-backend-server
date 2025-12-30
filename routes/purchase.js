

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

// ===============================
// DB Connect (Run Once)
// ===============================
(async () => {
  try {
    await client.connect();
    console.log("✅ MongoDB connected successfully");

    db = client.db("mydb"); 
    cartCollection = db.collection("cart");
    purchaseCollection = db.collection("mypurchase");
    userCollection = db.collection("userCollection");
    productsCollection = db.collection("products");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
})();

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
      console.log(productObjectId)
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

// POST /purchase/single-purchase (Direct Buy - WITH STATUS UPDATE)
// =======================================================
router.post("/single-purchase", async (req, res) => {
  try {
    console.log("🔹 Single Purchase Request:", req.body);

    const { 
      buyerEmail,    
      productName,    
      price,          
      sellerEmail,    
      productId       
    } = req.body;

    if (!buyerEmail) return res.status(400).json({ success: false, message: "Buyer email is missing" });
    if (!productName) return res.status(400).json({ success: false, message: "Product name is missing" });
    if (!price) return res.status(400).json({ success: false, message: "Price is missing" });
    if (!productId) return res.status(400).json({ success: false, message: "Product ID is missing" }); // অবশ্যই দরকার

    const finalSellerEmail = sellerEmail || "admin@example.com"; 
    const amount = Number(price);
    const buyer = await userCollection.findOne({ email: buyerEmail });
    if (!buyer) return res.status(404).json({ success: false, message: "Buyer account not found" });

    if ((buyer.balance || 0) < amount) {
        return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    const productObjectId = new ObjectId(productId);
    const product = await productsCollection.findOne({ _id: productObjectId });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (product.status !== "active") {
      return res.status(400).json({ success: false, message: "Product is not available for purchase" });
    }

    const deductResult = await userCollection.updateOne(
      { email: buyerEmail },
      { $inc: { balance: -amount } }
    );

    if (deductResult.modifiedCount === 0) {
        return res.status(500).json({ success: false, message: "Failed to deduct balance" });
    }

    const purchaseData = {
      buyerEmail,
      productName,
      price: amount,
      sellerEmail: finalSellerEmail,
      productId: productObjectId,
      purchaseDate: new Date(),
      status: "pending" 
    };

    const result = await purchaseCollection.insertOne(purchaseData);

    await productsCollection.updateOne(
      { _id: productObjectId },
      { $set: { status: "ongoing" } }
    );

    await userCollection.updateOne(
      { email: finalSellerEmail },
      { $inc: { balance: amount } }
    );

    const updatedBuyer = await userCollection.findOne({ email: buyerEmail });

    res.status(200).json({
      success: true,
      message: "Purchase successful",
      purchaseId: result.insertedId,
      newBuyerBalance: updatedBuyer?.balance || 0
    });

  } catch (error) {
    console.error("❌ Single Purchase Error:", error);
    res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
});

// =======================================================
// GET /purchase/getall
// =======================================================
router.get("/getall", async (req, res) => {
  const { email } = req.query;
  try {
    const query = email ? { buyerEmail: email } : {};
    const purchases = await purchaseCollection.find(query).sort({ purchaseDate: -1 }).toArray();
    res.status(200).json(purchases);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch purchases" });
  }
});
// =======================================================
// PATCH /purchase/update-status/:id → Confirm/Reject Order
// =======================================================
router.patch("/update-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // ১. আইডি ভ্যালিড কিনা চেক করা
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid purchase ID" });
    }

    // ২. স্ট্যাটাস পাঠানো হয়েছে কিনা চেক করা
    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required" });
    }

    // ৩. ডাটাবেসে আপডেট করা
    const result = await purchaseCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: status } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "Purchase not found" });
    }

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
    });

  } catch (err) {
    console.error("❌ Update status error:", err);
    res.status(500).json({ success: false, message: err.message || "Server Error" });
  }
});

// =======================================================
// GET /purchase/getall (Updated for Buyer & Seller)
// =======================================================
router.get("/getall", async (req, res) => {
  const { email, role } = req.query; // role='seller' or 'buyer'

  try {
    let query = {};

    if (email) {
      if (role === "seller") {
        query = { sellerEmail: email }; // সেলার তার নিজের সেল করা অর্ডার দেখবে
      } else {
        query = { buyerEmail: email }; // বায়ার তার কেনা অর্ডার দেখবে (Default)
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
// GET /purchase/getall (Updated for Buyer & Seller)
// =======================================================
router.get("/getall", async (req, res) => {
  const { email, role } = req.query; // role='seller' or 'buyer'

  try {
    let query = {};

    if (email) {
      if (role === "seller") {
        // ✅ যদি রোল 'seller' হয়, তবে sellerEmail দিয়ে খুঁজবে (অর্থাৎ তার সেল করা পণ্য)
        query = { sellerEmail: email }; 
      } else {
        // ✅ ডিফল্ট বা 'buyer' হলে buyerEmail দিয়ে খুঁজবে (অর্থাৎ তার কেনা পণ্য)
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

module.exports = router;