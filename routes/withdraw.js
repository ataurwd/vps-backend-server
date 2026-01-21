// const express = require("express");
// const { MongoClient, ObjectId } = require("mongodb");

// const router = express.Router();

// // MongoDB connection URI from environment variables
// const MONGO_URI = process.env.MONGO_URI;

// if (!MONGO_URI) {
//     throw new Error("Please define the MONGO_URI environment variable.");
// }

// // Create MongoDB client
// const client = new MongoClient(MONGO_URI);

// // Database and collection references
// let cartCollection; // We'll assign this after successful connection

// // Connect to MongoDB once when the module loads
// (async () => {
//     try {
//         await client.connect();

//         const db = client.db("mydb");
//         cartCollection = db.collection("withdraw"); 
//         userCollection = db.collection("userCollection");
//         withdrawalCollection = db.collection("withdraw");
//     } catch (error) {
//         console.error("Failed to connect to MongoDB:", error);
//         process.exit(1); // Exit if connection fails
//     }
// })();

// // POST: Create a new withdrawal request
// // Endpoint: POST /withdraw/post
// router.post("/post", async (req, res) => {
//   try {
//     const {
//       userId,
//       paymentMethod,     // "kora" | "flutterwave"
//       amount,
//       currency = "NGN",
//       accountNumber,
//       bankCode,
//       fullName,
//       phoneNumber,
//       email,
//       note
//     } = req.body;

//     // Validation
//     if (!userId || !amount || !paymentMethod || !accountNumber || !bankCode || !fullName) {
//       return res.status(400).json({
//         message: "Missing required fields: userId, amount, paymentMethod, accountNumber, bankCode, fullName"
//       });
//     }

//     const withdrawAmount = Number(amount);
//     if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
//       return res.status(400).json({ message: "Amount must be a positive number" });
//     }

//     // Find user
//     const userObjectId = new ObjectId(userId);
//     const user = await userCollection.findOne({ _id: userObjectId });

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const currentBalance = Number(user.balance || 0);

//     // Check sufficient balance
//     if (currentBalance < withdrawAmount) {
//       return res.status(400).json({
//         message: "Insufficient balance",
//         available: currentBalance,
//         requested: withdrawAmount
//       });
//     }

//     // Use transaction for safety (balance deduct + request create)
//     const session = client.startSession();
//     try {
//       await session.withTransaction(async () => {
//         // 1. Deduct amount from user's balance
//         const updateResult = await userCollection.updateOne(
//           { _id: userObjectId },
//           { $inc: { balance: -withdrawAmount } },
//           { session }
//         );

//         if (updateResult.modifiedCount === 0) {
//           throw new Error("Failed to update user balance");
//         }

//         // 2. Create withdrawal request
//         const insertResult = await withdrawalCollection.insertOne({
//           userId: userObjectId,
//           userEmail: user.email,
//           paymentMethod,
//           amount: withdrawAmount.toString(), // frontend string চায়
//           currency,
//           accountNumber,
//           bankCode,
//           fullName,
//           phoneNumber: phoneNumber || null,
//           email: email || user.email,
//           note: note || "",
//           status: "pending",
//           adminNote: "",
//           createdAt: new Date(),
//           updatedAt: new Date()
//         }, { session });

//         // Success response
//         res.status(201).json({
//           success: true,
//           message: "Withdrawal request submitted successfully. Amount deducted from balance.",
//           withdrawalId: insertResult.insertedId.toString(),
//           deductedAmount: withdrawAmount,
//           newBalance: currentBalance - withdrawAmount
//         });
//       });
//     } finally {
//       await session.endSession();
//     }

//   } catch (error) {
//     console.error("Withdrawal submission error:", error);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// });

// // PUT: Approve a withdrawal by ID
// // Endpoint: PUT /withdraw/approve/:id
// router.put("/approve/:id", async (req, res) => {
//     try {
//         if (!cartCollection) {
//             return res.status(503).send({ message: "Database not ready yet." });
//         }

//         const { id } = req.params;

//         // Validate ObjectId format
//         if (!ObjectId.isValid(id)) {
//             return res.status(400).send({ message: "Invalid withdrawal ID format." });
//         }

//         const result = await cartCollection.updateOne(
//             { _id: new ObjectId(id) },
//             {
//                 $set: {
//                     status: "approved",
//                     approvedAt: new Date(),
//                 },
//             }
//         );

//         if (result.matchedCount === 0) {
//             return res.status(404).send({ message: "Withdrawal request not found." });
//         }

//         res.status(200).send({
//             success: true,
//             modifiedCount: result.modifiedCount,
//             message: "Withdrawal approved successfully.",
//         });
//     } catch (error) {
//         console.error("Update Error:", error);
//         res.status(500).send({ message: "Internal Server Error" });
//     }
// });

// // GET: Get all withdrawal requests (for admin)
// // Endpoint: GET /withdraw/getall
// router.get("/getall", async (req, res) => {
//     try {
//         if (!cartCollection) {
//             return res.status(503).send({ message: "Database not ready yet." });
//         }

//         const withdrawals = await cartCollection
//             .find({})
//             .sort({ createdAt: -1 }) // Latest first
//             .toArray();

//         res.status(200).send(withdrawals);
//     } catch (error) {
//         console.error("Fetch Error:", error);
//         res.status(500).send({ message: "Failed to fetch withdrawals." });
//     }
// });

// router.get("/get/:id", async (req, res) => {
//     try {
//         if (!cartCollection) return res.status(503).send({ message: "DB not ready" });

//         const { id } = req.params;

//         if (!ObjectId.isValid(id)) {
//             return res.status(400).send({ message: "Invalid withdrawal ID format" });
//         }

//         const withdrawal = await cartCollection.findOne({ _id: new ObjectId(id) });

//         if (!withdrawal) {
//             return res.status(404).send({ message: "Withdrawal not found" });
//         }

//         res.status(200).send(withdrawal);
//     } catch (error) {
//         console.error("Fetch Single Error:", error);
//         res.status(500).send({ message: "Server error" });
//     }
// });
// module.exports = router;





// const express = require("express");
// const { MongoClient, ObjectId } = require("mongodb");

// const router = express.Router();

// // MongoDB connection URI from environment variables
// const MONGO_URI = process.env.MONGO_URI;

// if (!MONGO_URI) {
//     throw new Error("Please define the MONGO_URI environment variable.");
// }

// // Create MongoDB client
// const client = new MongoClient(MONGO_URI);

// // Database and collection references
// let cartCollection; // We'll assign this after successful connection
// let userCollection;
// let withdrawalCollection;
// let notificationCollection;

// // Connect to MongoDB once when the module loads
// (async () => {
//     try {
//         await client.connect();

//         const db = client.db("mydb");
//         cartCollection = db.collection("withdraw"); 
//         userCollection = db.collection("userCollection");
//         withdrawalCollection = db.collection("withdraw");
//         notificationCollection = db.collection("notifiCollection");
//     } catch (error) {
//         console.error("Failed to connect to MongoDB:", error);
//         process.exit(1); // Exit if connection fails
//     }
// })();

// // POST: Create a new withdrawal request
// // Endpoint: POST /withdraw/post
// router.post("/post", async (req, res) => {
//   try {
//     const {
//       userId,
//       paymentMethod,     // "kora" | "flutterwave"
//       amount,
//       currency = "NGN",
//       accountNumber,
//       bankCode,
//       fullName,
//       phoneNumber,
//       email,
//       note
//     } = req.body;

//     // Validation
//     if (!userId || !amount || !paymentMethod || !accountNumber || !bankCode || !fullName) {
//       return res.status(400).json({
//         message: "Missing required fields: userId, amount, paymentMethod, accountNumber, bankCode, fullName"
//       });
//     }

//     const withdrawAmount = Number(amount);
//     if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
//       return res.status(400).json({ message: "Amount must be a positive number" });
//     }

//     // Find user
//     const userObjectId = new ObjectId(userId);
//     const user = await userCollection.findOne({ _id: userObjectId });

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const currentBalance = Number(user.balance || 0);

//     // Check sufficient balance
//     if (currentBalance < withdrawAmount) {
//       return res.status(400).json({
//         message: "Insufficient balance",
//         available: currentBalance,
//         requested: withdrawAmount
//       });
//     }

//     // Use transaction for safety (balance deduct + request create)
//     const session = client.startSession();
//     try {
//       await session.withTransaction(async () => {
//         // 1. Deduct amount from user's balance
//         const updateResult = await userCollection.updateOne(
//           { _id: userObjectId },
//           { $inc: { balance: -withdrawAmount } },
//           { session }
//         );

//         if (updateResult.modifiedCount === 0) {
//           throw new Error("Failed to update user balance");
//         }

//         // 2. Create withdrawal request
//         const insertResult = await withdrawalCollection.insertOne({
//           userId: userObjectId,
//           userEmail: user.email,
//           paymentMethod,
//           amount: withdrawAmount.toString(), // frontend string চায়
//           currency,
//           accountNumber,
//           bankCode,
//           fullName,
//           phoneNumber: phoneNumber || null,
//           email: email || user.email,
//           note: note || "",
//           status: "pending",
//           adminNote: "",
//           createdAt: new Date(),
//           updatedAt: new Date()
//         }, { session });

//         // Success response
//         res.status(201).json({
//           success: true,
//           message: "Withdrawal request submitted successfully. Amount deducted from balance.",
//           withdrawalId: insertResult.insertedId.toString(),
//           deductedAmount: withdrawAmount,
//           newBalance: currentBalance - withdrawAmount
//         });
//       });
//     } finally {
//       await session.endSession();
//     }

//   } catch (error) {
//     console.error("Withdrawal submission error:", error);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// });

// // PUT: Approve a withdrawal by ID
// // Endpoint: PUT /withdraw/approve/:id
// router.put("/approve/:id", async (req, res) => {
//     try {
//         if (!cartCollection) {
//             return res.status(503).send({ message: "Database not ready yet." });
//         }

//         const { id } = req.params;

//         // Validate ObjectId format
//         if (!ObjectId.isValid(id)) {
//             return res.status(400).send({ message: "Invalid withdrawal ID format." });
//         }

//         const result = await cartCollection.updateOne(
//             { _id: new ObjectId(id) },
//             {
//                 $set: {
//                     status: "approved",
//                     approvedAt: new Date(),
//                 },
//             }
//         );

//         if (result.matchedCount === 0) {
//             return res.status(404).send({ message: "Withdrawal request not found." });
//         }

//         res.status(200).send({
//             success: true,
//             modifiedCount: result.modifiedCount,
//             message: "Withdrawal approved successfully.",
//         });
//     } catch (error) {
//         console.error("Update Error:", error);
//         res.status(500).send({ message: "Internal Server Error" });
//     }
// });

// // PUT: Decline a withdrawal request with reason and refund
// // Endpoint: PUT /withdraw/decline/:id
// router.put("/decline/:id", async (req, res) => {
//   try {
//     if (!cartCollection) {
//       return res.status(503).send({ message: "Database not ready yet." });
//     }

//     const { id } = req.params;
//     const { reason } = req.body;

//     if (!ObjectId.isValid(id)) {
//       return res.status(400).send({ message: "Invalid withdrawal ID format." });
//     }

//     const withdrawal = await cartCollection.findOne({ _id: new ObjectId(id) });
//     if (!withdrawal) return res.status(404).send({ message: "Withdrawal request not found." });

//     // Parse amount (stored as string in some places)
//     const amt = Number(withdrawal.amount || 0);

//     // Update withdrawal status and admin note
//     const updateRes = await cartCollection.updateOne(
//       { _id: new ObjectId(id) },
//       { $set: { status: "declined", adminNote: reason || "", updatedAt: new Date() } }
//     );

//     if (updateRes.matchedCount === 0) {
//       return res.status(404).send({ message: "Withdrawal request not found when updating." });
//     }

//     // Refund user balance if userId exists
//     try {
//       if (withdrawal.userId) {
//         const userIdObj = typeof withdrawal.userId === 'string' ? new ObjectId(withdrawal.userId) : withdrawal.userId;
//         await userCollection.updateOne({ _id: userIdObj }, { $inc: { balance: amt } });
//       }
//     } catch (e) {
//       console.error('Refund error:', e);
//     }

//     // Create a notification for the user explaining the decline
//     try {
//       if (notificationCollection) {
//         await notificationCollection.insertOne({
//           userEmail: withdrawal.email || withdrawal.userEmail || "",
//           title: "Withdrawal Declined",
//           message: reason || "Your withdrawal request was declined.",
//           type: "withdrawal",
//           relatedId: id,
//           read: false,
//           createdAt: new Date(),
//         });
//       }
//     } catch (e) {
//       console.error('Notification insert error:', e);
//     }

//     res.status(200).send({ success: true, message: "Withdrawal declined and user refunded." });
//   } catch (error) {
//     console.error("Decline Error:", error);
//     res.status(500).send({ message: "Internal Server Error" });
//   }
// });

// // GET: Get all withdrawal requests (for admin)
// // Endpoint: GET /withdraw/getall
// router.get("/getall", async (req, res) => {
//     try {
//         if (!cartCollection) {
//             return res.status(503).send({ message: "Database not ready yet." });
//         }

//         const withdrawals = await cartCollection
//             .find({})
//             .sort({ createdAt: -1 }) // Latest first
//             .toArray();

//         res.status(200).send(withdrawals);
//     } catch (error) {
//         console.error("Fetch Error:", error);
//         res.status(500).send({ message: "Failed to fetch withdrawals." });
//     }
// });

// router.get("/get/:id", async (req, res) => {
//     try {
//         if (!cartCollection) return res.status(503).send({ message: "DB not ready" });

//         const { id } = req.params;

//         if (!ObjectId.isValid(id)) {
//             return res.status(400).send({ message: "Invalid withdrawal ID format" });
//         }

//         const withdrawal = await cartCollection.findOne({ _id: new ObjectId(id) });

//         if (!withdrawal) {
//             return res.status(404).send({ message: "Withdrawal not found" });
//         }

//         res.status(200).send(withdrawal);
//     } catch (error) {
//         console.error("Fetch Single Error:", error);
//         res.status(500).send({ message: "Server error" });
//     }
// });
// module.exports = router;





const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const router = express.Router();

// MongoDB connection URI from environment variables
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    throw new Error("Please define the MONGO_URI environment variable.");
}

// Create MongoDB client
const client = new MongoClient(MONGO_URI);

// Database and collection references
let cartCollection; // We'll assign this after successful connection
let userCollection;
let withdrawalCollection;
let notificationCollection;
let db;
// Connect to MongoDB once when the module loads
(async () => {
    try {
        await client.connect();

        // const db = client.db("mydb");
        db = client.db("mydb");
        cartCollection = db.collection("withdraw"); 
        userCollection = db.collection("userCollection");
        withdrawalCollection = db.collection("withdraw");
        notificationCollection = db.collection("notifiCollection");
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        process.exit(1); // Exit if connection fails
    }
})();

// POST: Create a new withdrawal request
// Endpoint: POST /withdraw/post
router.post("/post", async (req, res) => {
  try {
    const {
      userId,
      paymentMethod,     // "kora" | "flutterwave" | "localbank"
      amount,
      currency = "NGN",
      accountNumber,
      bankCode,
      fullName,
      phoneNumber,
      email,
      note,
      bankName
    } = req.body;

    // Validation
    if (!userId || !amount || !paymentMethod || !accountNumber || !bankCode || !fullName) {
      return res.status(400).json({
        message: "Missing required fields: userId, amount, paymentMethod, accountNumber, bankCode, fullName"
      });
    }

    const withdrawAmount = Number(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }

    // Find user
    const userObjectId = new ObjectId(userId);
    const user = await userCollection.findOne({ _id: userObjectId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentBalance = Number(user.balance || 0);

    // Check sufficient balance
    if (currentBalance < withdrawAmount) {
      return res.status(400).json({
        message: "Insufficient balance",
        available: currentBalance,
        requested: withdrawAmount
      });
    }

    // Use transaction for safety (balance deduct + request create)
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        // 1. Deduct amount from user's balance
        const updateResult = await userCollection.updateOne(
          { _id: userObjectId },
          { $inc: { balance: -withdrawAmount } },
          { session }
        );

        if (updateResult.modifiedCount === 0) {
          throw new Error("Failed to update user balance");
        }

        // 2. Create withdrawal request and compute fee/net using settings
        const settingsCol = db.collection("settings");
        const settingsDoc = await settingsCol.findOne({ _id: "config" });
        const rate = (settingsDoc && settingsDoc.sellerWithdrawalRate) ? Number(settingsDoc.sellerWithdrawalRate) : 0;
        const feeAmount = Number(((withdrawAmount * rate) / 100).toFixed(2));
        const netAmount = Number((withdrawAmount - feeAmount).toFixed(2));

        const insertResult = await withdrawalCollection.insertOne({
          userId: userObjectId,
          userEmail: user.email,
          paymentMethod,
          amount: withdrawAmount.toString(), // requested amount
          fee: feeAmount.toString(),
          netAmount: netAmount.toString(),
          feeRate: rate,
          currency,
          accountNumber,
          bankCode,
          fullName,
          bankName: bankName || null,
          phoneNumber: phoneNumber || null,
          email: email || user.email,
          note: note || "",
          status: "pending",
          adminNote: "",
          createdAt: new Date(),
          updatedAt: new Date()
        }, { session });

        // Success response
        res.status(201).json({
          success: true,
          message: "Withdrawal request submitted successfully. Amount deducted from balance.",
          withdrawalId: insertResult.insertedId.toString(),
          deductedAmount: withdrawAmount,
          newBalance: currentBalance - withdrawAmount
        });
      });
    } finally {
      await session.endSession();
    }

  } catch (error) {
    console.error("Withdrawal submission error:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// PUT: Approve a withdrawal by ID
// Endpoint: PUT /withdraw/approve/:id
router.put("/approve/:id", async (req, res) => {
    try {
        if (!cartCollection) {
            return res.status(503).send({ message: "Database not ready yet." });
        }

        const { id } = req.params;

        // Validate ObjectId format
        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid withdrawal ID format." });
        }

        const result = await cartCollection.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    status: "approved",
                    approvedAt: new Date(),
                },
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Withdrawal request not found." });
        }

        res.status(200).send({
            success: true,
            modifiedCount: result.modifiedCount,
            message: "Withdrawal approved successfully.",
        });
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
});

// PUT: Decline a withdrawal request with reason and refund
// Endpoint: PUT /withdraw/decline/:id
router.put("/decline/:id", async (req, res) => {
  try {
    if (!cartCollection) {
      return res.status(503).send({ message: "Database not ready yet." });
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid withdrawal ID format." });
    }

    const withdrawal = await cartCollection.findOne({ _id: new ObjectId(id) });
    if (!withdrawal) return res.status(404).send({ message: "Withdrawal request not found." });

    // Parse amount (stored as string in some places)
    const amt = Number(withdrawal.amount || 0);

    // Update withdrawal status and admin note
    const updateRes = await cartCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "declined", adminNote: reason || "", updatedAt: new Date() } }
    );

    if (updateRes.matchedCount === 0) {
      return res.status(404).send({ message: "Withdrawal request not found when updating." });
    }

    // Refund user balance if userId exists
    try {
      if (withdrawal.userId) {
        const userIdObj = typeof withdrawal.userId === 'string' ? new ObjectId(withdrawal.userId) : withdrawal.userId;
        await userCollection.updateOne({ _id: userIdObj }, { $inc: { balance: amt } });
      }
    } catch (e) {
      console.error('Refund error:', e);
    }

    // Create a notification for the user explaining the decline
    try {
      if (notificationCollection) {
        await notificationCollection.insertOne({
          userEmail: withdrawal.email || withdrawal.userEmail || "",
          title: "Withdrawal Declined",
          message: reason || "Your withdrawal request was declined.",
          type: "withdrawal",
          relatedId: id,
          read: false,
          createdAt: new Date(),
        });
      }
    } catch (e) {
      console.error('Notification insert error:', e);
    }

    res.status(200).send({ success: true, message: "Withdrawal declined and user refunded." });
  } catch (error) {
    console.error("Decline Error:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

// GET: Get all withdrawal requests (for admin)
// Endpoint: GET /withdraw/getall
router.get("/getall", async (req, res) => {
    try {
        if (!cartCollection) {
            return res.status(503).send({ message: "Database not ready yet." });
        }

        const withdrawals = await cartCollection
            .find({})
            .sort({ createdAt: -1 }) // Latest first
            .toArray();

        res.status(200).send(withdrawals);
    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).send({ message: "Failed to fetch withdrawals." });
    }
});

router.get("/get/:id", async (req, res) => {
    try {
        if (!cartCollection) return res.status(503).send({ message: "DB not ready" });

        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid withdrawal ID format" });
        }

        const withdrawal = await cartCollection.findOne({ _id: new ObjectId(id) });

        if (!withdrawal) {
            return res.status(404).send({ message: "Withdrawal not found" });
        }

        res.status(200).send(withdrawal);
    } catch (error) {
        console.error("Fetch Single Error:", error);
        res.status(500).send({ message: "Server error" });
    }
});
module.exports = router;