// routes/notification.js
const express = require("express");
const router = express.Router();

// POST /api/notification/notify
router.post("/notify", async (req, res) => {
  try {
    const notifications = req.app.get("notifications");
    if (!notifications) return res.status(500).json({ error: "Notifications collection not available" });

    const { userId, type = "generic", title, message, data } = req.body;
    if (!userId || !title) return res.status(400).json({ error: "userId and title required" });

    const doc = {
      userId: String(userId),
      type,
      title,
      message: message || "",
      data: data || {},
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const r = await notifications.insertOne(doc);
    res.json({ success: true, insertedId: r.insertedId });
  } catch (err) {
    console.error("POST /api/notification/notify error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/notification/getall
router.get("/getall", async (req, res) => {
  try {
    const notifications = req.app.get("notifications");
    if (!notifications) return res.status(500).json({ error: "Notifications collection not available" });

    // Prefer req.user.id if you have auth. Otherwise accept ?userId=...
    const userId = (req.user && req.user.id) || req.query.userId || req.headers["x-user-id"];
    if (!userId) return res.status(200).json([]); // no user => empty array

    const list = await notifications.find({ userId: String(userId) }).sort({ createdAt: -1 }).toArray();
    res.json(list);
  } catch (err) {
    console.error("GET /api/notification/getall error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
