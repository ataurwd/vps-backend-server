import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

router.post("/create-payment", async (req, res) => {
  const { amount, email, name } = req.body;

  try {
    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      {
        tx_ref: "tx-" + Date.now(),
        amount,
        currency: "USD",
        redirect_url: "https://your-frontend-domain.com/success",
        customer: {
          email,
          name,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    );

    return res.json({
      paymentLink: response.data.data.link,
    });
  } catch (error) {
    return res.status(500).json({ error: "Payment create failed" });
  }
});

export default router;
