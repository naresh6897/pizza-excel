const express = require('express');
const bodyParser = require('body-parser');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;
const EXCEL_FILE = path.join(__dirname, 'customers.xlsx');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public'

async function initializeExcel() {
  try {
    const exists = await fs.access(EXCEL_FILE).then(() => true).catch(() => false);
    if (!exists) {
      console.log('Creating new Excel file at:', EXCEL_FILE);
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Customers');
      sheet.columns = [
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 15 },
      ];
      await workbook.xlsx.writeFile(EXCEL_FILE);
      const stats = await fs.stat(EXCEL_FILE);
      console.log('Excel file created successfully, size:', stats.size, 'bytes');
    } else {
      const stats = await fs.stat(EXCEL_FILE);
      console.log('Excel file already exists at:', EXCEL_FILE, 'size:', stats.size, 'bytes');
    }
  } catch (error) {
    console.error('Failed to initialize Excel:', error);
    throw error;
  }
}

async function writeWithRetry(workbook, retries = 3, delay = 500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempt ${attempt}: Writing to Excel file...`);
      await workbook.xlsx.writeFile(EXCEL_FILE);
      console.log('Write operation completed');
      return true;
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
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
    console.log('Loading Excel file...');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_FILE);
    const sheet = workbook.getWorksheet('Customers');
    console.log('Current row count before adding:', sheet.rowCount);

    console.log('Adding row with values:', [name, email, phone]);
    const newRow = sheet.addRow([name, email, phone]);
    newRow.commit();

    console.log('Row count after adding:', sheet.rowCount);

    await writeWithRetry(workbook);

    try {
      const buffer = await workbook.xlsx.writeBuffer();
      await fs.writeFile(EXCEL_FILE, buffer);
      console.log('Fallback write using writeBuffer completed');
    } catch (bufferError) {
      console.error('Fallback write failed:', bufferError);
    }

    res.json({ success: true, name });
  } catch (error) {
    console.error('Failed to save to Excel:', error);
    return res.status(500).json({ success: false, error: 'Failed to save data' });
  }
});

(async () => {
  await initializeExcel();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
})();