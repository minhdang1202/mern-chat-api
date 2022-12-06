const router = require("express").Router();
const bcrypt = require("bcryptjs");
const generateToken = require("../config/generateToken");
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/userModel");

router.post("/", async (req, res) => {
  const { name, email, password, pic } = req.body;

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  try {
    if (!name || !email || !password) {
      res.status(400).json("Please Enter all the fields");
    }
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json("User already exists");
    }

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      pic,
    });

    const user = await newUser.save();
    res.status(200).json({ ...user._doc, token: generateToken(user._id) });
  } catch (e) {
    res.status(500).json(e.message);
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.status(200).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        pic: user.pic,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json("Invalid Email or Password");
    }
  } catch (e) {
    res.status(500).json(e.message);
  }
});

//get all users or search user
router.get("/", protect, async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};
  try {
    const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json(error.message);
  }
});

module.exports = router;
