const SHEET_NAME = 'properties';

function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    return json_({ error: `Sheet not found: ${SHEET_NAME}` });
  }

  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return json_({ properties: [] });

  const headers = values[0].map(h => String(h).trim());
  const properties = values.slice(1)
    .filter(row => row.some(cell => String(cell).trim() !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((header, i) => obj[header] = row[i]);
      return obj;
    });

  return json_({ properties });
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
