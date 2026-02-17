const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");

router.post("/signup", async (req, res) => {
    try {
        const { firstName, lastName, mobile, email, password } = req.body;

        if (!firstName || !lastName || !mobile || !email || !password) {
            return res.status(400).json({ msg: "All fields are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ msg: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({
            firstName,
            lastName,
            mobile,
            email,
            password: hashedPassword
        });

        await user.save(); // 🔥 DO NOT REMOVE

        res.status(201).json({ msg: "Signup successful" });

    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ msg: "Server error" });
    }
});

module.exports = router;
