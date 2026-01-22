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

    // Check if user has enough credits (1 credit per product)
    const creditsNeeded = products.length;
    if (!user.salesCredit || user.salesCredit < creditsNeeded) {
      return res.status(403).json({
        message:
          `Insufficient listing credits. You need ${creditsNeeded} credit(s) but only have ${user.salesCredit || 0}. Please purchase more credits.`,
      });
    }

    // Deduct credits equal to number of products
    await userCollection.updateOne(
      { email: userEmail },
      { $inc: { salesCredit: -creditsNeeded } }
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
      message: `${result.insertedCount} product(s) added successfully. ${creditsNeeded} credit(s) deducted.`,
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

// GET /product/credit - Fetch user's salesCredit (MUST come before /:id route)
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

// GET SINGLE PRODUCT BY ID
router.get("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }
        const product = await productCollection.findOne({ _id: new ObjectId(id) });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ message: "Error fetching product" });
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


// UPDATE PRODUCT DETAILS (for resubmitting denied ads)
router.patch("/update/:id", async (req, res) => {
    const id = req.params.id;
    const { username, accountPass, email, password, previewLink, additionalInfo, status } = req.body;

    try {
        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: "Invalid ID format" });
        }

        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
            $set: {
                username: username || undefined,
                accountPass: accountPass || undefined,
                email: email || undefined,
                password: password || undefined,
                previewLink: previewLink || undefined,
                additionalInfo: additionalInfo || undefined,
                status: status || "pending",
                rejectReason: "", // Clear rejection reason on resubmit
                updatedAt: new Date() // Add timestamp to show as recent
            },
        };

        // Remove undefined fields
        Object.keys(updateDoc.$set).forEach(key => 
            updateDoc.$set[key] === undefined && delete updateDoc.$set[key]
        );

        const result = await productCollection.updateOne(filter, updateDoc);

        if (result.matchedCount === 0) {
            return res.status(404).send({ message: "Product not found" });
        }

        res.status(200).send({ 
            message: "Product updated successfully", 
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

// TOGGLE PRODUCT VISIBILITY
router.patch("/toggle-visibility/:id", async (req, res) => {
    const id = req.params.id;
    const { isVisible } = req.body;

    try {
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        if (typeof isVisible !== 'boolean') {
            return res.status(400).json({ message: "isVisible must be a boolean" });
        }

        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
            $set: {
                isVisible: isVisible,
                updatedAt: new Date()
            },
        };

        const result = await productCollection.updateOne(filter, updateDoc);

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json({ 
            message: isVisible ? "Product visibility enabled" : "Product visibility disabled",
            success: true,
            modifiedCount: result.modifiedCount 
        });
    } catch (error) {
        console.error("Toggle visibility error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// TOGGLE ALL PRODUCTS VISIBILITY BY USER EMAIL
router.patch("/toggle-all-visibility", async (req, res) => {
    const { userEmail, isVisible } = req.body;

    try {
        if (!userEmail) {
            return res.status(400).json({ message: "userEmail is required" });
        }

        if (typeof isVisible !== 'boolean') {
            return res.status(400).json({ message: "isVisible must be a boolean" });
        }

        const filter = { userEmail: userEmail };
        const updateDoc = {
            $set: {
                isVisible: isVisible,
                updatedAt: new Date()
            },
        };

        const result = await productCollection.updateMany(filter, updateDoc);

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "No products found for this user" });
        }

        res.status(200).json({ 
            message: isVisible ? "All products visibility enabled" : "All products visibility disabled",
            success: true,
            modifiedCount: result.modifiedCount 
        });
    } catch (error) {
        console.error("Toggle all visibility error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET USER PRODUCTS (for listings page)
router.get("/user-products/:email", async (req, res) => {
    const { email } = req.params;

    try {
        if (!email) {
            return res.status(400).json({ message: "User email is required" });
        }

        const products = await productCollection.find({ userEmail: email }).sort({ _id: -1 }).toArray();

        res.status(200).json({
            success: true,
            products: products
        });
    } catch (error) {
        console.error("Error fetching user products:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


module.exports = router;




// const express = require("express");
// const { MongoClient, ObjectId } = require("mongodb");
// require("dotenv").config();

// const router = express.Router();

// // Middleware
// router.use(express.json());

// // MongoDB configuration
// const MONGO_URI = process.env.MONGO_URI;
// const client = new MongoClient(MONGO_URI);
// const db = client.db("mydb");
// const productCollection = db.collection("products");
// const userCollection = db.collection("userCollection");


// (async () => {
//     try {
//         await client.connect();
//         console.log("Connected to MongoDB");
//     } catch (err) {
//         console.error("MongoDB Connection Error:", err);
//     }
// })();


// router.post("/sell", async (req, res) => {
//   try {
//     const { products } = req.body;

//     // 🔴 STRICT: only array accepted
//     if (!Array.isArray(products) || products.length === 0) {
//       return res.status(400).json({
//         message: "products must be a non-empty array",
//       });
//     }

//     const userEmail = products[0].userEmail;
//     if (!userEmail) {
//       return res.status(400).json({ message: "userEmail is required" });
//     }

//     // Required fields (same as your old logic)
//     const requiredFields = [
//       "category",
//       "name",
//       "description",
//       "price",
//       "username",
//       "accountPass",
//       "userEmail",
//       "userAccountName",
//     ];

//     for (const product of products) {
//       for (const field of requiredFields) {
//         if (!product[field]) {
//           return res.status(400).json({
//             message: `${field} is required`,
//           });
//         }
//       }
//     }

//     // Find user
//     const user = await userCollection.findOne({ email: userEmail });
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Check if user has enough credits (1 credit per product)
//     const creditsNeeded = products.length;
//     if (!user.salesCredit || user.salesCredit < creditsNeeded) {
//       return res.status(403).json({
//         message:
//           `Insufficient listing credits. You need ${creditsNeeded} credit(s) but only have ${user.salesCredit || 0}. Please purchase more credits.`,
//       });
//     }

//     // Deduct credits equal to number of products
//     await userCollection.updateOne(
//       { email: userEmail },
//       { $inc: { salesCredit: -creditsNeeded } }
//     );

//     // 🔥 INSERT ALL PRODUCTS (same title allowed)
//     const formattedProducts = products.map((p) => ({
//       ...p,
//       status: p.status || "pending",
//       createdAt: new Date(),
//     }));

//     const result = await productCollection.insertMany(formattedProducts);

//     res.status(201).json({
//       acknowledged: true,
//       insertedCount: result.insertedCount,
//       message: `${result.insertedCount} product(s) added successfully. ${creditsNeeded} credit(s) deducted.`,
//     });
//   } catch (error) {
//     console.error("SELL ERROR:", error);
//     res.status(500).json({
//       message: "Server error while listing products",
//     });
//   }
// });




// router.get("/all-sells", async (req, res) => {
//     try {
//         const allData = await productCollection.find({}).sort({ _id: -1 }).toArray();
//         res.status(200).send(allData);
//     } catch (error) {
//         res.status(500).send({ message: "Error fetching products" });
//     }
// });

// router.patch("/update-status/:id", async (req, res) => {
//     const id = req.params.id;
//     const { status, rejectReason } = req.body;

//     try {
//         if (!ObjectId.isValid(id)) {
//             return res.status(400).send({ message: "Invalid ID format" });
//         }

//         const filter = { _id: new ObjectId(id) };
//         const updateDoc = {
//             $set: {
//                 status: status,
//                 rejectReason: status === "reject" ? rejectReason : ""
//             },
//         };

//         const result = await productCollection.updateOne(filter, updateDoc);

//         if (result.matchedCount === 0) {
//             return res.status(404).send({ message: "Product not found" });
//         }

//         res.status(200).send({ 
//             message: "Status updated successfully", 
//             success: true,
//             modifiedCount: result.modifiedCount 
//         });
//     } catch (error) {
//         console.error("Update Error:", error);
//         res.status(500).send({ message: "Internal server error" });
//     }
// });


// // UPDATE PRODUCT DETAILS (for resubmitting denied ads)
// router.patch("/update/:id", async (req, res) => {
//     const id = req.params.id;
//     const { username, accountPass, email, password, previewLink, additionalInfo, status } = req.body;

//     try {
//         if (!ObjectId.isValid(id)) {
//             return res.status(400).send({ message: "Invalid ID format" });
//         }

//         const filter = { _id: new ObjectId(id) };
//         const updateDoc = {
//             $set: {
//                 username: username || undefined,
//                 accountPass: accountPass || undefined,
//                 email: email || undefined,
//                 password: password || undefined,
//                 previewLink: previewLink || undefined,
//                 additionalInfo: additionalInfo || undefined,
//                 status: status || "pending",
//                 rejectReason: "", // Clear rejection reason on resubmit
//                 updatedAt: new Date() // Add timestamp to show as recent
//             },
//         };

//         // Remove undefined fields
//         Object.keys(updateDoc.$set).forEach(key => 
//             updateDoc.$set[key] === undefined && delete updateDoc.$set[key]
//         );

//         const result = await productCollection.updateOne(filter, updateDoc);

//         if (result.matchedCount === 0) {
//             return res.status(404).send({ message: "Product not found" });
//         }

//         res.status(200).send({ 
//             message: "Product updated successfully", 
//             success: true,
//             modifiedCount: result.modifiedCount 
//         });
//     } catch (error) {
//         console.error("Update Error:", error);
//         res.status(500).send({ message: "Internal server error" });
//     }
// });



// // DELETE API
// router.delete("/delete/:id", async (req, res) => {
//     const id = req.params.id;
//     try {
//         const result = await productCollection.deleteOne({ _id: new ObjectId(id) });
//         if (result.deletedCount > 0) {
//             res.status(200).send({ message: "Deleted successfully" });
//         } else {
//             res.status(404).send({ message: "Not found" });
//         }
//     } catch (error) {
//         res.status(500).send({ message: "Server error" });
//     }
// });


// // GET /product/credit - Fetch user's salesCredit
// router.get("/credit", async (req, res) => {
//   try {
//     const { email } = req.query;

//     if (!email) {
//       return res.status(400).json({ message: "Email query parameter is required" });
//     }

//     const user = await userCollection.findOne(
//       { email: email },
//       { projection: { salesCredit: 1, _id: 0 } }
//     );

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     res.json({ salesCredit: user.salesCredit || 0 });
//   } catch (error) {
//     console.error("Error fetching user credit:", error);
//     res.status(500).json({ message: "Failed to fetch credits" });
//   }
// });


// module.exports = router;