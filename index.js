const express = require("express");
const dotenv = require("dotenv");
const { connectDB } = require("./config/db");
const app = express();
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { Server } = require("socket.io");
const http = require("http");
const path = require("path");
const cors = require("cors");

const corsOptions = {
  origin: "*",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
    optionSuccessStatus: 200,
  },
});

dotenv.config();
connectDB();
app.get("/", (req, res) => {
  res.send("API IS WORKING");
});

app.use(express.json());
app.use(cors(corsOptions));

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

app.use(notFound);
app.use(errorHandler);

io.on("connection", (socket) => {
  console.log("Connecting to socket.io");

  socket.on("setup", (userData) => {
    socket.join(userData._id);
    socket.emit("connected");
  });

  socket.on("join chat", ({ room, name }) => {
    socket.join(room?._id);
    console.log(name + " joined room : " + room?.chatName);
  });

  socket.on("new message", (newMessageReceived) => {
    var chat = newMessageReceived.chat;

    if (!chat.users) return console.log(chat.users + " not defined");

    chat.users.forEach((user) => {
      if (user._id === newMessageReceived.sender._id) return;
      socket.in(user._id).emit("message received", newMessageReceived);
    });
  });

  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("rename", (room) => {
    room.users.forEach((user) => {
      socket.in(user._id).emit("changeName", room);
    });
  });

  socket.on("disconnect", () => {
    console.log("a user disconnected");
  });
});

if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.send("API RUNNING SUCCESS");
  });
} else {
  app.get("/", (req, res) => {
    res.send({ response: "Server is up and running." }).status(200);
  });
}

server.listen(process.env.PORT || 5000, () => {
  console.log("Server listening ");
});
