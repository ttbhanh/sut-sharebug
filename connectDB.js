const mongoose = require("mongoose");
require("dotenv").config();
const connectionString =
  process.env.MONGODB_CONNECTION_STRING || "mongodb://127.0.0.1:27017/sharebug";
const connectDB = async () => {
  try {
    await mongoose.connect(connectionString, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
