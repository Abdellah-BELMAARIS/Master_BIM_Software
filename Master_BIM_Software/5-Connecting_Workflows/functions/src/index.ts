import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";

admin.initializeApp();

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
];

/**
 * Lazy-loads googleapis inside request execution so Firebase Functions discovery
 * completes in milliseconds without hitting the 10s cold-discovery timeout.
 */
function resolveServiceAccountClients() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { google } = require("googleapis") as typeof import("googleapis");

  const candidates = [
    path.resolve(__dirname, "../service-account-key.json"),
    path.resolve(__dirname, "../../resources/service-account-key.json"),
  ];

  const resourcesDir = path.resolve(__dirname, "../../resources");
  if (fs.existsSync(resourcesDir)) {
    try {
      for (const file of fs.readdirSync(resourcesDir)) {
        if (file.endsWith(".json")) {
          const full = path.join(resourcesDir, file);
          const raw = fs.readFileSync(full, "utf8");
          if (raw.includes('"type": "service_account"') || raw.includes('"type":"service_account"')) {
            candidates.unshift(full);
          }
        }
      }
    } catch {}
  }

  let auth: any = null;
  let serviceAccountEmail = "";
  for (const keyPath of candidates) {
    if (fs.existsSync(keyPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(keyPath, "utf8"));
        if (typeof parsed.client_email === "string") {
          serviceAccountEmail = parsed.client_email;
        }
      } catch {}
      auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: GOOGLE_SCOPES,
      });
      break;
    }
  }

  if (!auth) {
    auth = new google.auth.GoogleAuth({ scopes: GOOGLE_SCOPES });
  }

  return {
    drive: google.drive({ version: "v3", auth }),
    sheets: google.sheets({ version: "v4", auth }),
    serviceAccountEmail,
  };
}

/**
 * Module 5 — Section 3 (Lessons 3.1 & 3.2): Google Drive API v3
 * Lists all Google Spreadsheets shared with the BIM Service Account email.
 */
export const listDriveSpreadsheets = functions.onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const folderId = typeof req.query.folderId === "string" ? req.query.folderId.trim() : "";
      const { drive, serviceAccountEmail } = resolveServiceAccountClients();

      let q = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
      if (folderId) {
        q += ` and '${folderId}' in parents`;
      }

      const [driveRes, foldersRes] = await Promise.all([
        drive.files.list({
          q,
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
          fields: "files(id, name, webViewLink, modifiedTime, owners(displayName))",
          orderBy: "modifiedTime desc",
          pageSize: 50,
        }),
        drive.files.list({
          q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
          fields: "files(id, name, webViewLink, capabilities(canAddChildren))",
          pageSize: 20,
        }),
      ]);

      res.status(200).json({
        status: "success",
        serviceAccountEmail,
        files: driveRes.data.files || [],
        folders: foldersRes.data.files || [],
      });
    } catch (error: any) {
      console.error("[listDriveSpreadsheets] Error:", error);
      res.status(500).json({
        error:
          error?.message ||
          "Failed to list Google Drive spreadsheets. Ensure Service Account JSON key is placed in resources/ and folder is shared.",
      });
    }
  }
);

/**
 * Validates that an ID is a Google Spreadsheet (or auto-picks the latest Sheet inside a shared Folder ID).
 */
async function resolveTargetSpreadsheetId(drive: any, rawId: string): Promise<string> {
  const cleanId = String(rawId || "").trim();
  if (!cleanId) throw new Error("Missing Spreadsheet ID.");
  try {
    const fileMeta = await drive.files.get({
      fileId: cleanId,
      supportsAllDrives: true,
      fields: "id, name, mimeType",
    });
    if (fileMeta.data?.mimeType === "application/vnd.google-apps.folder") {
      const folderName = fileMeta.data.name || cleanId;
      const inFolder = await drive.files.list({
        q: `'${cleanId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        fields: "files(id, name)",
        orderBy: "modifiedTime desc",
        pageSize: 5,
      });
      const firstSheet = inFolder.data.files?.[0];
      if (firstSheet?.id) {
        return firstSheet.id;
      }
      throw new Error(
        `"${cleanId}" is your empty Google Drive FOLDER ("${folderName}"), not a Google Sheet ID! Open "${folderName}" in Google Drive, click "+ New -> Google Sheets", then click "List Drive Sheets".`
      );
    }
  } catch (err: any) {
    if (err?.message?.includes("FOLDER")) throw err;
  }
  return cleanId;
}

/**
 * Module 5 — Section 3: Inspect Spreadsheet Tabs & Read Values
 */
export const getSpreadsheetTabs = functions.onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const rawId =
        (typeof req.query.spreadsheetId === "string" && req.query.spreadsheetId) ||
        req.body?.spreadsheetId;

      if (!rawId) {
        res.status(400).json({ error: "Missing 'spreadsheetId' parameter." });
        return;
      }

      const { sheets, drive } = resolveServiceAccountClients();
      const spreadsheetId = await resolveTargetSpreadsheetId(drive, rawId);
      const meta = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: "properties.title,sheets.properties(sheetId,title,gridProperties)",
      });

      res.status(200).json({
        status: "success",
        title: meta.data.properties?.title || "",
        tabs: (meta.data.sheets || []).map((s) => ({
          sheetId: s.properties?.sheetId,
          title: s.properties?.title || "Sheet1",
          rowCount: s.properties?.gridProperties?.rowCount || 0,
        })),
      });
    } catch (error: any) {
      console.error("[getSpreadsheetTabs] Error:", error);
      res.status(500).json({ error: error?.message || "Failed to inspect spreadsheet tabs." });
    }
  }
);

/**
 * Module 5 — Lesson 3.2 & 3.3: Read all cell rows from a Google Sheet tab (defaults to first tab)
 */
export const readSheetData = functions.onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const rawId =
        (typeof req.query.spreadsheetId === "string" && req.query.spreadsheetId) ||
        req.body?.spreadsheetId;
      const requestedTab =
        (typeof req.query.sheetName === "string" && req.query.sheetName.trim()) ||
        (req.body?.sheetName ? String(req.body.sheetName).trim() : "");

      if (!rawId) {
        res.status(400).json({ error: "Missing 'spreadsheetId' parameter." });
        return;
      }

      const { sheets, drive } = resolveServiceAccountClients();
      const spreadsheetId = await resolveTargetSpreadsheetId(drive, rawId);

      const meta = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: "properties.title,sheets.properties.title",
      });
      const firstTitle = meta.data.sheets?.[0]?.properties?.title || "Sheet1";
      const targetTab = requestedTab || firstTitle;

      const valuesRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: targetTab,
      });

      res.status(200).json({
        status: "success",
        spreadsheetTitle: meta.data.properties?.title || "",
        sheetName: targetTab,
        values: valuesRes.data.values || [],
      });
    } catch (error: any) {
      console.error("[readSheetData] Error:", error);
      res.status(500).json({ error: error?.message || "Failed to read Google Sheet rows." });
    }
  }
);

/**
 * Module 5 — Section 3: Create a new BIM Google Spreadsheet in Drive
 */
export const createDriveSpreadsheet = functions.onRequest(
  { cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed. Use POST." });
      return;
    }

    const { sheets, drive, serviceAccountEmail } = resolveServiceAccountClients();
    let detectedFolderName = "";
    try {
      const { title = `BIM Schedule ${new Date().toISOString().slice(0, 10)}`, folderId } = req.body || {};

      let targetFolderId = typeof folderId === "string" ? folderId.trim() : "";
      if (!targetFolderId) {
        try {
          const foldersRes = await drive.files.list({
            q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            fields: "files(id, name, capabilities(canAddChildren))",
            pageSize: 10,
          });
          const writable = (foldersRes.data.files || []).find((f) => f.capabilities?.canAddChildren);
          if (writable?.id) {
            targetFolderId = writable.id;
            detectedFolderName = writable.name || "";
          }
        } catch {}
      }

      let spreadsheetId = "";
      let spreadsheetUrl = "";

      if (targetFolderId) {
        const fileRes = await drive.files.create({
          supportsAllDrives: true,
          requestBody: {
            name: title,
            mimeType: "application/vnd.google-apps.spreadsheet",
            parents: [targetFolderId],
          },
          fields: "id, webViewLink",
        });
        spreadsheetId = fileRes.data.id || "";
        spreadsheetUrl = fileRes.data.webViewLink || "";
      } else {
        const created = await sheets.spreadsheets.create({
          requestBody: {
            properties: { title },
            sheets: [{ properties: { title: "BIM_Schedule" } }],
          },
        });
        spreadsheetId = created.data.spreadsheetId || "";
        spreadsheetUrl = created.data.spreadsheetUrl || "";
      }

      res.status(200).json({
        status: "success",
        serviceAccountEmail,
        spreadsheetId,
        spreadsheetUrl,
        title,
      });
    } catch (error: any) {
      console.error("[createDriveSpreadsheet] Error:", error);
      const rawMsg = error?.message || "Failed to create spreadsheet.";
      const isQuotaOrPerm =
        rawMsg.toLowerCase().includes("permission") ||
        rawMsg.toLowerCase().includes("quota") ||
        error?.code === 403 ||
        error?.status === 403;
      const folderHint = detectedFolderName
        ? `Your shared folder "${detectedFolderName}" is connected! Open it in Google Drive -> click "+ New -> Google Sheets" (it automatically inherits Editor access), then click "List Drive Sheets".`
        : `Google blocks Service Accounts from owning new files without Workspace Shared Drive quota. Create a blank Google Sheet inside your Google Drive, share it (Editor) with ${serviceAccountEmail || "your Service Account email"}, then click "List Drive Sheets".`;
      res.status(isQuotaOrPerm ? 403 : 500).json({
        serviceAccountEmail,
        folderName: detectedFolderName,
        error: isQuotaOrPerm ? folderHint : rawMsg,
      });
    }
  }
);

/**
 * Module 5 — Section 3 (Lessons 3.2 & 3.4): Google Sheets BIM Data Writer
 * Securely authenticates via Service Account JSON key (or Application Default Credentials)
 * and writes/appends extracted BIM Fragment quantities into Google Sheets v4 API.
 */
export const writeBimDataToSheets = functions.onRequest(
  { cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed. Use POST." });
      return;
    }

    try {
      const { spreadsheetId: rawId, sheetName = "BIM_Schedule", rows, mode = "append" } = req.body || {};

      if (!rawId || !Array.isArray(rows) || rows.length === 0) {
        res.status(400).json({
          error: "Invalid payload: 'spreadsheetId' and non-empty 'rows' array are required.",
        });
        return;
      }

      const { sheets, drive } = resolveServiceAccountClients();
      const spreadsheetId = await resolveTargetSpreadsheetId(drive, rawId);

      // Ensure target tab exists — create via batchUpdate addSheet if missing (Lesson 3.4)
      const meta = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: "sheets.properties.title",
      });
      const existingTabs = (meta.data.sheets || []).map((s) => s.properties?.title || "");
      if (!existingTabs.includes(sheetName)) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title: sheetName } } }],
          },
        });
      }

      if (mode === "replace") {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${sheetName}!A:Z`,
        });

        const updateRes = await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: rows },
        });

        res.status(200).json({
          status: "success",
          mode: "replace",
          updatedCells: updateRes.data.updatedCells || 0,
          updatedRows: updateRes.data.updatedRows || rows.length,
        });
        return;
      }

      const appendRes = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: rows },
      });

      res.status(200).json({
        status: "success",
        mode: "append",
        updatedCells: appendRes.data.updates?.updatedCells || 0,
        updatedRange: appendRes.data.updates?.updatedRange,
      });
    } catch (error: any) {
      console.error("[writeBimDataToSheets] Error:", error);
      res.status(500).json({
        error: error?.message || "Failed to write BIM data to Google Sheets",
      });
    }
  }
);
