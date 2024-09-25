const mongoose = require('mongoose')
const colors = require('colors')

const connectDB = async () => {
  let retries = 15;
  while (retries) {
    try {
      await mongoose.connect(process.env.MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('MongoDB connected successfully.'.bgGreen.white);
      break;
    } catch (error) {
      console.error(`MongoDB connection error: ${error.message}`.bgRed.white);
      retries -= 1;
      console.log(`Retries left: ${retries}`);
      // Wait for 5 seconds before retrying
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

  
  module.exports = connectDB;
