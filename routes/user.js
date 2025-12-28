const express = require("express");
const axios = require("axios");
const { MongoClient } = require("mongodb");

const router = express.Router();

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const MONGO_URI = process.env.MONGO_URI;

// Mongo DB
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const users = db.collection("userCollection");

(async () => await client.connect())();

// API to get user sales credit
router.post("/register", async (req, res) => {
    const userData = req.body;
    const result = await users.insertOne(userData);
    res.send(result);
})

// to get all users data
// API: /api/user/getall
router.get("/getall", async (req, res) => {
    const allUsers = await users.find({}).toArray();
    res.send(allUsers);
});

// API: /api/user/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

    const user = await users.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.password !== password) {
      return res.status(400).json({ success: false, message: "Wrong password" });
    }

    res.json({
      success: true,
      message: "Login successful",
      user,
    });

});


// Get user by ID
// get user by id
router.get("/getall/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // validate ObjectId
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await users.findOne({
      _id: new ObjectId(userId),
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("GET USER ERROR:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
});


// POST /api/users/getall/:userId/deduct-and-credit
router.post('/getall/:userId', async (req, res) => {
  const { userId } = req.params;
  const { deductAmount, creditAmount, newPlan } = req.body;

  if (!deductAmount || deductAmount <= 0) {
    return res.status(400).json({ message: 'Invalid deduct amount' });
  }

  if (!creditAmount || creditAmount < 0) {
    return res.status(400).json({ message: 'Invalid credit amount' });
  }

  // অপশনাল plan validation
  if (newPlan && !['basic', 'pro', 'premium', 'enterprise'].includes(newPlan)) {
    return res.status(400).json({ message: 'Invalid subscribed plan' });
  }

  const session = await client.startSession();

  try {
    const updatedUser = await session.withTransaction(async () => {
      const users = db.collection('userCollection');

      const user = await users.findOne({ _id: new ObjectId(userId) }, { session });
      if (!user) throw new Error('User not found');
      if (user.balance < deductAmount) throw new Error('Insufficient balance');

      const update = {
        $inc: {
          balance: -deductAmount,
          salesCredit: creditAmount,  // আলাদা amount যোগ হচ্ছে
        },
      };

      if (newPlan !== undefined) {
        update.$set = { subscribedPlan: newPlan };
      }

      const result = await users.updateOne(
        { _id: new ObjectId(userId) },
        update,
        { session }
      );

      if (result.modifiedCount === 0) throw new Error('Update failed');

      return await users.findOne({ _id: new ObjectId(userId) }, { session });
    });

    res.json({
      message: 'Transaction successful',
      newBalance: updatedUser.balance,
      newSalesCredit: updatedUser.salesCredit,
      subscribedPlan: updatedUser.subscribedPlan,
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Transaction failed' });
  } finally {
    await session.endSession();
  }
});

module.exports = router;