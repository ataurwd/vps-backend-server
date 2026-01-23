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
//   tr
// y {
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


// //////////////////////////////////////////////////////////////////


// const express = require("express");
// const { MongoClient, ObjectId } = require("mongodb");
// const router = express.Router();

// // MongoDB Setup
// const MONGO_URI = process.env.MONGO_URI;
// const client = new MongoClient(MONGO_URI);
// const db = client.db("mydb");
// const users = db.collection("userCollection");

// // Connect to DB once
// async function run() {
//   try {
//     await client.connect();
//     console.log("Connected to MongoDB");
//   } catch (error) {
//     console.error("DB connection error:", error);
//   }
// }
// run();

// // --- REGISTER (FIXED & MERGED) ---
// router.post("/register", async (req, res) => {
//   try {
//     const userData = req.body;
//     const referredByCode = userData.referredBy;

//     // ১. ইউনিক রেফারাল কোড জেনারেট করা (যদি ফ্রন্টএন্ড থেকে না আসে)
//     if (!userData.referralCode) {
//       userData.referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
//     }

//     // ২. ডিফল্ট ফিল্ড সেট করা
//     if (!userData.balance) userData.balance = 0;
//     if (!userData.role) userData.role = "buyer";
//     if (!userData.salesCredit) userData.salesCredit = 10;

//     // ৩. নতুন ইউজার সেভ করা
//     const result = await users.insertOne(userData);

//     // ৪. রেফারাল বোনাস লজিক
//     if (referredByCode && result.insertedId) {
//       const referrer = await users.findOne({ referralCode: referredByCode });

//       if (referrer) {
//         await users.updateOne(
//           { _id: referrer._id },
//           { $inc: { balance: 5 } }
//         );
//         console.log(`Referral Bonus $5 added to: ${referrer.email}`);
//       }
//     }

//     // রেসপন্সে insertedId এর সাথে নতুন কোডটিও পাঠিয়ে দেওয়া ভালো
//     res.status(201).send({
//       insertedId: result.insertedId,
//       referralCode: userData.referralCode
//     });
//   } catch (e) {
//     console.error("Register Error:", e);
//     res.status(500).json({ message: "Error registering user", error: e.message });
//   }
// });

// // --- LOGIN (বাকি সব আগের মতোই থাকবে) ---
// router.post("/login", async (req, res) => {
//   const { email, password } = req.body;
//   const user = await users.findOne({ email });
//   if (!user) return res.status(404).json({ success: false, message: "User not found" });
//   if (user.password !== password) return res.status(400).json({ success: false, message: "Wrong password" });
  
//   res.json({ success: true, message: "Login successful", user });
// });

// // --- GET ALL USERS ---
// router.get("/getall", async (req, res) => {
//   const allUsers = await users.find({}).toArray();
//   res.send(allUsers);
// });

// // --- GET USER BY ID ---
// router.get("/getall/:id", async (req, res) => {
//   try {
//     const id = new ObjectId(req.params.id);
//     const result = await users.findOne({ _id: id });
//     res.send(result);
//   } catch (err) {
//     res.status(400).send({ message: "Invalid ID" });
//   }
// });

// // --- BECOME SELLER ---
// router.post('/become-seller', async (req, res) => {
//   try {
//     const { email, amount } = req.body;
//     const user = await users.findOne({ email: email });
//     if (!user) return res.status(404).json({ success: false, message: "User not found" });

//     const currentBalance = Number(user.balance) || 0;
//     const fee = Number(amount);

//     if (currentBalance < fee) {
//       return res.status(400).json({ success: false, message: "Insufficient balance" });
//     }

//     const newBalance = currentBalance - fee;
//     const result = await users.updateOne(
//       { email: email },
//       { $set: { balance: newBalance, role: "seller" } }
//     );

//     if (result.modifiedCount > 0) {
//       res.status(200).json({ success: true, message: "Upgraded to Seller", newBalance });
//     } else {
//       res.status(400).json({ success: false, message: "Update failed" });
//     }
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Server Error" });
//   }
// });

// // --- DEDUCT AND CREDIT (PLAN UPDATE) ---
// router.post('/getall/:userId', async (req, res) => {
//   const { userId } = req.params;
//   const { deductAmount, creditAmount, newPlan } = req.body;

//   const session = await client.startSession();
//   try {
//     const updatedUser = await session.withTransaction(async () => {
//       const user = await users.findOne({ _id: new ObjectId(userId) }, { session });
//       if (!user) throw new Error('User not found');
//       if (user.balance < deductAmount) throw new Error('Insufficient balance');

//       const update = {
//         $inc: { balance: -deductAmount, salesCredit: creditAmount }
//       };
//       if (newPlan) update.$set = { subscribedPlan: newPlan };

//       await users.updateOne({ _id: new ObjectId(userId) }, update, { session });
//       return await users.findOne({ _id: new ObjectId(userId) }, { session });
//     });

//     res.json({ success: true, newBalance: updatedUser.balance });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   } finally {
//     await session.endSession();
//   }
// });



// //seller blcok
// // --- BLOCK/ACTIVATE USER ---
// router.patch("/update-status/:id", async (req, res) => {
//   try {
//     const id = new ObjectId(req.params.id);
//     const { status } = req.body; // 'active' or 'blocked'
//     const result = await users.updateOne(
//       { _id: id },
//       { $set: { status: status } }
//     );
//     res.json({ success: true, message: "User status updated" });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });


// module.exports = router;














// const express = require("express");
// const { MongoClient, ObjectId } = require("mongodb");
// const router = express.Router();

// // MongoDB Setup
// const MONGO_URI = process.env.MONGO_URI;
// const client = new MongoClient(MONGO_URI);
// const db = client.db("mydb");
// const users = db.collection("userCollection");

// // Connect to DB once
// async function run() {
//   try {
//     await client.connect();
//     console.log("Connected to MongoDB");
//   } catch (error) {
//     console.error("DB connection error:", error);
//   }
// }
// run();

// // --- REGISTER (FIXED & MERGED) ---
// router.post("/register", async (req, res) => {
//   try {
//     const userData = req.body;
//     const referredByCode = userData.referredBy;

//     // ১. ইউনিক রেফারাল কোড জেনারেট করা (যদি ফ্রন্টএন্ড থেকে না আসে)
//     if (!userData.referralCode) {
//       userData.referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
//     }

//     // ২. ডিফল্ট ফিল্ড সেট করা
//     if (!userData.balance) userData.balance = 0;
//     if (!userData.role) userData.role = "buyer";
//     if (!userData.salesCredit) userData.salesCredit = 10;

//     // ৩. নতুন ইউজার সেভ করা
//     const result = await users.insertOne(userData);

//     // ৪. রেফারাল বোনাস লজিক
//     if (referredByCode && result.insertedId) {
//       const referrer = await users.findOne({ referralCode: referredByCode });

//       if (referrer) {
//         await users.updateOne(
//           { _id: referrer._id },
//           { $inc: { balance: 5 } }
//         );
//         console.log(`Referral Bonus $5 added to: ${referrer.email}`);
//       }
//     }

//     // রেসপন্সে insertedId এর সাথে নতুন কোডটিও পাঠিয়ে দেওয়া ভালো
//     res.status(201).send({ 
//       insertedId: result.insertedId, 
//       referralCode: userData.referralCode 
//     });
//   } catch (e) {
//     console.error("Register Error:", e);
//     res.status(500).json({ message: "Error registering user", error: e.message });
//   }
// });

// // --- LOGIN (বাকি সব আগের মতোই থাকবে) ---
// router.post("/login", async (req, res) => {
//   const { email, password } = req.body;
//   const user = await users.findOne({ email });
//   if (!user) return res.status(404).json({ success: false, message: "User not found" });
//   // prevent blocked sellers from logging in
//   if (user.role === "seller" && user.status === "blocked") {
//     return res.status(403).json({ success: false, message: "Account blocked by admin" });
//   }

//   if (user.password !== password) return res.status(400).json({ success: false, message: "Wrong password" });

//   res.json({ success: true, message: "Login successful", user });
// });

// // --- GET ALL USERS ---
// router.get("/getall", async (req, res) => {
//   const allUsers = await users.find({}).toArray();
//   res.send(allUsers);
// });

// // --- GET USER BY ID ---
// router.get("/getall/:id", async (req, res) => {
//   try {
//     const id = new ObjectId(req.params.id);
//     const result = await users.findOne({ _id: id });
//     res.send(result);
//   } catch (err) {
//     res.status(400).send({ message: "Invalid ID" });
//   }
// });

// // --- BECOME SELLER ---
// router.post('/become-seller', async (req, res) => {
//   try {
//     const { email, amount } = req.body;
//     const user = await users.findOne({ email: email });
//     if (!user) return res.status(404).json({ success: false, message: "User not found" });

//     const currentBalance = Number(user.balance) || 0;
//     const fee = Number(amount);

//     if (currentBalance < fee) {
//       return res.status(400).json({ success: false, message: "Insufficient balance" });
//     }

//     const newBalance = currentBalance - fee;
//     const result = await users.updateOne(
//       { email: email },
//       { $set: { balance: newBalance, role: "seller" } }
//     );

//     if (result.modifiedCount > 0) {
//       res.status(200).json({ success: true, message: "Upgraded to Seller", newBalance });
//     } else {
//       res.status(400).json({ success: false, message: "Update failed" });
//     }
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Server Error" });
//   }
// });

// // --- DEDUCT AND CREDIT (PLAN UPDATE) ---
// router.post('/getall/:userId', async (req, res) => {
//   const { userId } = req.params;
//   const { deductAmount, creditAmount, newPlan } = req.body;

//   const session = await client.startSession();
//   try {
//     const updatedUser = await session.withTransaction(async () => {
//       const user = await users.findOne({ _id: new ObjectId(userId) }, { session });
//       if (!user) throw new Error('User not found');
//       if (user.balance < deductAmount) throw new Error('Insufficient balance');

//       const update = {
//         $inc: { balance: -deductAmount, salesCredit: creditAmount }
//       };
//       if (newPlan) update.$set = { subscribedPlan: newPlan };

//       await users.updateOne({ _id: new ObjectId(userId) }, update, { session });
//       return await users.findOne({ _id: new ObjectId(userId) }, { session });
//     });

//     res.json({ success: true, newBalance: updatedUser.balance });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   } finally {
//     await session.endSession();
//   }
// });



// //seller blcok
// // --- BLOCK/ACTIVATE USER ---
// router.patch("/update-status/:id", async (req, res) => {
//   try {
//     const id = new ObjectId(req.params.id);
//     const { status } = req.body; // 'active' or 'blocked'
//     const result = await users.updateOne(
//       { _id: id },
//       { $set: { status: status } }
//     );
//     res.json({ success: true, message: "User status updated" });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // --- CHECK USER STATUS ---
// // GET /api/user/status?email=someone@example.com
// router.get("/status", async (req, res) => {
//   try {
//     const { email } = req.query;
//     if (!email) return res.status(400).json({ success: false, message: "Email is required" });

//     const user = await users.findOne({ email: String(email) });
//     if (!user) return res.status(404).json({ success: false, message: "User not found" });

//     res.json({ success: true, status: user.status || "active", role: user.role || "buyer" });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });


// module.exports = router;

// const express = require("express");
// const { MongoClient, ObjectId } = require("mongodb");
// const router = express.Router();

// // MongoDB Setup
// const MONGO_URI = process.env.MONGO_URI;
// const client = new MongoClient(MONGO_URI);
// const db = client.db("mydb");
// const users = db.collection("userCollection");

// // Connect to DB once
// async function run() {
//   try {
//     await client.connect();
//     console.log("Connected to MongoDB");
//   } catch (error) {
//     console.error("DB connection error:", error);
//   }
// }
// run();

// // --- REGISTER (FIXED & MERGED) ---
// router.post("/register", async (req, res) => {
//   try {
//     const userData = req.body;
//     const referredByCode = userData.referredBy;

//     // ১. ইউনিক রেফারাল কোড জেনারেট করা (যদি ফ্রন্টএন্ড থেকে না আসে)
//     if (!userData.referralCode) {
//       userData.referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
//     }

//     // ২. ডিফল্ট ফিল্ড সেট করা
//     if (!userData.balance) userData.balance = 0;
//     if (!userData.role) userData.role = "buyer";
//     if (!userData.salesCredit) userData.salesCredit = 10;

//     // ৩. নতুন ইউজার সেভ করা
//     const result = await users.insertOne(userData);

//     // ৪. রেফারাল বোনাস লজিক
//     // if (referredByCode && result.insertedId) {
//     //   const referrer = await users.findOne({ referralCode: referredByCode });

//     //   if (referrer) {
//     //     await users.updateOne(
//     //       { _id: referrer._id },
//     //       { $inc: { balance: 5 } }
//     //     );
//     //     console.log(`Referral Bonus $5 added to: ${referrer.email}`);
//     //   }
//     // }

//     // রেসপন্সে insertedId এর সাথে নতুন কোডটিও পাঠিয়ে দেওয়া ভালো
//     res.status(201).send({ 
//       insertedId: result.insertedId, 
//       referralCode: userData.referralCode 
//     });
//   } catch (e) {
//     console.error("Register Error:", e);
//     res.status(500).json({ message: "Error registering user", error: e.message });
//   }
// });

// // --- LOGIN (বাকি সব আগের মতোই থাকবে) ---
// router.post("/login", async (req, res) => {
//   const { email, password } = req.body;
//   const user = await users.findOne({ email });
//   if (!user) return res.status(404).json({ success: false, message: "User not found" });
//   // prevent blocked users from logging in
//   if (user.status === "blocked") {
//     return res.status(403).json({ success: false, message: "Your account has been blocked" });
//   }

//   if (user.password !== password) return res.status(400).json({ success: false, message: "Wrong password" });

//   res.json({ success: true, message: "Login successful", user });
// });

// // --- GET ALL USERS ---
// router.get("/getall", async (req, res) => {
//   const allUsers = await users.find({}).toArray();
//   res.send(allUsers);
// });

// // --- GET USER BY ID ---
// router.get("/getall/:id", async (req, res) => {
//   try {
//     const id = new ObjectId(req.params.id);
//     const result = await users.findOne({ _id: id });
//     res.send(result);
//   } catch (err) {
//     res.status(400).send({ message: "Invalid ID" });
//   }
// });

// // --- BECOME SELLER ---
// router.post('/become-seller', async (req, res) => {
//   try {
//     const { email, amount } = req.body;
//     const user = await users.findOne({ email: email });
//     if (!user) return res.status(404).json({ success: false, message: "User not found" });

//     const currentBalance = Number(user.balance) || 0;
//     const fee = Number(amount);

//     if (currentBalance < fee) {
//       return res.status(400).json({ success: false, message: "Insufficient balance" });
//     }

//     const newBalance = currentBalance - fee;
//     const result = await users.updateOne(
//       { email: email },
//       { $set: { balance: newBalance, role: "seller" } }
//     );

//     if (result.modifiedCount > 0) {
//       res.status(200).json({ success: true, message: "Upgraded to Seller", newBalance });
//     } else {
//       res.status(400).json({ success: false, message: "Update failed" });
//     }
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Server Error" });
//   }
// });

// // --- DEDUCT AND CREDIT (PLAN UPDATE) ---
// router.post('/getall/:userId', async (req, res) => {
//   const { userId } = req.params;
//   const { deductAmount, creditAmount, newPlan } = req.body;

//   const session = await client.startSession();
//   try {
//     const updatedUser = await session.withTransaction(async () => {
//       const user = await users.findOne({ _id: new ObjectId(userId) }, { session });
//       if (!user) throw new Error('User not found');
//       if (user.balance < deductAmount) throw new Error('Insufficient balance');

//       const update = {
//         $inc: { balance: -deductAmount, salesCredit: creditAmount }
//       };
//       if (newPlan) update.$set = { subscribedPlan: newPlan };

//       await users.updateOne({ _id: new ObjectId(userId) }, update, { session });
//       return await users.findOne({ _id: new ObjectId(userId) }, { session });
//     });

//     res.json({ success: true, newBalance: updatedUser.balance });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   } finally {
//     await session.endSession();
//   }
// });



// //seller blcok
// // --- BLOCK/ACTIVATE USER ---
// router.patch("/update-status/:id", async (req, res) => {
//   try {
//     const id = new ObjectId(req.params.id);
//     const { status } = req.body; // 'active' or 'blocked'
//     const result = await users.updateOne(
//       { _id: id },
//       { $set: { status: status } }
//     );
//     res.json({ success: true, message: "User status updated" });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // --- CHECK USER STATUS ---
// // GET /api/user/status?email=someone@example.com
// router.get("/status", async (req, res) => {
//   try {
//     const { email } = req.query;
//     if (!email) return res.status(400).json({ success: false, message: "Email is required" });

//     const user = await users.findOne({ email: String(email) });
//     if (!user) return res.status(404).json({ success: false, message: "User not found" });

//     res.json({ success: true, status: user.status || "active", role: user.role || "buyer" });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
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


// ================= REGISTER =================
router.post("/register", async (req, res) => {
  try {
    const userData = req.body;
    const referredByCode = userData.referredBy;

    // ===== CHECK IF NAME (USERNAME) ALREADY EXISTS (CASE-INSENSITIVE) =====
    if (userData.name) {
      const existingName = await users.findOne({ 
        name: { $regex: `^${userData.name}$`, $options: "i" } 
      });
      if (existingName) {
        return res.status(409).json({
          success: false,
          message: "The username has been taken!"
        });
      }
    }

    // ===== CHECK IF EMAIL ALREADY EXISTS =====
    const existingEmail = await users.findOne({ email: userData.email });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "The email has been taken!"
      });
    }

    // generate referral code if missing
    if (!userData.referralCode) {
      userData.referralCode = Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase();
    }

    // default fields
    userData.balance = userData.balance || 0;
    userData.role = userData.role || "buyer";
    userData.salesCredit = userData.salesCredit || 10;

    // referral pending system (NO AUTO BONUS)
    userData.referredBy = referredByCode || null;
    userData.referralStatus = referredByCode ? "pending" : null;

    const result = await users.insertOne(userData);

    // Create referral record if referred by someone
    if (referredByCode && result.insertedId) {
      try {
        const referrer = await users.findOne({ referralCode: referredByCode });
        if (referrer) {
          const referralsCollection = db.collection("referrals");
          await referralsCollection.insertOne({
            referrerId: referrer._id,
            referrerEmail: referrer.email,
            referrerName: referrer.name || "Unknown",
            refereeId: result.insertedId,
            refereeEmail: userData.email,
            refereeName: userData.name || "Unknown",
            refereeRole: userData.role || "buyer",
            referralCode: referredByCode,
            status: "pending", // Requires admin approval
            amount: 5,
            createdAt: new Date(),
            approvedAt: null,
            rejectedAt: null
          });
          console.log(`Referral record created for: ${referrer.email} → ${userData.email}`);
        }
      } catch (refErr) {
        console.error("Error creating referral record:", refErr);
        // Don't fail registration if referral record creation fails
      }
    }

    res.status(201).send({
      insertedId: result.insertedId,
      referralCode: userData.referralCode,
    });
  } catch (e) {
    console.error("Register Error:", e);
    res.status(500).json({ message: "Error registering user", error: e.message });
  }
});


// ================= LOGIN =================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await users.findOne({ email });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (user.status === "blocked") {
    return res
      .status(403)
      .json({ success: false, message: "Your account has been blocked" });
  }

  if (user.password !== password) {
    return res
      .status(400)
      .json({ success: false, message: "Wrong password" });
  }

  res.json({ success: true, message: "Login successful", user });
});


// ================= GET ALL USERS =================
router.get("/getall", async (req, res) => {
  const allUsers = await users.find({}).toArray();
  res.send(allUsers);
});


// ================= GET USER BY ID =================
router.get("/getall/:id", async (req, res) => {
  try {
    const id = new ObjectId(req.params.id);
    const result = await users.findOne({ _id: id });
    res.send(result);
  } catch (err) {
    res.status(400).send({ message: "Invalid ID" });
  }
});


// ================= BECOME SELLER =================
router.post("/become-seller", async (req, res) => {
  try {
    const { email, amount } = req.body;
    const user = await users.findOne({ email });

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const currentBalance = Number(user.balance) || 0;
    const fee = Number(amount);

    if (currentBalance < fee) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance" });
    }

    const newBalance = currentBalance - fee;

    const result = await users.updateOne(
      { email },
      { $set: { balance: newBalance, role: "seller" } }
    );

    if (result.modifiedCount > 0) {
      res.json({
        success: true,
        message: "Upgraded to Seller",
        newBalance,
      });
    } else {
      res.status(400).json({ success: false, message: "Update failed" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});


// ================= PLAN UPDATE =================
router.post("/getall/:userId", async (req, res) => {
  const { userId } = req.params;
  const { deductAmount, creditAmount, newPlan } = req.body;

  const session = await client.startSession();
  try {
    const updatedUser = await session.withTransaction(async () => {
      const user = await users.findOne(
        { _id: new ObjectId(userId) },
        { session }
      );

      if (!user) throw new Error("User not found");
      if (user.balance < deductAmount)
        throw new Error("Insufficient balance");

      const update = {
        $inc: { balance: -deductAmount, salesCredit: creditAmount },
      };

      if (newPlan) update.$set = { subscribedPlan: newPlan };

      await users.updateOne(
        { _id: new ObjectId(userId) },
        update,
        { session }
      );

      return await users.findOne(
        { _id: new ObjectId(userId) },
        { session }
      );
    });

    res.json({ success: true, newBalance: updatedUser.balance });
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    await session.endSession();
  }
});


// ================= BLOCK / ACTIVATE =================
router.patch("/update-status/:id", async (req, res) => {
  try {
    const id = new ObjectId(req.params.id);
    const { status } = req.body;

    await users.updateOne({ _id: id }, { $set: { status } });

    res.json({ success: true, message: "User status updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ================= CHECK STATUS =================
router.get("/status", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });

    const user = await users.findOne({ email: String(email) });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    res.json({
      success: true,
      status: user.status || "active",
      role: user.role || "buyer",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ================= ADMIN UPDATE REFERRAL STATUS =================
router.patch("/admin/update-referral-status", async (req, res) => {
  try {
    const { userId, status } = req.body;

    if (!userId || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const user = await users.findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(404).json({ message: "User not found" });

    // already handled
    if (user.referralStatus !== "pending") {
      return res.status(400).json({
        message: `Referral already ${user.referralStatus}`,
      });
    }

    // APPROVE → add bonus
    if (status === "approved") {
      const referrer = await users.findOne({
        referralCode: user.referredBy,
      });

      if (!referrer) {
        return res.status(404).json({ message: "Referrer not found" });
      }

      await users.updateOne(
        { _id: referrer._id },
        { $inc: { balance: 5 } }
      );
    }

    // update referral status
    await users.updateOne(
      { _id: user._id },
      { $set: { referralStatus: status } }
    );

    res.json({
      success: true,
      message: `Referral ${status} successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ================= SAVE BANK ACCOUNT DETAILS =================
router.post("/save-bank-account", async (req, res) => {
  try {
    const { userId, accountNumber, bankCode, fullName, bankName, phoneNumber } = req.body;

    if (!userId || !accountNumber || !bankCode || !fullName || !bankName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId, accountNumber, bankCode, fullName, bankName"
      });
    }

    const bankDetails = {
      accountNumber: accountNumber.trim(),
      bankCode: bankCode.trim(),
      fullName: fullName.trim(),
      bankName: bankName.trim(),
      phoneNumber: phoneNumber?.trim() || null,
      savedAt: new Date()
    };

    const result = await users.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { savedBankAccount: bankDetails } }
    );

    if (result.modifiedCount > 0) {
      res.json({
        success: true,
        message: "Bank account details saved successfully",
        bankDetails
      });
    } else {
      res.status(400).json({ success: false, message: "Failed to save bank details" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ================= GET SAVED BANK ACCOUNT DETAILS =================
router.get("/get-bank-account/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    const user = await users.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!user.savedBankAccount) {
      return res.json({
        success: true,
        bankDetails: null,
        message: "No saved bank account found"
      });
    }

    res.json({
      success: true,
      bankDetails: user.savedBankAccount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ================= UPDATE PASSWORD =================
router.put("/update-password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, current password, and new password are required"
      });
    }

    // Find user by email
    const user = await users.findOne({ email: email.trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Verify current password
    if (user.password !== currentPassword) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // Update password
    const result = await users.updateOne(
      { email: email.trim() },
      { $set: { password: newPassword } }
    );

    if (result.modifiedCount > 0) {
      res.json({
        success: true,
        message: "Password updated successfully"
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Failed to update password"
      });
    }
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


module.exports = router;
