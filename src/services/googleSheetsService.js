const { google } = require('googleapis');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

async function getAuthClient() {
    const auth = new google.auth.GoogleAuth({
        scopes: SCOPES,
    });
    return auth.getClient();
}

/**
 * Updates a Google Sheet tab specifically "homologação" (or provided sheetName)
 * @param {string} spreadsheetId 
 * @param {string} sheetName 
 * @param {Array<Array<string>>} values 
 */
async function updateSheet(spreadsheetId, sheetName, values) {
    try {
        const auth = await getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });

        // Clear existing content
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: sheetName,
        });

        // Update with new content
        const resource = {
            values,
        };

        const result = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1`,
            valueInputOption: 'USER_ENTERED',
            resource,
        });

        console.log(`${result.data.updatedCells} cells updated in ${sheetName}.`);
    } catch (err) {
        console.error('Error updating Google Sheet:', err);
        throw err;
    }
}

module.exports = { updateSheet };
