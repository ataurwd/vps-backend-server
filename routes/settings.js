// const express = require("express");
// const { MongoClient } = require("mongodb");
// require("dotenv").config();

// const router = express.Router();
// router.use(express.json());

// const MONGO_URI = process.env.MONGO_URI;
// const client = new MongoClient(MONGO_URI);
// const db = client.db("mydb");
// const settingsCollection = db.collection("settings");

// (async () => {
//   try {
//     await client.connect();
//     console.log("Connected to MongoDB (settings route)");
//   } catch (err) {
//     console.error("MongoDB Connection Error (settings):", err);
//   }
// })();

// // GET /api/settings  -> returns settings (creates default if missing)
// router.get("/", async (req, res) => {
//   try {
//     let doc = await settingsCollection.findOne({ _id: "config" });
//     if (!doc) {
//       doc = { _id: "config", registrationFee: 15 };
//       await settingsCollection.insertOne(doc);
//     }
//     res.json({ success: true, settings: doc });
//   } catch (err) {
//     console.error("GET /api/settings error:", err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // POST /api/settings -> update settings (body: { registrationFee })
// router.post("/", async (req, res) => {
//   try {
//     const { registrationFee } = req.body;
//     if (registrationFee === undefined || isNaN(Number(registrationFee))) {
//       return res.status(400).json({ success: false, message: "Invalid registrationFee" });
//     }

//     const fee = Number(registrationFee);
//     await settingsCollection.updateOne(
//       { _id: "config" },
//       { $set: { registrationFee: fee } },
//       { upsert: true }
//     );

//     res.json({ success: true, registrationFee: fee });
//   } catch (err) {
//     console.error("POST /api/settings error:", err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// module.exports = router;






const express = require("express");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const router = express.Router();
router.use(express.json());

const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const settingsCollection = db.collection("settings");

(async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB (settings route)");
  } catch (err) {
    console.error("MongoDB Connection Error (settings):", err);
  }
})();

// GET /api/settings  -> returns settings (creates default if missing)
router.get("/", async (req, res) => {
  try {
    let doc = await settingsCollection.findOne({ _id: "config" });
    if (!doc) {
      doc = { _id: "config", registrationFee: 15, buyerDepositRate: 0, sellerWithdrawalRate: 0 };
      await settingsCollection.insertOne(doc);
    }
    res.json({ success: true, settings: doc });
  } catch (err) {
    console.error("GET /api/settings error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/settings -> update settings (body: { registrationFee })
router.post("/", async (req, res) => {
  try {
    const { registrationFee, buyerDepositRate, sellerWithdrawalRate } = req.body;

    const update = {};

    if (registrationFee !== undefined) {
      if (isNaN(Number(registrationFee)) || Number(registrationFee) < 0) {
        return res.status(400).json({ success: false, message: "Invalid registrationFee" });
      }
      update.registrationFee = Number(registrationFee);
    }

    if (buyerDepositRate !== undefined) {
      if (isNaN(Number(buyerDepositRate)) || Number(buyerDepositRate) < 0 || Number(buyerDepositRate) > 100) {
        return res.status(400).json({ success: false, message: "Invalid buyerDepositRate (0-100)" });
      }
      update.buyerDepositRate = Number(buyerDepositRate);
    }

    if (sellerWithdrawalRate !== undefined) {
      if (isNaN(Number(sellerWithdrawalRate)) || Number(sellerWithdrawalRate) < 0 || Number(sellerWithdrawalRate) > 100) {
        return res.status(400).json({ success: false, message: "Invalid sellerWithdrawalRate (0-100)" });
      }
      update.sellerWithdrawalRate = Number(sellerWithdrawalRate);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    await settingsCollection.updateOne(
      { _id: "config" },
      { $set: update },
      { upsert: true }
    );

    const newDoc = await settingsCollection.findOne({ _id: "config" });
    res.json({ success: true, settings: newDoc });
  } catch (err) {
    console.error("POST /api/settings error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;







