const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { google } = require('googleapis');
const ExcelJS = require('exceljs');
const path = require('path');
const stream = require('stream');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Google Drive setup
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });
const fileId = 'YOUR_FILE_ID'; // Replace with the file ID of customers.xlsx
const folderId = '1T1eokYrHzdC3-F84GrUgyYZK9OuX5Kzo'; // Folder ID of Pizza Excel Data

// Function to download the Excel file from Google Drive
async function downloadExcelFile() {
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  const chunks = [];
  for await (const chunk of response.data) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

// Function to upload the updated Excel file to Google Drive
async function uploadExcelFile(workbook) {
  const buffer = await workbook.xlsx.writeBuffer();
  const bufferStream = new stream.PassThrough();
  bufferStream.end(buffer);

  await drive.files.update({
    fileId,
    media: {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: bufferStream,
    },
  });
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
    // Download the existing Excel file
    const workbook = await downloadExcelFile();
    const sheet = workbook.getWorksheet(1);

    // Append the new submission
    sheet.addRow({ name, email, phone });
    console.log('Customer added to Excel:', { name, email, phone });

    // Upload the updated Excel file back to Google Drive
    await uploadExcelFile(workbook);

    res.json({ success: true, name });
  } catch (error) {
    console.error('Failed to update Excel file:', error);
    return res.status(500).json({ success: false, error: 'Failed to save data' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
