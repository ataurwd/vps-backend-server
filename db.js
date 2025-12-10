// db.js
require("dotenv").config();
const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI missing in .env");
  process.exit(1);
}

const client = new MongoClient(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let paymentsCollection = null;

async function connectOnce() {
  if (!paymentsCollection) {
    await client.connect();
    const db = client.db("mydb");
    paymentsCollection = db.collection("payments");
    // Optionally create indexes
    await paymentsCollection.createIndex({ tx_ref: 1 }, { unique: false }).catch(()=>{});
    await paymentsCollection.createIndex({ reference: 1 }, { unique: false }).catch(()=>{});
    console.log("Connected to MongoDB and collection ready.");
  }
  return paymentsCollection;
}

module.exports = {
  getPaymentsCollection: connectOnce,
  mongoClient: client,
};
