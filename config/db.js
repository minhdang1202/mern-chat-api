const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connecting successful to : ", conn.connection.name);
  } catch (e) {
    console.log(e.message);
    process.exit();
  }
};

module.exports = { connectDB };
