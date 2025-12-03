const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 MongoDB connection
const url = "mongodb://admin_ataur:2700418579@72.244.153.23:27017";
const dbName = "ataurdb";
let db;

MongoClient.connect(url)
  .then(async (client) => {
    console.log("Connected to MongoDB");
    db = client.db(dbName);

    // Explicit collection create (only if not exists)
    const collections = await db.listCollections({ name: "posts" }).toArray();
    if (collections.length === 0) {
      await db.createCollection("posts");
      console.log("Collection 'posts' created!");
    } else {
      console.log("Collection 'posts' already exists");
    }
  })
  .catch((err) => console.log("Mongo Error:", err));

// 🔹 Root route
app.get("/", (req, res) => {
  res.send("API is running on VPS!");
});

// 🔹 POST route → save data in 'posts' collection
app.post("/add-post", async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: "Title and Description required" });
    }

    const collection = db.collection("ataurpost");
    const result = await collection.insertOne({
      title,
      description,
      date: new Date(),
    });

    res.json({
      message: "Post saved successfully!",
      data: result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 GET route → get all posts
app.get("/posts", async (req, res) => {
  try {
    const posts = await db.collection("ataurpost").find().toArray();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 GET single post by id
app.get("/posts/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const post = await db.collection("ataurpost").findOne({ _id: new ObjectId(id) });
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
