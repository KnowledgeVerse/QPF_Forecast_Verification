const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Middleware (React ऐप से रिक्वेस्ट अलाव करने और JSON डेटा पढ़ने के लिए)
app.use(cors());
app.use(express.json({ limit: "50mb" })); // डेटा लिमिट को 50MB तक बढ़ा दिया गया है

// Direct Connection String (Bypasses SRV DNS issues)
const MONGO_URI =
  "mongodb://kvknowledgeverse_db_user:I7iFAWL3J0ll9rNA@ac-buynevo-shard-00-00.i3oojsf.mongodb.net:27017,ac-buynevo-shard-00-01.i3oojsf.mongodb.net:27017,ac-buynevo-shard-00-02.i3oojsf.mongodb.net:27017/QPF_Forecast_Dashboard?ssl=true&replicaSet=atlas-5prbii-shard-0&authSource=admin&retryWrites=true&w=majority";

// MongoDB से कनेक्ट करें
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB Database Connected Successfully! ✅"))
  .catch((err) => console.log("MongoDB Connection Error: ❌", err));

// ----------------------------------------------------
// 1. डेटाबेस का एक स्ट्रक्चर (Schema) और Model बनाएँ
// ----------------------------------------------------
const DataSchema = new mongoose.Schema({
  type: String, // 'Forecast' या 'QPF'
  date: String,
  data: Object, // आपका सारा फॉर्म का डेटा इस Object में सेव होगा
  createdAt: { type: Date, default: Date.now },
});

// Data will be saved in 'QPF_Forecast_Dashboard' database inside 'QPF_Forecast' collection
const HydrometData = mongoose.model("QPF_Forecast", DataSchema, "QPF_Forecast");

// ----------------------------------------------------
// 2. API Routes (डेटा मंगाने और सेव करने के लिए)
// ----------------------------------------------------

// नया डेटा सेव करने के लिए API (POST Request)
app.post("/api/save-data", async (req, res) => {
  try {
    const newData = new HydrometData(req.body);
    await newData.save();
    res.status(201).json({
      success: true,
      message: "Data saved to MongoDB!",
      data: newData,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error saving data", error });
  }
});

// डेटाबेस का सारा डेटा डिलीट करने के लिए API (Danger Zone - Admin Only)
app.delete("/api/clear-data", async (req, res) => {
  try {
    await HydrometData.deleteMany({});
    res.json({
      success: true,
      message: "All database records cleared successfully!",
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error clearing database", error });
  }
});

// डेटाबेस में सेव किया गया सारा डेटा ब्राउज़र पर देखने के लिए API
app.get("/api/view-data", async (req, res) => {
  try {
    const allData = await HydrometData.find().sort({ createdAt: -1 }); // नया डेटा पहले दिखेगा
    res.json({
      total_records: allData.length,
      data: allData,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching data", error });
  }
});

// बेसिक टेस्टिंग के लिए API
app.get("/", (req, res) => {
  res.send("Hydromet Backend is Running Successfully! 🚀");
});

// सर्वर चालू करें
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT} 🚀`));
