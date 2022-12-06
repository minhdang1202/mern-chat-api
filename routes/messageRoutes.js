const { protect } = require("../middleware/authMiddleware");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");

const router = require("express").Router();

//get all messages a chat
router.get("/:chatId", protect, async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name pic email")
      .populate("chat");
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json(error.message);
  }
});

//send message
router.post("/", protect, async (req, res) => {
  const { content, chatId } = req.body;

  !content || (!chatId && res.status(400).json("Invalid data "));

  try {
    var message = await Message.create({
      sender: req.user._id,
      content: content,
      chat: chatId,
    });

    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");

    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });

    message = await Message.populate(message, {
      path: "chat.latestMessage",
      select: "sender content",
    });

    message = await User.populate(message, {
      path: "chat.latestMessage.sender",
      select: "name pic email",
    });

    const newChat = await Chat.findByIdAndUpdate(chatId, {
      latestMessage: message,
    });

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json(error.message);
  }
});

module.exports = router;
