




const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const router = express.Router();

// MongoDB Setup (Isolating connection for this route file)
const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const users = db.collection("userCollection");


// Connect to DB
async function run() {
  try {
    await client.connect();
    console.log("✅ User Route connected to DB");
  } catch (error) {
    console.log("❌ User Route DB Error:", error);
  }
}
run();

// --- REGISTER ---

(async () => await client.connect())();

// API to get user sales credit

router.post("/register", async (req, res) => {
  try {
    const userData = req.body;
    // Default fields
    if (!userData.balance) userData.balance = 0;
    if (!userData.role) userData.role = "buyer";
    
    const result = await users.insertOne(userData);
    res.send(result);
  } catch (e) {
    res.status(500).json({message: "Error registering user"});
  }
});


// --- GET ALL ---
router.get("/getall", async (req, res) => {
  const allUsers = await users.find({}).toArray();
  res.send(allUsers);
});

// --- LOGIN ---

// API: /api/user/login

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await users.findOne({ email });
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  if (user.password !== password) return res.status(400).json({ success: false, message: "Wrong password" });
  
  res.json({ success: true, message: "Login successful", user });
});

// --- 🔥 BECOME SELLER ROUTE (FIXED) ---
router.post('/become-seller', async (req, res) => {
    console.log("🔔 Hit received at /become-seller"); // টার্মিনালে চেক করুন এই লগ আসে কিনা

    try {
        const { email, amount } = req.body;
        
        // ১. ইউজার খোঁজা
        const user = await users.findOne({ email: email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // ২. ব্যালেন্স চেক
        const currentBalance = Number(user.balance) || 0;
        const fee = Number(amount);

        if (currentBalance < fee) {
            return res.status(400).json({ 
                success: false, 
                message: "Insufficient balance",
                available: currentBalance 
            });
        }

        // ৩. রোল আপডেট করা (UpdateOne)
        const newBalance = currentBalance - fee;
        const result = await users.updateOne(
            { email: email },
            { $set: { balance: newBalance, role: "seller" } }
        );

        if (result.modifiedCount > 0) {
            res.status(200).json({
                success: true,
                message: "Upgraded to Seller",
                newBalance: newBalance
            });
        } else {
            res.status(400).json({ success: false, message: "Update failed or already seller" });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});


// Get user by ID
// get user by id
router.get("/getall/:id", async (req, res) => {
 const id = new ObjectId(req.params.id);
        const result = await users.findOne({_id: id});
        res.send(result)
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
  if (newPlan && !['basic', 'pro', 'business', 'enterprise'].includes(newPlan)) {
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