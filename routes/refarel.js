const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const router = express.Router();
router.use(express.json());

const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const usersCollection = db.collection("userCollection");

(async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB (referral route)");
  } catch (err) {
    console.error("MongoDB Connection Error (referral):", err);
  }
})();

// GET referral stats for a user
// Example: GET /referral/stats?email=user@example.com
router.get("/stats", async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Find the user with their referral code
    const user = await usersCollection.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const referralCode = user.referralCode;

    // Count users referred by this user
    const referrals = await usersCollection.find({ referredBy: referralCode }).toArray();

    // Separate by role
    const referredBuyers = referrals.filter(ref => ref.role === "buyer" || !ref.role).length;
    const referredSellers = referrals.filter(ref => ref.role === "seller").length;

    // Calculate referral earnings (each referral gives $5 bonus)
    // This is simplified - in a real system you might track this differently
    const referralEarnings = (referredBuyers + referredSellers) * 5;

    res.json({
      success: true,
      data: {
        referralCode,
        referralLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${referralCode}`,
        referredBuyers,
        referredSellers,
        totalReferrals: referredBuyers + referredSellers,
        referralEarnings,
        referralList: referrals.map(ref => ({
          _id: ref._id,
          name: ref.name,
          email: ref.email,
          role: ref.role || "buyer",
          joinedAt: ref.createdAt || "N/A",
          referredAt: ref.referredAt || "N/A"
        }))
      }
    });
  } catch (err) {
    console.error("GET /referral/stats error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET referral link for a user
// Example: GET /referral/link?email=user@example.com
router.get("/link", async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await usersCollection.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const referralCode = user.referralCode;
    const referralLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${referralCode}`;

    res.json({
      success: true,
      data: {
        referralCode,
        referralLink,
        email
      }
    });
  } catch (err) {
    console.error("GET /referral/link error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET user referral info by ID
// Example: GET /referral/user/:userId
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const referralCode = user.referralCode;

    // Count referrals
    const referrals = await usersCollection.find({ referredBy: referralCode }).toArray();
    const referredBuyers = referrals.filter(ref => ref.role === "buyer" || !ref.role).length;
    const referredSellers = referrals.filter(ref => ref.role === "seller").length;
    const referralEarnings = (referredBuyers + referredSellers) * 5;

    res.json({
      success: true,
      data: {
        userId,
        email: user.email,
        referralCode,
        referralLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${referralCode}`,
        referredBuyers,
        referredSellers,
        totalReferrals: referredBuyers + referredSellers,
        referralEarnings
      }
    });
  } catch (err) {
    console.error("GET /referral/user/:userId error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET detailed referral history
// Example: GET /referral/history?email=user@example.com
router.get("/history", async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await usersCollection.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const referralCode = user.referralCode;

    // Get all referrals with details
    const referrals = await usersCollection
      .find({ referredBy: referralCode })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      data: {
        referralCode,
        totalCount: referrals.length,
        referralHistory: referrals.map(ref => ({
          _id: ref._id,
          name: ref.name,
          email: ref.email,
          phone: ref.phone || "N/A",
          role: ref.role || "buyer",
          balance: ref.balance || 0,
          joinedAt: ref.createdAt || "N/A",
          status: ref.status || "active"
        }))
      }
    });
  } catch (err) {
    console.error("GET /referral/history error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
