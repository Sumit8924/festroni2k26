require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const path = require("path");

// 🔹 Cloudinary Upload Routes
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// ================= MIDDLEWARE =================
app.use(cors({
  origin: "*", // later restrict to your frontend domain
  methods: ["GET", "POST", "PUT", "DELETE"],
}));

app.use(express.json());

// 🔹 Cloudinary upload API
app.use("/api/upload", uploadRoutes);

// ================= MONGODB CONNECT =================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// ================= USER MODEL =================
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  mobile: String,
  password: String,
  profileImage: String // ✅ Cloudinary image URL
});

const User = mongoose.model("User", userSchema);

// ================= EMAIL CONFIG =================
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // Direct host is better than 'service: gmail' on Render
  port: 465,              // Port 465 is secure and works on Render
  secure: true,           // Must be true for port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify(err => {
  if (err) console.log("❌ Email error:", err);
  else console.log("✅ Email server ready");
});

// ================= OTP STORE =================
const otpStore = {}; 
// { email: { otp, expires } }

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ==================================================
// 🔐 SIGNUP
// ==================================================
app.post("/api/auth/signup", async (req, res) => {
  const { firstName, lastName, email, mobile, password } = req.body;

  if (!firstName || !lastName || !email || !mobile || !password) {
    return res.status(400).json({ success: false, message: "All fields required" });
  }

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      firstName,
      lastName,
      email,
      mobile,
      password: hashedPassword
    });

    res.status(201).json({ success: true, message: "Signup successful" });
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==================================================
// 🔑 LOGIN
// ==================================================
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ success: false, error: "Email & password required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, error: "Invalid password" });

    res.json({
      success: true,
      name: `${user.firstName} ${user.lastName}`,
      profileImage: user.profileImage || null,
      redirect: "dashboard.html"
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ==================================================
// 📧 SEND OTP
// ==================================================
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.json({ success: false, message: "Email not registered" });

  const otp = generateOTP();
  otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };

  try {
    await transporter.sendMail({
      from: `"FESTRONIX Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP is ${otp}. Valid for 5 minutes.`
    });

    res.json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    console.error("❌ OTP error:", err);
    res.status(500).json({ success: false, message: "OTP send failed" });
  }
});

// ==================================================
// ✅ VERIFY OTP
// ==================================================
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (!otpStore[email]) return res.json({ success: false, message: "OTP not found" });
  if (Date.now() > otpStore[email].expires) {
    delete otpStore[email];
    return res.json({ success: false, message: "OTP expired" });
  }
  if (otpStore[email].otp !== otp) return res.json({ success: false, message: "Invalid OTP" });

  res.json({ success: true, message: "OTP verified" });
});

// ==================================================
// 🔁 RESET PASSWORD
// ==================================================
app.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) return res.json({ success: false, message: "Missing data" });

  try {
    const hashed = await bcrypt.hash(newPassword, 10);

    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });

    user.password = hashed;
    await user.save();
    delete otpStore[email];

    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    console.error("❌ Reset error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==================================================
// 🔹 SERVE FRONTEND
// ==================================================

// Go up two levels to the root, then into 'public'
const frontendPath = path.join(__dirname, "../../public");

app.use(express.static(frontendPath));

// Catch-all for any unknown route: serve index.html
app.use((req, res, next) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ================= SERVER START =================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
