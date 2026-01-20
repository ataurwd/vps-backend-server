const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const router = express.Router();
const MONGO_URI = process.env.MONGO_URI;

const client = new MongoClient(MONGO_URI);

let db, ratingCollection, userCollection, productsCollection;

// ===============================
// DB Connect (Run Once)
// ===============================
(async () => {
  try {
    await client.connect();
    db = client.db("mydb");
    ratingCollection = db.collection("ratings");
    userCollection = db.collection("userCollection");
    productsCollection = db.collection("products");
    console.log("✅ Rating Service Connected");
  } catch (err) {
    console.error("❌ Connection failed:", err);
    process.exit(1);
  }
})();

// ===============================
// 🚀 Create Review/Rating
// ===============================
router.post("/create", async (req, res) => {
  try {
    const { orderId, productId, buyerEmail, sellerEmail, rating, message, productName } = req.body;

    // Validation
    if (!orderId || !buyerEmail || !sellerEmail || !rating || !message) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields" 
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        message: "Rating must be between 1 and 5" 
      });
    }

    // Check if review already exists for this order by this buyer
    const existingReview = await ratingCollection.findOne({
      orderId: orderId,
      buyerEmail: buyerEmail
    });

    if (existingReview) {
      return res.status(400).json({ 
        success: false, 
        message: "You have already reviewed this order" 
      });
    }

    const newRating = {
      orderId,
      productId,
      buyerEmail,
      sellerEmail,
      rating,
      message,
      productName,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await ratingCollection.insertOne(newRating);

    res.status(201).json({ 
      success: true, 
      message: "Review submitted successfully", 
      ratingId: result.insertedId 
    });
  } catch (error) {
    console.error("Error creating rating:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while creating review" 
    });
  }
});

// ===============================
// 🚀 Get Seller Ratings/Reviews
// ===============================
router.get("/seller/:sellerEmail", async (req, res) => {
  try {
    const { sellerEmail } = req.params;

    const ratings = await ratingCollection
      .find({ sellerEmail: sellerEmail })
      .sort({ createdAt: -1 })
      .toArray();

    const avgRating = ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
      : 0;

    res.status(200).json({
      success: true,
      sellerEmail,
      totalReviews: ratings.length,
      averageRating: avgRating,
      ratings
    });
  } catch (error) {
    console.error("Error fetching seller ratings:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching ratings" 
    });
  }
});

// ===============================
// 🚀 Get Product Ratings
// ===============================
router.get("/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    const ratings = await ratingCollection
      .find({ productId: productId })
      .sort({ createdAt: -1 })
      .toArray();

    const avgRating = ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
      : 0;

    res.status(200).json({
      success: true,
      productId,
      totalReviews: ratings.length,
      averageRating: avgRating,
      ratings
    });
  } catch (error) {
    console.error("Error fetching product ratings:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching ratings" 
    });
  }
});

// ===============================
// 🚀 Get User Reviews (as Buyer)
// ===============================
router.get("/buyer/:buyerEmail", async (req, res) => {
  try {
    const { buyerEmail } = req.params;

    const ratings = await ratingCollection
      .find({ buyerEmail: buyerEmail })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      buyerEmail,
      totalReviews: ratings.length,
      ratings
    });
  } catch (error) {
    console.error("Error fetching buyer reviews:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching reviews" 
    });
  }
});

// ===============================
// 🚀 Update Rating/Review
// ===============================
router.put("/update/:ratingId", async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { rating, message } = req.body;

    if (!ObjectId.isValid(ratingId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid rating ID" 
      });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ 
        success: false, 
        message: "Rating must be between 1 and 5" 
      });
    }

    const updateData = { updatedAt: new Date() };
    if (rating) updateData.rating = rating;
    if (message) updateData.message = message;

    const result = await ratingCollection.updateOne(
      { _id: new ObjectId(ratingId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Rating not found" 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Review updated successfully" 
    });
  } catch (error) {
    console.error("Error updating rating:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while updating review" 
    });
  }
});

// ===============================
// 🚀 Delete Rating/Review
// ===============================
router.delete("/delete/:ratingId", async (req, res) => {
  try {
    const { ratingId } = req.params;

    if (!ObjectId.isValid(ratingId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid rating ID" 
      });
    }

    const result = await ratingCollection.deleteOne({
      _id: new ObjectId(ratingId)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Rating not found" 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Review deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting rating:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while deleting review" 
    });
  }
});

// ===============================
// 🚀 Get All Ratings (Admin)
// ===============================
router.get("/all/all", async (req, res) => {
  try {
    const ratings = await ratingCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      totalReviews: ratings.length,
      ratings
    });
  } catch (error) {
    console.error("Error fetching all ratings:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while fetching ratings" 
    });
  }
});

module.exports = router;
