const express = require("express");
const { MongoClient } = require("mongodb");

const router = express.Router();

const MONGO_URI = process.env.MONGO_URI;

// Mongo DB
const client = new MongoClient(MONGO_URI);
const db = client.db("mydb");
const notification = db.collection("chatCollecton");

(async () => await client.connect())();



// to post chat data

module.exports = router;
