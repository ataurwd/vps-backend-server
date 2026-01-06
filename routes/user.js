// const express = require("express");
// const { MongoClient, ObjectId } = require("mongodb");
// const router = express.Router();

// // MongoDB Setup (Isolating connection for this route file)
// const MONGO_URI = process.env.MONGO_URI;
// const client = new MongoClient(MONGO_URI);
// const db = client.db("mydb");
// const users = db.collection("userCollection");


// // Connect to DB
// async function run() {
//   try {
//     await client.connect();
//   } catch (error) {
//   }
// }
// run();

// // --- REGISTER ---

// (async () => await client.connect())();

// // API to get user sales credit

// router.post("/register", async (req, res) => {
//   try {
//     const userData = req.body;
//     // Default fields
//     if (!userData.balance) userData.balance = 0;
//     if (!userData.role) userData.role = "buyer";
    
//     const result = await users.insertOne(userData);
//     res.send(result);
//   } catch (e) {
//     res.status(500).json({message: "Error registering user"});
//   }
// });


// // --- GET ALL ---
// router.get("/getall", async (req, res) => {
//   const allUsers = await users.find({}).toArray();
//   res.send(allUsers);
// });

// // --- LOGIN ---

// // API: /api/user/login

// router.post("/login", async (req, res) => {
//   const { email, password } = req.body;
//   const user = await users.findOne({ email });
//   if (!user) return res.status(404).json({ success: false, message: "User not found" });
//   if (user.password !== password) return res.status(400).json({ success: false, message: "Wrong password" });
  
//   res.json({ success: true, message: "Login successful", user });
// });

// // --- 🔥 BECOME SELLER ROUTE (FIXED) ---
// router.post('/become-seller', async (req, res) => {

//     try {
//         const { email, amount } = req.body;
        
//         // ১. ইউজার খোঁজা
//         const user = await users.findOne({ email: email });
//         if (!user) {
//             return res.status(404).json({ success: false, message: "User not found" });
//         }

//         // ২. ব্যালেন্স চেক
//         const currentBalance = Number(user.balance) || 0;
//         const fee = Number(amount);

//         if (currentBalance < fee) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Insufficient balance",
//                 available: currentBalance
//             });
//         }

//         // ৩. রোল আপডেট করা (UpdateOne)
//         const newBalance = currentBalance - fee;
//         const result = await users.updateOne(
//             { email: email },
//             { $set: { balance: newBalance, role: "seller" } }
//         );

//         if (result.modifiedCount > 0) {
//             res.status(200).json({
//                 success: true,
//                 message: "Upgraded to Seller",
//                 newBalance: newBalance
//             });
//         } else {
//             res.status(400).json({ success: false, message: "Update failed or already seller" });
//         }

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ success: false, message: "Server Error" });
//     }
// });


// // Get user by ID
// // get user by id
// router.get("/getall/:id", async (req, res) => {
//  const id = new ObjectId(req.params.id);
//         const result = await users.findOne({_id: id});
//         res.send(result)
// });


// // POST /api/users/getall/:userId/deduct-and-credit
// router.post('/getall/:userId', async (req, res) => {
//   const { userId } = req.params;
//   const { deductAmount, creditAmount, newPlan } = req.body;

//   if (!deductAmount || deductAmount <= 0) {
//     return res.status(400).json({ message: 'Invalid deduct amount' });
//   }

//   if (!creditAmount || creditAmount < 0) {
//     return res.status(400).json({ message: 'Invalid credit amount' });
//   }

//   // অপশনাল plan validation
//   if (newPlan && !['basic', 'pro', 'business', 'premium'].includes(newPlan)) {
//     return res.status(400).json({ message: 'Invalid subscribed plan' });
//   }

//   const session = await client.startSession();

//   try {
//     const updatedUser = await session.withTransaction(async () => {
//       const users = db.collection('userCollection');

//       const user = await users.findOne({ _id: new ObjectId(userId) }, { session });
//       if (!user) throw new Error('User not found');
//       if (user.balance < deductAmount) throw new Error('Insufficient balance');

//       const update = {
//         $inc: {
//           balance: -deductAmount,
//           salesCredit: creditAmount,  // আলাদা amount যোগ হচ্ছে
//         },
//       };

//       if (newPlan !== undefined) {
//         update.$set = { subscribedPlan: newPlan };
//       }

//       const result = await users.updateOne(
//         { _id: new ObjectId(userId) },
//         update,
//         { session }
//       );

//       if (result.modifiedCount === 0) throw new Error('Update failed');

//       return await users.findOne({ _id: new ObjectId(userId) }, { session });
//     });

//     res.json({
//       message: 'Transaction successful',
//       newBalance: updatedUser.balance,
//       newSalesCredit: updatedUser.salesCredit,
//       subscribedPlan: updatedUser.subscribedPlan,
//     });
//   } catch (error) {
//     res.status(400).json({ message: error.message || 'Transaction failed' });
//   } finally {
//     await session.endSession();
//   }
// });


// // refale balance update

// router.post('/register', async (req, res) => {
//     try {
//         const userData = req.body; // ফ্রন্টএন্ড থেকে আসা ডাটা
//         const referredByCode = userData.referredBy; // ফ্রন্টএন্ড থেকে পাঠানো রেফার কোড

//         // ১. নতুন ইউজারকে ডাটাবেজে সেভ করুন (আপনার বর্তমান কোড অনুযায়ী)
//         const newUser = await usersCollection.insertOne(userData);

//         // ২. যদি রেফারাল কোড থাকে, তবে রেফারারকে বোনাস দিন
//         if (referredByCode) {
//             // ডাটাবেজে খুঁজুন এই কোডটি কার
//             const referrer = await usersCollection.findOne({ referralCode: referredByCode });

//             if (referrer) {
//                 // রেফারারের ব্যালেন্স ৫ ডলার (বা আপনার কারেন্সি অনুযায়ী) বাড়িয়ে দিন
//                 await usersCollection.updateOne(
//                     { _id: referrer._id },
//                     { $inc: { balance: 5 } }
//                 );
//                 console.log("Referral bonus added to:", referrer.email);
//             }
//         }

//         res.status(201).send({ insertedId: newUser.insertedId });
//     } catch (error) {
//         res.status(500).send({ message: error.message });
//     }
// });



// module.exports = router;


const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const router = express.Router();

// MongoDB Setup
const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const users = db.collection("userCollection");

// Connect to DB once
async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("DB connection error:", error);
  }
}
run();

// --- REGISTER (FIXED & MERGED) ---
router.post("/register", async (req, res) => {
  try {
    const userData = req.body;
    const referredByCode = userData.referredBy;

    // ১. ইউনিক রেফারাল কোড জেনারেট করা (যদি ফ্রন্টএন্ড থেকে না আসে)
    if (!userData.referralCode) {
      userData.referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    }

    // ২. ডিফল্ট ফিল্ড সেট করা
    if (!userData.balance) userData.balance = 0;
    if (!userData.role) userData.role = "buyer";
    if (!userData.salesCredit) userData.salesCredit = 10;

    // ৩. নতুন ইউজার সেভ করা
    const result = await users.insertOne(userData);

    // ৪. রেফারাল বোনাস লজিক
    if (referredByCode && result.insertedId) {
      const referrer = await users.findOne({ referralCode: referredByCode });

      if (referrer) {
        await users.updateOne(
          { _id: referrer._id },
          { $inc: { balance: 5 } }
        );
        console.log(`Referral Bonus $5 added to: ${referrer.email}`);
      }
    }

    // রেসপন্সে insertedId এর সাথে নতুন কোডটিও পাঠিয়ে দেওয়া ভালো
    res.status(201).send({ 
      insertedId: result.insertedId, 
      referralCode: userData.referralCode 
    });
  } catch (e) {
    console.error("Register Error:", e);
    res.status(500).json({ message: "Error registering user", error: e.message });
  }
});

// --- LOGIN (বাকি সব আগের মতোই থাকবে) ---
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await users.findOne({ email });
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  if (user.password !== password) return res.status(400).json({ success: false, message: "Wrong password" });
  
  res.json({ success: true, message: "Login successful", user });
});

// --- GET ALL USERS ---
router.get("/getall", async (req, res) => {
  const allUsers = await users.find({}).toArray();
  res.send(allUsers);
});

// --- GET USER BY ID ---
router.get("/getall/:id", async (req, res) => {
  try {
    const id = new ObjectId(req.params.id);
    const result = await users.findOne({ _id: id });
    res.send(result);
  } catch (err) {
    res.status(400).send({ message: "Invalid ID" });
  }
});

// --- BECOME SELLER ---
router.post('/become-seller', async (req, res) => {
  try {
    const { email, amount } = req.body;
    const user = await users.findOne({ email: email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const currentBalance = Number(user.balance) || 0;
    const fee = Number(amount);

    if (currentBalance < fee) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    const newBalance = currentBalance - fee;
    const result = await users.updateOne(
      { email: email },
      { $set: { balance: newBalance, role: "seller" } }
    );

    if (result.modifiedCount > 0) {
      res.status(200).json({ success: true, message: "Upgraded to Seller", newBalance });
    } else {
      res.status(400).json({ success: false, message: "Update failed" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// --- DEDUCT AND CREDIT (PLAN UPDATE) ---
router.post('/getall/:userId', async (req, res) => {
  const { userId } = req.params;
  const { deductAmount, creditAmount, newPlan } = req.body;

  const session = await client.startSession();
  try {
    const updatedUser = await session.withTransaction(async () => {
      const user = await users.findOne({ _id: new ObjectId(userId) }, { session });
      if (!user) throw new Error('User not found');
      if (user.balance < deductAmount) throw new Error('Insufficient balance');

      const update = {
        $inc: { balance: -deductAmount, salesCredit: creditAmount }
      };
      if (newPlan) update.$set = { subscribedPlan: newPlan };

      await users.updateOne({ _id: new ObjectId(userId) }, update, { session });
      return await users.findOne({ _id: new ObjectId(userId) }, { session });
    });

    res.json({ success: true, newBalance: updatedUser.balance });
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    await session.endSession();
  }
});



//seller blcok
// --- BLOCK/ACTIVATE USER ---
router.patch("/update-status/:id", async (req, res) => {
  try {
    const id = new ObjectId(req.params.id);
    const { status } = req.body; // 'active' or 'blocked'
    const result = await users.updateOne(
      { _id: id },
      { $set: { status: status } }
    );
    res.json({ success: true, message: "User status updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


module.exports = router;