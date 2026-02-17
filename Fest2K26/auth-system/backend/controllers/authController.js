const User = require("../models/User");
const bcrypt = require("bcrypt"); // Changed from bcryptjs to bcrypt to match server.js
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// --- EMAIL CONFIG (Moved from server.js) ---
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// --- OTP STORE ---
const otpStore = {}; 
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// 1. SIGNUP
exports.signup = async (req, res) => {
    // Expecting 'mobile' (not phone) and 'profileImage' URL string
    const { firstName, lastName, email, mobile, password, profileImage } = req.body;

    if (!firstName || !lastName || !email || !mobile || !password) {
        return res.status(400).json({ success: false, message: "All fields required" });
    }

    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ success: false, message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);

        user = new User({
            firstName,
            lastName,
            email,
            mobile, // Matched to your Schema
            password: hashedPassword,
            profileImage // Expecting Cloudinary URL string
        });

        await user.save();
        res.status(201).json({ success: true, message: "Signup successful" });
    } catch (err) {
        console.error("Signup Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// 2. LOGIN (With JWT)
exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ success: false, message: "Email & password required" });

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ success: false, message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: "Invalid password" });

        // Create Token
        const token = jwt.sign(
            { id: user._id, email: user.email }, 
            process.env.JWT_SECRET || "fallbacksecret", 
            { expiresIn: "1d" }
        );

        res.json({
            success: true,
            token,
            user: {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                profileImage: user.profileImage
            },
            redirect: "dashboard.html"
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// 3. SEND OTP
exports.sendOTP = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "Email not registered" });

    const otp = generateOTP();
    otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };

    try {
        await transporter.sendMail({
            from: `"FESTRONIX Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Your OTP Code",
            text: `Your OTP is ${otp}. Valid for 5 minutes.`
        });
        res.json({ success: true, message: "OTP sent to email" });
    } catch (err) {
        console.error("OTP Error:", err);
        res.status(500).json({ success: false, message: "OTP send failed" });
    }
};

// 4. VERIFY OTP
exports.verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    if (!otpStore[email]) return res.json({ success: false, message: "OTP not found" });
    if (Date.now() > otpStore[email].expires) {
        delete otpStore[email];
        return res.json({ success: false, message: "OTP expired" });
    }
    if (otpStore[email].otp !== otp) return res.json({ success: false, message: "Invalid OTP" });

    // Mark user as verified if needed
    // await User.findOneAndUpdate({ email }, { isVerified: true });

    res.json({ success: true, message: "OTP verified" });
};