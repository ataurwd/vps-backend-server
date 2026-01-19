const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const router = express.Router();

// Middleware
router.use(express.json());

// MongoDB configuration
const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const productCollection = db.collection("products");
const userCollection = db.collection("userCollection");


(async () => {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
    } catch (err) {
        console.error("MongoDB Connection Error:", err);
    }
})();


router.post("/sell", async (req, res) => {
  try {
    const { products } = req.body;

    // 🔴 STRICT: only array accepted
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        message: "products must be a non-empty array",
      });
    }

    const userEmail = products[0].userEmail;
    if (!userEmail) {
      return res.status(400).json({ message: "userEmail is required" });
    }

    // Required fields (same as your old logic)
    const requiredFields = [
      "category",
      "name",
      "description",
      "price",
      "username",
      "accountPass",
      "userEmail",
      "userAccountName",
    ];

    for (const product of products) {
      for (const field of requiredFields) {
        if (!product[field]) {
          return res.status(400).json({
            message: `${field} is required`,
          });
        }
      }
    }

    // Find user
    const user = await userCollection.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔑 Only 1 credit needed
    if (!user.salesCredit || user.salesCredit <= 0) {
      return res.status(403).json({
        message:
          "Insufficient listing credits. Please purchase more credits.",
      });
    }

    // Deduct ONLY 1 credit
    await userCollection.updateOne(
      { email: userEmail },
      { $inc: { salesCredit: -1 } }
    );

    // 🔥 INSERT ALL PRODUCTS (same title allowed)
    const formattedProducts = products.map((p) => ({
      ...p,
      status: p.status || "pending",
      createdAt: new Date(),
    }));

    const result = await productCollection.insertMany(formattedProducts);

    res.status(201).json({
      acknowledged: true,
      insertedCount: result.insertedCount,
      message: `${result.insertedCount} products added successfully (same title allowed). 1 credit deducted.`,
    });
  } catch (error) {
    console.error("SELL ERROR:", error);
    res.status(500).json({
      message: "Server error while listing products",
    });
  }
});




router.get("/all-sells", async (req, res) => {
    try {
        const allData = await productCollection.find({}).sort({ _id: -1 }).toArray();
        res.status(200).send(allData);
    } catch (error) {
        res.status(500).send({ message: "Error fetching products" });
    }
});

router.patch("/update-status/:id", async (req, res) => {
    const id = req.params.id;
    const { status, rejectReason } = req.body;

    try {
        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid ID format" });
        }

        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
            $set: {
                status: status,
                rejectReason: status === "reject" ? rejectReason : ""
            },
        };

        const result = await productCollection.updateOne(filter, updateDoc);

        if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Product not found" });
        }

        res.status(200).send({ 
            message: "Status updated successfully", 
            success: true,
            modifiedCount: result.modifiedCount 
        });
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).send({ message: "Internal server error" });
    }
});



// DELETE API
router.delete("/delete/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const result = await productCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount > 0) {
            res.status(200).send({ message: "Deleted successfully" });
        } else {
            res.status(404).send({ message: "Not found" });
        }
    } catch (error) {
        res.status(500).send({ message: "Server error" });
    }
});


// GET /product/credit - Fetch user's salesCredit
router.get("/credit", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: "Email query parameter is required" });
    }

    const user = await userCollection.findOne(
      { email: email },
      { projection: { salesCredit: 1, _id: 0 } }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ salesCredit: user.salesCredit || 0 });
  } catch (error) {
    console.error("Error fetching user credit:", error);
    res.status(500).json({ message: "Failed to fetch credits" });
  }
});


module.exports = router;