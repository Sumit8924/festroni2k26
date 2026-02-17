const express = require("express");
const router = express.Router();
const cloudinary = require("../cloudinary");

// Upload image via URL or base64
router.post("/", async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, message: "Image required" });
    }

    const result = await cloudinary.uploader.upload(image, {
      folder: "festronix",
    });

    res.json({
      success: true,
      imageUrl: result.secure_url,
      public_id: result.public_id,
    });

  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

module.exports = router;
