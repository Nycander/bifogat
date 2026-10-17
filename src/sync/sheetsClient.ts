import {
  Hive,
  HiveEvent,
  Task,
  Harvest,
  Transaction,
  AppMeta,
} from '../domain/types';

export const SHEET_TABS = {
  HIVES: 'Hives',
  EVENTS: 'Events',
  TASKS: 'Tasks',
  HARVESTS: 'Harvests',
  TRANSACTIONS: 'Transactions',
  APP_META: 'AppMeta',
} as const;

export const SCHEMAS = {
  [SHEET_TABS.HIVES]: ['id', 'name', 'status', 'notes', 'createdAt', 'updatedAt'],
  [SHEET_TABS.EVENTS]: ['id', 'hiveId', 'date', 'type', 'title', 'notes', 'createdAt', 'updatedAt'],
  [SHEET_TABS.TASKS]: ['id', 'title', 'notes', 'hiveId', 'dueDate', 'status', 'createdAt', 'updatedAt', 'completedAt'],
  [SHEET_TABS.HARVESTS]: ['id', 'date', 'hiveId', 'honeyWeightGrams', 'jarSizeGrams', 'jarCount', 'notes', 'createdAt', 'updatedAt'],
  [SHEET_TABS.TRANSACTIONS]: ['id', 'date', 'description', 'amountSEK', 'amountOre', 'counterparty', 'category', 'source', 'externalReference', 'createdAt', 'updatedAt'],
  [SHEET_TABS.APP_META]: ['key', 'value', 'updatedAt'],
};

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Helper to call Google Sheets API with Bearer token
 */
async function sheetsFetch(accessToken: string, endpoint: string, options: RequestInit = {}) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let message = `Sheets API error (${response.status}): ${response.statusText}`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.error?.message) {
        message = parsed.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return response.json();
}

export const sheetsClient = {
  /**
   * Create a new spreadsheet with the required tabs
   */
  async createSpreadsheet(accessToken: string, title = 'Bifogat - Biodlingsloggbok'): Promise<{ id: string; title: string }> {
    const body = {
      properties: { title },
      sheets: Object.entries(SCHEMAS).map(([sheetTitle, headers]) => ({
        properties: { title: sheetTitle },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: headers.map((h) => ({ userEnteredValue: { stringValue: h } })),
              },
            ],
          },
        ],
      })),
    };

    const res = await sheetsFetch(accessToken, '', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return { id: res.spreadsheetId, title: res.properties.title };
  },

  /**
   * Verify and ensure all required tabs and headers exist in an existing spreadsheet
   */
  async ensureSchema(accessToken: string, spreadsheetId: string): Promise<void> {
    const meta = await sheetsFetch(accessToken, `/${spreadsheetId}?fields=sheets.properties`);
    const existingTitles: string[] = (meta.sheets || []).map(
      (s: any) => s.properties?.title
    );

    const missingTabs = Object.keys(SCHEMAS).filter((tab) => !existingTitles.includes(tab));

    if (missingTabs.length > 0) {
      // Add missing sheets
      const requests = missingTabs.map((tabTitle) => ({
        addSheet: {
          properties: { title: tabTitle },
        },
      }));
      await sheetsFetch(accessToken, `/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({ requests }),
      });
    }

    // Ensure header rows exist for each tab
    for (const [tabTitle, headers] of Object.entries(SCHEMAS)) {
      const range = encodeURIComponent(`${tabTitle}!A1:Z1`);
      const data = await sheetsFetch(accessToken, `/${spreadsheetId}/values/${range}`);
      const rows = data.values || [];
      if (rows.length === 0 || rows[0].length === 0) {
        // Write header
        await sheetsFetch(
          accessToken,
          `/${spreadsheetId}/values/${encodeURIComponent(`${tabTitle}!A1`)}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            body: JSON.stringify({ values: [headers] }),
          }
        );
      }
    }
  },

  /**
   * Read all data rows from a tab as array of objects keyed by header
   */
  async readTab(accessToken: string, spreadsheetId: string, tabTitle: string): Promise<Record<string, string>[]> {
    const range = encodeURIComponent(`${tabTitle}!A:Z`);
    const data = await sheetsFetch(accessToken, `/${spreadsheetId}/values/${range}`);
    const rows: string[][] = data.values || [];
    if (rows.length <= 1) return [];

    const headers = rows[0];
    const results: Record<string, string>[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || !row[0]) continue; // skip empty rows or rows without ID
      const record: Record<string, string> = {};
      headers.forEach((h, colIndex) => {
        record[h] = row[colIndex] !== undefined ? String(row[colIndex]) : '';
      });
      results.push(record);
    }

    return results;
  },

  /**
   * Append a row to a tab
   */
  async appendRow(accessToken: string, spreadsheetId: string, tabTitle: string, rowValues: any[]): Promise<void> {
    const range = encodeURIComponent(`${tabTitle}!A:Z`);
    await sheetsFetch(
      accessToken,
      `/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        body: JSON.stringify({ values: [rowValues] }),
      }
    );
  },

  /**
   * Update an existing row identified by its ID in column A
   */
  async updateRowById(
    accessToken: string,
    spreadsheetId: string,
    tabTitle: string,
    id: string,
    rowValues: any[]
  ): Promise<boolean> {
    // 1. Fetch column A to find the row index
    const colARange = encodeURIComponent(`${tabTitle}!A:A`);
    const colAData = await sheetsFetch(accessToken, `/${spreadsheetId}/values/${colARange}`);
    const rows = colAData.values || [];
    let rowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === id) {
        rowIndex = i + 1; // 1-indexed for Sheets
        break;
      }
    }

    if (rowIndex === -1) {
      // Row not found, append instead
      await this.appendRow(accessToken, spreadsheetId, tabTitle, rowValues);
      return true;
    }

    // 2. Overwrite that specific row
    const targetRange = encodeURIComponent(`${tabTitle}!A${rowIndex}:Z${rowIndex}`);
    await sheetsFetch(
      accessToken,
      `/${spreadsheetId}/values/${targetRange}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [rowValues] }),
      }
    );
    return true;
  },

  /**
   * Delete a row by ID in column A
   */
  async deleteRowById(accessToken: string, spreadsheetId: string, tabTitle: string, id: string): Promise<boolean> {
    // In Sheets, clearing or blanking out the row content
    const colARange = encodeURIComponent(`${tabTitle}!A:A`);
    const colAData = await sheetsFetch(accessToken, `/${spreadsheetId}/values/${colARange}`);
    const rows = colAData.values || [];
    let rowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === id) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) return false;

    const targetRange = encodeURIComponent(`${tabTitle}!A${rowIndex}:Z${rowIndex}`);
    await sheetsFetch(accessToken, `/${spreadsheetId}/values/${targetRange}:clear`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return true;
  },
};
