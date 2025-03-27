const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for customer entries (temporary for free hosting)
const customers = [];

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
    customers.push({ name, email, phone });
    console.log('Customer added to in-memory storage:', { name, email, phone });
    console.log('Total customers:', customers.length);

    res.json({ success: true, name });
  } catch (error) {
    console.error('Failed to save data:', error);
    return res.status(500).json({ success: false, error: 'Failed to save data' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
