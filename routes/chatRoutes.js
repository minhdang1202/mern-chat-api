const { protect } = require("../middleware/authMiddleware");
const Chat = require("../models/chatModel");
const User = require("../models/userModel");

const router = require("express").Router();

//create one chat

router.post("/", protect, async (req, res) => {
  const { userId } = req.body;

  !userId && res.status(404).json("UserId param not sent with request");

  var isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "name pic email",
  });

  if (isChat.length > 0) {
    res.send(isChat[0]);
  } else {
    var chatData = {
      chatName: "Single chat",
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    try {
      const createdChat = await Chat.create(chatData);
      const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        "users",
        "-password"
      );
      res.status(200).json(FullChat);
    } catch (error) {
      res.status(500).json(error.message);
    }
  }
});

//get all chat a user

router.get("/", protect, async (req, res) => {
  try {
    Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 })
      .then(async (results) => {
        results = await User.populate(results, {
          path: "latestMessage.sender",
          select: "name pic email",
        });
        res.status(200).json(results);
      });
  } catch (error) {
    res.status(500).json(error.message);
  }
});

//create group (>2 mem)
router.post("/group", protect, async (req, res) => {
  (!req.body.users || !req.body.name) &&
    res.status(400).json({ message: "Please fill all the fields" });

  var users = JSON.parse(req.body.users);

  users.length < 2 &&
    res.status(400).send("More than 2 users are required to form a group chat");
  users.push(req.user);
  try {
    const groupChat = await Chat.create({
      chatName: req.body.name,
      users: users,
      isGroupChat: true,
      groupAdmin: req.user,
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.status(200).json(fullGroupChat);
  } catch (error) {
    res.status(500).json(error.message);
  }
});

//rename chat
router.put("/rename", protect, async (req, res) => {
  const { chatId, chatName } = req.body;
  try {
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      {
        chatName: chatName,
      },
      {
        new: true,
      }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage", "-password")
      .then(async (results) => {
        results = await User.populate(results, {
          path: "latestMessage.sender",
          select: "name",
        });
        res.status(200).json(results);
      });

    updatedChat
      ? res.status(200).json(updatedChat)
      : res.status(400).json("Chat Not Found");
  } catch (error) {
    res.status(500).json(error.message);
  }
});

//remove user from chat
router.put("/groupremove", protect, async (req, res) => {
  const { chatId, userId } = req.body;

  try {
    const removed = await Chat.findByIdAndUpdate(
      chatId,
      {
        $pull: { users: userId },
      },
      {
        new: true,
      }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    removed
      ? res.status(200).json(removed)
      : res.status(404).json("Chat Not Found");
  } catch (error) {
    res.status(500).json(error.message);
  }
});

//add user to chat
router.put("/groupadd", protect, async (req, res) => {
  const { chatId, userId } = req.body;
  try {
    const added = await Chat.findByIdAndUpdate(
      chatId,
      {
        $push: { users: userId },
      },
      {
        new: true,
      }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    added
      ? res.status(200).json(added)
      : res.status(404).json("Chat Not Found");
  } catch (error) {
    res.status(500).json(error.message);
  }
});

module.exports = router;
