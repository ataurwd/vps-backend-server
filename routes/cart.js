const express = require("express");
const { MongoClient, ObjectId } = require("mongodb"); // ObjectId এখানে ইমপোর্ট করা হলো

const router = express.Router();

const MONGO_URI = process.env.MONGO_URI;

// Mongo DB Connection
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const cartCollectoin = db.collection("cart");

// Connect to DB
(async () => {
    try {
        await client.connect();
    } catch (err) {
        console.error("DB Connection Error:", err);
    }
})();


// 1. ADD TO CART (With Duplicate Check)
// endpoint: /cart/post
router.post("/post", async (req, res) => {
    try {
        const data = req.body;

        // চেক করা হচ্ছে এই ইউজারের কার্টে প্রোডাক্টটি অলরেডি আছে কি না
        const query = { 
            UserEmail: data.UserEmail, 
            productId: data.productId 
        };

        const existingItem = await cartCollectoin.findOne(query);

        // যদি থাকে, তাহলে অ্যাড না করে মেসেজ পাঠানো হবে
        if (existingItem) {
            return res.send({ message: "Item already exists", insertedId: null });
        }

        // না থাকলে নতুন করে অ্যাড করা হবে
        const result = await cartCollectoin.insertOne(data);
        res.send(result);
        
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Error adding to cart" });
    }
});


// 2. GET USER'S CART (Load cart by Email)
// endpoint: /cart?email=user@example.com
router.get("/", async (req, res) => {
    try {
        const email = req.query.email;
        let query = {};

        // যদি ইমেইল থাকে, শুধু সেই ইউজারের ডাটা আনবে
        if (email) {
            query = { UserEmail: email };
        }

        const result = await cartCollectoin.find(query).toArray();
        res.status(200).send(result);
    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
});


// 3. DELETE ITEM
// endpoint: /cart/delete/:id
router.delete("/delete/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }; // আইডি অনুযায়ী কোয়েরি
        const result = await cartCollectoin.deleteOne(query);

        if (result.deletedCount === 1) {
            res.status(200).send({ message: "Successfully deleted", success: true });
        } else {
            res.status(404).send({ message: "Item not found", success: false });
        }
    } catch (error) {
        res.status(500).send({ message: "Error deleting item", error });
    }
});


// 4. GET ALL (Admin Purpose - Optional)
// endpoint: /cart/getall
router.get("/getall", async (req, res) => {
    try {
        const notifications = await cartCollectoin.find({}).toArray();
        res.status(200).send(notifications);
    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
});

module.exports = router;