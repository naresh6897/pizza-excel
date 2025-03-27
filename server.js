const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = 'mongodb+srv://your-username:your-password@cluster0.mongodb.net/pizza-excel?retryWrites=true&w=majority'; // Replace with your MongoDB URI

app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const client = new MongoClient(MONGO_URI);

async function connectToMongo() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

app.post('/submit', async (req, res) => {
  const { name, email, phone } = req.body;

  console.log('Received submission:', { name, email, phone });

  if (!name || !email || !phone) {
    console.log('Validation failed: Missing required fields');
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  if (!/^\d{10}$/.test(phone)) {
    console.log('Validation failed: Invalid phone number');
    return res.status(400).json({ success: false, error: 'Invalid phone number (10 digits required)' });
  }

  try {
    const db = client.db('pizza-excel');
    const collection = db.collection('customers');
    await collection.insertOne({ name, email, phone });
    console.log('Customer added to MongoDB:', { name, email, phone });

    res.json({ success: true, name });
  } catch (error) {
    console.error('Failed to save to MongoDB:', error);
    return res.status(500).json({ success: false, error: 'Failed to save data' });
  }
});

(async () => {
  await connectToMongo();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
})();
