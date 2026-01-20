// const express = require("express");
// const { MongoClient, ObjectId } = require("mongodb");

// const router = express.Router();

// const MONGO_URI = process.env.MONGO_URI;

// // ===============================
// // Mongo Client Setup
// // ===============================
// const client = new MongoClient(MONGO_URI);

// let db, cartCollection, purchaseCollection, userCollection, productsCollection, reportCollection;

// // ===============================
// // DB Connect (Run Once)
// // ===============================
// (async () => {
//   try {
//     await client.connect();
//     db = client.db("mydb");
//     cartCollection = db.collection("cart");
//     purchaseCollection = db.collection("mypurchase");
//     userCollection = db.collection("userCollection");
//     productsCollection = db.collection("products");
//     reportCollection = db.collection("reports");
//     console.log("✅ MongoDB Connected Successfully");
//   } catch (err) {
//     console.error("❌ MongoDB connection failed:", err);
//     process.exit(1);
//   }
// })();

// // =======================================================
// // 🚀 ১. রিপোর্ট তৈরি করা (POST /report/create)
// // =======================================================
// router.post("/report/create", async (req, res) => {
//   try {
//     const { orderId, reporterEmail, sellerEmail, reason, message, role } = req.body;
//     if (!orderId || !reporterEmail || !sellerEmail || !reason || !message || !role) {
//       return res.status(400).json({ success: false, message: "All fields are required" });
//     }
//     const newReport = {
//       orderId, 
//       reporterEmail,
//       sellerEmail,
//       reason,
//       message,
//       role,
//       status: "Pending",
//       createdAt: new Date(),
//     };
//     const result = await reportCollection.insertOne(newReport);
//     res.status(201).json({ success: true, message: "Report submitted", reportId: result.insertedId });
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });

// // =======================================================
// // 🚀 ২. রিফান্ড কনফার্ম করা (Confirm Refund)
// // =======================================================
// router.patch("/report/refund/:id", async (req, res) => {
//   const session = client.startSession();
//   try {
//     const { id } = req.params;
//     if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid ID" });

//     await session.withTransaction(async () => {
//       const report = await reportCollection.findOne({ _id: new ObjectId(id) }, { session });
//       if (!report) throw new Error("Report not found");

//       const purchase = await purchaseCollection.findOne({ _id: new ObjectId(report.orderId) }, { session });
//       if (!purchase) throw new Error("Main Purchase record not found");

//       const amount = Number(purchase.price || 0);
//       const buyerEmail = purchase.buyerEmail;

//       await userCollection.updateOne({ email: buyerEmail }, { $inc: { balance: amount } }, { session });

//       if (purchase.productId) {
//         await productsCollection.updateOne({ _id: new ObjectId(purchase.productId) }, { $set: { status: "active" } }, { session });
//       }

//       await purchaseCollection.updateOne({ _id: purchase._id }, { $set: { status: "refunded" } }, { session });
//       await reportCollection.updateOne({ _id: new ObjectId(id) }, { $set: { status: "Refunded", updatedAt: new Date() } }, { session });
//     });

//     res.json({ success: true, message: "Refund processed successfully!" });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   } finally {
//     await session.endSession();
//   }
// });

// // =======================================================
// // 🚀 ৩. মার্ক সোল্ড (Mark as Sold - FIXED)
// // =======================================================
// router.patch("/report/mark-sold/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid ID" });

//     const report = await reportCollection.findOne({ _id: new ObjectId(id) });
//     if (!report) return res.status(404).json({ success: false, message: "Report not found" });

//     // অর্ডারের স্ট্যাটাস কমপ্লিট করা
//     await purchaseCollection.updateOne(
//       { _id: new ObjectId(report.orderId) }, 
//       { $set: { status: "completed" } }
//     );

//     // রিপোর্টের স্ট্যাটাস 'Sold' করা
//     await reportCollection.updateOne(
//       { _id: new ObjectId(id) },
//       { $set: { status: "Sold", updatedAt: new Date() } }
//     );

//     res.json({ success: true, message: "Marked as sold successfully" });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// // =======================================================
// // 🚀 ৪. অটো-কনফার্ম (২৪ ঘণ্টা পর অটোমেটিক কমপ্লিট হবে)
// // =======================================================
// router.get("/auto-confirm-check", async (req, res) => {
//   try {
//     const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
//     const pendingOrders = await purchaseCollection.find({
//       status: "pending",
//       purchaseDate: { $lt: twentyFourHoursAgo }
//     }).toArray();

//     if (pendingOrders.length === 0) return res.json({ success: true, message: "No orders to confirm" });

//     for (let order of pendingOrders) {
//       const amount = Number(order.price || 0);
//       const sellerEmail = order.sellerEmail;
//       const sellerComm = amount * 0.8;
//       const adminComm = amount * 0.2;

//       await purchaseCollection.updateOne({ _id: order._id }, { $set: { status: "completed", autoConfirmed: true } });
//       await userCollection.updateOne({ email: sellerEmail }, { $inc: { balance: sellerComm } });
//       await userCollection.updateOne({ email: "admin@gmail.com" }, { $inc: { balance: adminComm } });
//     }

//     res.json({ success: true, message: `${pendingOrders.length} orders auto-confirmed!` });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // =======================================================
// // 🚀 ৫. ম্যানুয়াল স্ট্যাটাস আপডেট
// // =======================================================
// router.patch("/update-status/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status, sellerEmail } = req.body;
//     if (!ObjectId.isValid(id) || !status) return res.status(400).json({ success: false, message: "Invalid ID/Status" });

//     if (status !== "completed") {
//       await purchaseCollection.updateOne({ _id: new ObjectId(id) }, { $set: { status } });
//       return res.json({ success: true, message: `Status updated to ${status}` });
//     }

//     const session = client.startSession();
//     try {
//       await session.withTransaction(async () => {
//         const purchase = await purchaseCollection.findOne({ _id: new ObjectId(id) }, { session });
//         if (!purchase) throw new Error("Purchase not found");

//         const amount = Number(purchase.price || 0);
//         await purchaseCollection.updateOne({ _id: new ObjectId(id) }, { $set: { status: "completed" } }, { session });
//         await userCollection.updateOne({ email: sellerEmail }, { $inc: { balance: amount * 0.8 } }, { session });
//         await userCollection.updateOne({ email: "admin@gmail.com" }, { $inc: { balance: amount * 0.2 } }, { session });
//       });
//       res.json({ success: true, message: "Order completed successfully" });
//     } finally {
//       await session.endSession();
//     }
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // =======================================================
// // 🚀 ৬. অন্যান্য (Checkout & Fetch)
// // =======================================================

// router.get("/report/getall", async (req, res) => {
//   try {
//     const reports = await reportCollection.find({}).sort({ createdAt: -1 }).toArray();
//     res.json(reports);
//   } catch (e) { res.status(500).json([]); }
// });

// router.get("/getall", async (req, res) => {
//   const { email, role } = req.query;
//   try {
//     let query = role === "seller" ? { sellerEmail: email } : { buyerEmail: email };
//     const result = await purchaseCollection.find(query).sort({ purchaseDate: -1 }).toArray();
//     res.json(result);
//   } catch (e) { res.status(500).json([]); }
// });

// router.post("/post", async (req, res) => {
//   const { email: buyerEmail } = req.body;
//   try {
//     const cartItems = await cartCollection.find({ UserEmail: buyerEmail }).toArray();
//     if (!cartItems.length) return res.status(400).json({ success: false });
//     const totalPrice = cartItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
//     const buyer = await userCollection.findOne({ email: buyerEmail });
//     if (!buyer || buyer.balance < totalPrice) return res.status(400).json({ success: false });

//     await userCollection.updateOne({ email: buyerEmail }, { $inc: { balance: -totalPrice } });
//     const purchaseDocs = cartItems.map(item => ({
//       buyerEmail, productName: item.name, price: Number(item.price), sellerEmail: item.sellerEmail,
//       productId: item.productId ? new ObjectId(item.productId) : null, purchaseDate: new Date(), status: "pending",
//     }));
//     await purchaseCollection.insertMany(purchaseDocs);
//     await cartCollection.deleteMany({ UserEmail: buyerEmail });
//     res.json({ success: true });
//   } catch (e) { res.status(500).json({ success: false }); }
// });

// router.post("/single-purchase", async (req, res) => {
//   try {
//     const { buyerEmail, productName, price, sellerEmail, productId } = req.body;
//     const buyer = await userCollection.findOne({ email: buyerEmail });
//     if (!buyer || buyer.balance < price) return res.status(400).json({ success: false });

//     await userCollection.updateOne({ email: buyerEmail }, { $inc: { balance: -Number(price) } });
//     await purchaseCollection.insertOne({
//       buyerEmail, productName, price: Number(price), sellerEmail,
//       productId: new ObjectId(productId), purchaseDate: new Date(), status: "ongoing"
//     });
//     await productsCollection.updateOne({ _id: new ObjectId(productId) }, { $set: { status: "ongoing" } });
//     res.json({ success: true });
//   } catch (e) { res.status(500).json({ success: false }); }
// });

// // বায়ার নিজে কনফার্ম করলে সেলার ও এডমিন টাকা পাবে
// router.patch("/update-status/:id", async (req, res) => {
//   const session = client.startSession();
//   try {
//     const { id } = req.params;
//     const { status, sellerEmail } = req.body;

//     // যদি স্ট্যাটাস completed না হয়, শুধু স্ট্যাটাস আপডেট করবে
//     if (status !== "completed") {
//       await purchaseCollection.updateOne(
//         { _id: new ObjectId(id) }, 
//         { $set: { status } }
//       );
//       return res.json({ success: true });
//     }

//     // স্ট্যাটাস completed হলে টাকা ভাগ হবে
//     await session.withTransaction(async () => {
//       const order = await purchaseCollection.findOne({ _id: new ObjectId(id) }, { session });
//       if (!order) throw new Error("Order not found");

//       const sellerComm = order.price * 0.8;
//       const adminComm = order.price * 0.2;

//       // ১. সেলারের ব্যালেন্স বাড়ানো (৮০%)
//       await userCollection.updateOne(
//         { email: sellerEmail }, 
//         { $inc: { balance: sellerComm } }, 
//         { session }
//       );

//       // ২. এডমিনের ব্যালেন্স বাড়ানো (২০%)
//       await userCollection.updateOne(
//         { email: "admin@gmail.com" }, 
//         { $inc: { balance: adminComm } }, 
//         { session }
//       );

//       // ৩. পারচেজ এবং প্রোডাক্ট স্ট্যাটাস আপডেট
//       await purchaseCollection.updateOne(
//         { _id: new ObjectId(id) }, 
//         { $set: { status: "completed" } }, 
//         { session }
//       );
//       await productsCollection.updateOne(
//         { _id: new ObjectId(order.productId) }, 
//         { $set: { status: "sold" } }, 
//         { session }
//       );
//     });

//     res.json({ success: true, message: "Order confirmed and payment sent!" });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   } finally {
//     await session.endSession();
//   }
// });

// // বায়ার রিপোর্ট করলে ডাটাবেসে সেভ হবে
// router.post("/report/create", async (req, res) => {
//   try {
//     const { orderId, reporterEmail, sellerEmail, reason, message } = req.body;

//     const reportDoc = {
//       orderId: new ObjectId(orderId),
//       buyerEmail: reporterEmail, // ফ্রন্টএন্ডে reporterEmail পাঠানো হচ্ছে
//       sellerEmail,
//       reason,
//       reportMessage: message,    // ফ্রন্টএন্ডে message পাঠানো হচ্ছে
//       status: "Pending",
//       createdAt: new Date()
//     };

//     // ১. রিপোর্ট কালেকশনে ডাটা সেভ
//     await reportCollection.insertOne(reportDoc);
    
//     // ২. পারচেজ কালেকশনে মার্ক করে রাখা
//     await purchaseCollection.updateOne(
//       { _id: new ObjectId(orderId) }, 
//       { $set: { status: "reported" } }
//     );

//     res.json({ success: true, message: "Report submitted successfully!" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Failed to submit report" });
//   }
// });

// //ongoing purchase routes...    


// module.exports = router;

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
// 🚀 FIXED: POST /purchase/report/create (রিপোর্ট জমা দেওয়া)
// =======================================================
router.post("/report/create", async (req, res) => {
  try {
    // এখানে 'role' অ্যাড করা হয়েছে req.body থেকে
    const { orderId, reporterEmail, sellerEmail, reason, message, role } = req.body;

    // ভ্যালিডেশন (role সহ)
    if (!orderId || !reporterEmail || !sellerEmail || !reason || !message || !role) {
      return res.status(400).json({ success: false, message: "All fields including role are required" });
    }

    const newReport = {
      orderId,
      reporterEmail,
      sellerEmail,
      reason,
      message,
      role, // ✅ এখন ডাটাবেসে role: "buyer" সেভ হবে
      status: "Pending", 
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

  if (!buyerEmail) {
    return res
      .status(400)
      .json({ success: false, message: "Buyer email required" });
  }

  try {
    const cartItems = await cartCollection
      .find({ UserEmail: buyerEmail })
      .toArray();

    if (!cartItems.length) {
      return res
        .status(400)
        .json({ success: false, message: "Cart is empty" });
    }

    const buyer = await userCollection.findOne({ email: buyerEmail });
    if (!buyer) {
      return res
        .status(404)
        .json({ success: false, message: "Buyer not found" });
    }

    const totalPrice = cartItems.reduce(
      (sum, item) => sum + Number(item.price || 0),
      0
    );

    if (Number(buyer.balance || 0) < totalPrice) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance",
        required: totalPrice,
        available: buyer.balance || 0,
      });
    }

    // 1️⃣ Deduct buyer balance
    await userCollection.updateOne(
      { email: buyerEmail },
      { $inc: { balance: -totalPrice } }
    );

    // 2️⃣ Create purchase docs (✅ buyerId added)
    const purchaseDocs = cartItems.map((item) => ({
      buyerId: buyer._id, // ✅ VERY IMPORTANT
      buyerEmail,
      productName: item.name,
      price: Number(item.price),
      sellerEmail: item.sellerEmail,
      productId: item.productId
        ? new ObjectId(item.productId)
        : item._id
        ? new ObjectId(item._id)
        : null,
      purchaseDate: new Date(),
      status: "pending",
    }));

    await purchaseCollection.insertMany(purchaseDocs);

    // 3️⃣ Update product status
    const productUpdatePromises = cartItems.map(async (item) => {
      const productObjectId = item.productId
        ? new ObjectId(item.productId)
        : item._id
        ? new ObjectId(item._id)
        : null;

      if (productObjectId) {
        await productsCollection.updateOne(
          { _id: productObjectId },
          { $set: { status: "ongoing" } }
        );
      }
    });

    await Promise.all(productUpdatePromises);

    // 4️⃣ Clear cart
    await cartCollection.deleteMany({ UserEmail: buyerEmail });

    res.json({
      success: true,
      message: "Purchase successful!",
      totalDeducted: totalPrice,
      newBalance: Number(buyer.balance) - totalPrice,
    });
  } catch (err) {
    console.error("❌ Cart Purchase error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// router.post("/post", async (req, res) => {
//   const { email: buyerEmail } = req.body;

//   if (!buyerEmail) return res.status(400).json({ success: false, message: "Buyer email required" });

//   try {
//     const cartItems = await cartCollection.find({ UserEmail: buyerEmail }).toArray();
//     if (!cartItems.length) return res.status(400).json({ success: false, message: "Cart is empty" });

//     const totalPrice = cartItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
//     const buyer = await userCollection.findOne({ email: buyerEmail });

//     if (!buyer || Number(buyer.balance || 0) < totalPrice) {
//       return res.status(400).json({ success: false, message: "Insufficient balance", required: totalPrice, available: buyer?.balance || 0 });
//     }

//     await userCollection.updateOne({ email: buyerEmail }, { $inc: { balance: -totalPrice } });

//     const purchaseDocs = cartItems.map((item) => ({
//       buyerEmail,
//       productName: item.name,
//       price: Number(item.price),
//       sellerEmail: item.sellerEmail,
//       productId: item.productId ? new ObjectId(item.productId) : (item._id ? new ObjectId(item._id) : null),
//       purchaseDate: new Date(),
//       status: "pending",
//     }));

//     await purchaseCollection.insertMany(purchaseDocs);

//     const productUpdatePromises = cartItems.map(async (item) => {
//       const productObjectId = item.productId ? new ObjectId(item.productId) : (item._id ? new ObjectId(item._id) : null);
//       if (productObjectId) {
//         await productsCollection.updateOne(
//           { _id: productObjectId },
//           { $set: { status: "ongoing" } }
//         );
//       }
//     });

//     await Promise.all(productUpdatePromises);
//     await cartCollection.deleteMany({ UserEmail: buyerEmail });

//     res.json({
//       success: true,
//       message: "Purchase successful!",
//       totalDeducted: totalPrice,
//       newBalance: Number(buyer.balance) - totalPrice
//     });
//   } catch (err) {
//     console.error("❌ Cart Purchase error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });


// ✅ ADMIN: GET purchases by buyer (FINAL & SAFE)
router.get("/admin/by-user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user id" });
    }

    // 1️⃣ user খুঁজে বের করি
    const user = await userCollection.findOne({
      _id: new ObjectId(userId),
    });

    if (!user) {
      return res.status(200).json([]);
    }

    // 2️⃣ MAIN FIX: buyerId + buyerEmail দুটো দিয়েই খুঁজি
    const purchases = await purchaseCollection
      .find({
        $or: [
          { buyerId: user._id },
          { buyerEmail: user.email },
        ],
      })
      .sort({ purchaseDate: -1 })
      .toArray();

    res.status(200).json(purchases);
  } catch (error) {
    console.error("❌ Admin fetch orders error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch orders" });
  }
});


// =======================================================
// POST /purchase/single-purchase (Direct Buy)
// =======================================================
router.post("/single-purchase", async (req, res) => {
  try {
    const { buyerEmail, productName, price, sellerEmail, productId } = req.body;

    if (!buyerEmail || !productName || !price || !productId) {
      return res
        .status(400)
        .json({ success: false, message: "Required fields are missing" });
    }

    const amount = Number(price);

    // 1️⃣ Find buyer
    const buyer = await userCollection.findOne({ email: buyerEmail });
    if (!buyer) {
      return res
        .status(404)
        .json({ success: false, message: "Buyer not found" });
    }

    if ((buyer.balance || 0) < amount) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance" });
    }

    // 2️⃣ Find product
    const productObjectId = new ObjectId(productId);
    const product = await productsCollection.findOne({ _id: productObjectId });

    if (!product || product.status !== "active") {
      return res
        .status(400)
        .json({ success: false, message: "Product is not available" });
    }

    // 3️⃣ Deduct buyer balance
    await userCollection.updateOne(
      { email: buyerEmail },
      { $inc: { balance: -amount } }
    );

    // 4️⃣ Create purchase (✅ buyerId added)
    const purchaseData = {
      buyerId: buyer._id,              // ✅ VERY IMPORTANT
      buyerEmail,
      productName,
      price: amount,
      sellerEmail: sellerEmail || "admin@example.com",
      productId: productObjectId,
      purchaseDate: new Date(),
      status: "pending",
    };

    const result = await purchaseCollection.insertOne(purchaseData);

    // 5️⃣ Update product status
    await productsCollection.updateOne(
      { _id: productObjectId },
      { $set: { status: "ongoing" } }
    );

    // 6️⃣ Credit seller balance (if exists)
    if (sellerEmail) {
      await userCollection.updateOne(
        { email: sellerEmail },
        { $inc: { balance: amount } }
      );
    }

    const updatedBuyer = await userCollection.findOne({ email: buyerEmail });

    res.status(200).json({
      success: true,
      message: "Purchase successful",
      purchaseId: result.insertedId,
      newBuyerBalance: updatedBuyer?.balance || 0,
    });
  } catch (error) {
    console.error("❌ Single Purchase Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

// router.post("/single-purchase", async (req, res) => {
//   try {

//     const { buyerEmail, productName, price, sellerEmail, productId } = req.body;



//     if (!buyerEmail || !productName || !price || !productId) {
//       return res.status(400).json({ success: false, message: "Required fields are missing" });
//     }

//     const amount = Number(price);
//     const buyer = await userCollection.findOne({ email: buyerEmail });

//     if (!buyer || (buyer.balance || 0) < amount) {
//       return res.status(400).json({ success: false, message: "Insufficient balance" });
//     }

//     const productObjectId = new ObjectId(productId);
//     const product = await productsCollection.findOne({ _id: productObjectId });

//     if (!product || product.status !== "active") {
//       return res.status(400).json({ success: false, message: "Product is not available" });
//     }

//     await userCollection.updateOne({ email: buyerEmail }, { $inc: { balance: -amount } });

//     const purchaseData = {
//       buyerEmail,
//       productName,
//       price: amount,
//       sellerEmail: sellerEmail || "admin@example.com",
//       productId: productObjectId,
//       purchaseDate: new Date(),
//       status: "pending"
//     };

//     const result = await purchaseCollection.insertOne(purchaseData);
//     await productsCollection.updateOne({ _id: productObjectId }, { $set: { status: "ongoing" } });
//     await userCollection.updateOne({ email: sellerEmail }, { $inc: { balance: amount } });

//     const updatedBuyer = await userCollection.findOne({ email: buyerEmail });

//     res.status(200).json({
//       success: true,
//       message: "Purchase successful",
//       purchaseId: result.insertedId,
//       newBuyerBalance: updatedBuyer?.balance || 0
//     });

//   } catch (error) {
//     console.error("❌ Single Purchase Error:", error);
//     res.status(500).json({ success: false, message: "Internal Server Error" });
//   }
// });

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


// ... আগের সব কোড ঠিক থাকবে ...

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
// 🛠️ FIX: PATCH /purchase/report/update/:id (রিপোর্ট স্ট্যাটাস আপডেট)
// এই রাউটটি না থাকার কারণেই আপনার ৪০৪ এরর আসছিল
// =======================================================
router.patch("/report/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Report ID" });
    }

    const result = await reportCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    res.status(200).json({ success: true, message: "Report status updated successfully" });
  } catch (error) {
    console.error("❌ Report Update Error:", error);
    res.status(500).json({ success: false, message: "Failed to update report status" });
  }
});

// ... বাকি সব কোড (post, single-purchase, ইত্যাদি) নিচে থাকবে ...

//////Other purchase routes here...
// ... আপনার ইমপোর্ট এবং কানেকশন কোড ঠিক আছে ...

// =======================================================
router.get("/auto-confirm-check", async (req, res) => {
  try {
    // ৪ ঘণ্টা আগের সময় নির্ধারণ (৪ ঘণ্টা = ৪ * ৬০ * ৬০ * ১০০০ মিলিসেকেন্ড)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    // ৪ ঘণ্টার বেশি পুরনো "pending" অর্ডারগুলো খুঁজুন
    const pendingOrders = await purchaseCollection.find({
      status: "pending",
      purchaseDate: { $lt: fourHoursAgo }
    }).toArray();

    if (pendingOrders.length > 0) {
      const ids = pendingOrders.map(order => order._id);

      // অর্ডার স্ট্যাটাস 'confirmed' করা
      const result = await purchaseCollection.updateMany(
        { _id: { $in: ids } },
        { 
          $set: { 
            status: "confirmed", 
            updatedAt: new Date(),
            confirmedAt: new Date() // কনফার্ম হওয়ার সময় ট্র্যাক করার জন্য (ঐচ্ছিক)
          } 
        }
      );

      /* যেহেতু অর্ডার কনফার্ম হচ্ছে, তাই প্রোডাক্ট 'active' করার প্রয়োজন নেই। 
         প্রোডাক্টটি অলরেডি সোল্ড বা বুকড হিসেবেই থাকবে।
      */
    }

    res.json({ 
      success: true, 
      message: `${pendingOrders.length} orders confirmed.`,
      processed: pendingOrders.length 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =======================================================
// 🚀 NEW: Mark as Sold (অর্ডার কমপ্লিট করা)
// =======================================================
router.patch("/report/mark-sold/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // ১. রিপোর্ট খুঁজুন অর্ডার আইডি পাওয়ার জন্য
    const report = await reportCollection.findOne({ _id: new ObjectId(id) });
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });

    // ২. মেইন পারচেজ টেবিল বা অর্ডার টেবিলে স্ট্যাটাস 'completed' করুন
    await purchaseCollection.updateOne(
      { orderId: report.orderId }, // অথবা আপনার ফিল্ড নাম অনুযায়ী productId/orderId
      { $set: { status: "completed" } }
    );

    // ৩. রিপোর্ট স্ট্যাটাস আপডেট করুন
    await reportCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "Sold", updatedAt: new Date() } }
    );

    res.json({ success: true, message: "Order marked as sold successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// আপনার রিপোর্ট কালেকশন থেকে ডাটা আনার রুট
router.get("/my-reports", async (req, res) => {
  try {
    const email = req.query.email; 
    
    if (!email) {
      return res.status(400).send({ success: false, message: "Email is required" });
    }

    // Change 'email' to 'sellerEmail' to match your database screenshot
    const query = { sellerEmail: email }; 
    const result = await reportCollection.find(query).toArray();
    
    res.send(result);
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});


// =======================================================
// 🚀 FIXED: Confirm Refund (বায়ারকে টাকা ফেরত দেওয়া)
// =======================================================
router.patch("/report/refund/:id", async (req, res) => {
  const session = client.startSession();
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid report id" });
    }

    await session.withTransaction(async () => {
      // 1️⃣ রিপোর্ট খোঁজা
      const report = await reportCollection.findOne(
        { _id: new ObjectId(id) },
        { session }
      );
      if (!report) throw new Error("Report not found");

      // 2️⃣ অর্ডার খোঁজা
      const order = await purchaseCollection.findOne(
        { _id: new ObjectId(report.orderId) },
        { session }
      );
      if (!order) throw new Error("Order not found");

      // 3️⃣ Buyer টাকা ফেরত
      await userCollection.updateOne(
        { email: order.buyerEmail },
        { $inc: { balance: Number(order.price) } },
        { session }
      );

      // 4️⃣ Product আবার active
      if (order.productId) {
        await productsCollection.updateOne(
          { _id: new ObjectId(order.productId) },
          { $set: { status: "active" } },
          { session }
        );
      }

      // 5️⃣ Order status → refunded
      await purchaseCollection.updateOne(
        { _id: order._id },
        { $set: { status: "refunded" } },
        { session }
      );

      // 6️⃣ Report status → Refunded
      await reportCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "Refunded", updatedAt: new Date() } },
        { session }
      );
    });

    res.json({ success: true, message: "Refund completed successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    await session.endSession();
  }
});



module.exports = router;