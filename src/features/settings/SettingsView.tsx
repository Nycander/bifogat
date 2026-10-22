import React, { useState } from "react";
import { AppMeta, OutboxOp, SyncConflict } from "../../domain/types";
import { SyncEngineStatus } from "../../sync/syncEngine";
import { ComponentShowcaseModal } from "../../components/ui";
import {
  Settings,
  Cloud,
  FileSpreadsheet,
  RefreshCw,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  Database,
  Trash2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

interface SettingsViewProps {
  meta: AppMeta;
  currentUser: any;
  syncStatus: SyncEngineStatus;
  outboxOps: OutboxOp[];
  conflicts: SyncConflict[];
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSaveSpreadsheetId: (id: string, title?: string) => Promise<void>;
  onCreateNewSpreadsheet: () => Promise<void>;
  onSyncNow: () => Promise<void>;
  onOpenConflicts: () => void;
  onOpenOutboxPreview: () => void;
  onToggleManualConfirmation: (enabled: boolean) => Promise<void>;
  onOpenCsvImport: () => void;
  onOpenNotesImport: () => void;
  onExportBackup: () => void;
  onClearLocalData: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  meta,
  currentUser,
  syncStatus,
  outboxOps,
  conflicts,
  onSignIn,
  onSignOut,
  onSaveSpreadsheetId,
  onCreateNewSpreadsheet,
  onSyncNow,
  onOpenConflicts,
  onOpenOutboxPreview,
  onToggleManualConfirmation,
  onOpenCsvImport,
  onOpenNotesImport,
  onExportBackup,
  onClearLocalData,
}) => {
  const [spreadsheetInput, setSpreadsheetInput] = useState(meta.spreadsheetId || "");
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [sheetMessage, setSheetMessage] = useState<string | null>(null);
  const [showUiShowcase, setShowUiShowcase] = useState(false);

  const handleSaveSheetId = async () => {
    if (!spreadsheetInput.trim()) return;
    await onSaveSpreadsheetId(spreadsheetInput.trim());
    setSheetMessage("Kalkylarks-ID har sparats!");
    setTimeout(() => setSheetMessage(null), 3000);
  };

  const handleCreateSheet = async () => {
    try {
      setIsCreatingSheet(true);
      setSheetMessage(null);
      await onCreateNewSpreadsheet();
      setSheetMessage("Ett nytt Google Kalkylark har skapats och kopplats!");
    } catch (err: any) {
      setSheetMessage(`Fel: ${err.message}`);
    } finally {
      setIsCreatingSheet(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1>Inställningar & synkronisering</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
            Koppla ditt Google-konto, välj kalkylark och hantera säkerhetskopior
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowUiShowcase(true)}
          >
            Visa UI-komponentbibliotek
          </button>
        </div>
      </div>

      {/* 1. Google Account & Authorization */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Cloud size={18} color="var(--color-primary)" />
            <span>Google-konto & molnkoppling</span>
          </h3>
        </div>

        {currentUser ? (
          <div>
            <div
              className="box-inset"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.75rem",
                padding: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "var(--color-primary-surface)",
                    color: "var(--color-text-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  }}
                >
                  {currentUser.displayName ? currentUser.displayName[0] : "U"}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {currentUser.displayName || "Google-användare"}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                    {currentUser.email}
                  </div>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={onSignOut}>
                Logga ut
              </button>
            </div>

            {syncStatus.state === "needs_auth" && (
              <div
                className="box-warning"
                style={{
                  marginTop: "0.75rem",
                  padding: "0.65rem 0.85rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: "0.85rem", color: "var(--color-warning-text)" }}>
                  Google-behörigheten har gått ut och behöver förnyas för kalkylarkssynk.
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={onSignIn}
                  style={{ whiteSpace: "nowrap" }}
                >
                  Förnya behörighet
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--color-text-muted)",
                marginBottom: "0.75rem",
              }}
            >
              Logga in med ditt Google-konto för att spara dina kupdata, händelser, skördar och
              ekonomi direkt i ditt eget Google Kalkylark.
            </p>
            <button className="google-signin-btn" onClick={onSignIn}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>Logga in med Google</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Google Spreadsheet Configuration */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <FileSpreadsheet size={18} color="var(--color-primary)" />
            <span>Google Kalkylark (Databas)</span>
          </h3>
        </div>

        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--color-text-muted)",
            marginBottom: "0.75rem",
          }}
        >
          Dina strukturerade register (Kupor, Händelser, Uppgifter, Skörd, Ekonomi) sparas i ett
          kalkylark på ditt Google Drive.
        </p>

        {meta.spreadsheetId ? (
          <div
            className="box-success"
            style={{
              padding: "0.75rem",
              marginBottom: "0.75rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-success-text)", fontWeight: 600 }}>
                  KOPPLAT KALKYLARK
                </div>
                <div style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>
                  {meta.spreadsheetTitle || "Bifogat - Biodlingsloggbok"}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-text-muted)",
                    wordBreak: "break-all",
                  }}
                >
                  ID: {meta.spreadsheetId}
                </div>
              </div>
              <a
                href={`https://docs.google.com/spreadsheets/d/${meta.spreadsheetId}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
              >
                <span>Öppna i Sheets</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: "1rem" }}>
            <button
              className="btn btn-primary"
              onClick={handleCreateSheet}
              disabled={isCreatingSheet || !currentUser}
              style={{ width: "100%", marginBottom: "0.5rem" }}
            >
              <FileSpreadsheet size={16} />
              <span>
                {isCreatingSheet
                  ? "Skapar kalkylark..."
                  : 'Skapa nytt "Bifogat - Biodlingsloggbok"'}
              </span>
            </button>
            {!currentUser && (
              <p style={{ fontSize: "0.75rem", color: "var(--color-warning)" }}>
                Du måste logga in med Google ovan först för att kunna skapa eller ansluta ett
                kalkylark.
              </p>
            )}
          </div>
        )}

        <div className="form-group" style={{ marginTop: "0.5rem" }}>
          <label className="form-label">Eller ange befintligt kalkylarks-ID:</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              className="form-input"
              placeholder="1A2B3C4D..."
              value={spreadsheetInput}
              onChange={(e) => setSpreadsheetInput(e.target.value)}
            />
            <button
              className="btn btn-secondary"
              onClick={handleSaveSheetId}
              disabled={!spreadsheetInput.trim()}
            >
              Spara
            </button>
          </div>
          {sheetMessage && (
            <div
              style={{
                fontSize: "0.8rem",
                color: "var(--color-success)",
                marginTop: "0.35rem",
                fontWeight: 600,
              }}
            >
              {sheetMessage}
            </div>
          )}
        </div>
      </div>

      {/* 3. Sync & Outbox */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <RefreshCw size={18} color="var(--color-primary)" />
            <span>Synkroniseringsstatus</span>
          </h3>
          <button
            className="btn btn-primary btn-sm"
            onClick={onSyncNow}
            disabled={syncStatus.state === "syncing"}
          >
            <RefreshCw size={14} className={syncStatus.state === "syncing" ? "spin" : ""} />
            <span>Synka nu</span>
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.75rem",
            marginBottom: "0.75rem",
          }}
        >
          <div
            className="box-inset"
            style={{
              padding: "0.65rem",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
              Senaste synk
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700 }}>
              {meta.lastSyncTime
                ? new Date(meta.lastSyncTime).toLocaleDateString("sv-SE", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Aldrig"}
            </div>
          </div>
          <div
            className="box-inset"
            style={{
              padding: "0.65rem",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
              Lokala ändringar i kö
            </div>
            <div
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: outboxOps.length > 0 ? "var(--color-primary-base)" : "inherit",
              }}
            >
              {outboxOps.length} poster
            </div>
          </div>
          <div
            className="box-inset"
            style={{
              padding: "0.65rem",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Konflikter</div>
            <div
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: conflicts.length > 0 ? "var(--color-danger-base)" : "inherit",
              }}
            >
              {conflicts.length} st
            </div>
          </div>
        </div>

        <div
          className="box-warning"
          style={{
            padding: "0.75rem 0.9rem",
            marginBottom: "0.85rem",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.5rem",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
          >
            <input
              type="checkbox"
              checked={meta.requireManualWriteConfirmation !== false}
              onChange={(e) => onToggleManualConfirmation(e.target.checked)}
              style={{
                width: "18px",
                height: "18px",
                accentColor: "var(--color-primary)",
                marginTop: "0.15rem",
              }}
            />
            <div>
              <span>
                Kräv manuellt godkännande innan data skrivs till Google Sheets (Skrivskydd)
              </span>
              <p
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 400,
                  color: "var(--color-text-muted)",
                  marginTop: "0.2rem",
                }}
              >
                När aktivt läser och hämtar appen endast data från Google Sheets. Ändringar du gör
                lokalt sparas säkert i IndexedDB och skrivs till molnet först när du uttryckligen
                förhandsgranskar och godkänner dem.
              </p>
            </div>
          </label>
        </div>

        {outboxOps.length > 0 && (
          <button
            className="btn btn-primary"
            onClick={onOpenOutboxPreview}
            style={{ width: "100%", marginBottom: "0.85rem", justifyContent: "center" }}
          >
            <ShieldCheck size={16} />
            <span>
              Förhandsgranska & skicka {outboxOps.length} ändring{outboxOps.length > 1 ? "ar" : ""}{" "}
              till Sheets
            </span>
          </button>
        )}

        {conflicts.length > 0 && (
          <div
            className="box-danger"
            style={{
              padding: "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.75rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "var(--color-danger-text)",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              <AlertTriangle size={18} />
              <span>{conflicts.length} synkroniseringskonflikt(er) kräver granskning</span>
            </div>
            <button className="btn btn-danger btn-sm" onClick={onOpenConflicts}>
              Lös konflikter
            </button>
          </div>
        )}

        {syncStatus.lastError && (
          <div
            className="box-danger"
            style={{
              padding: "0.65rem",
              fontSize: "0.8rem",
              marginTop: "0.5rem",
            }}
          >
            Senaste fel: {syncStatus.lastError}
          </div>
        )}
      </div>

      {/* 4. Migration & Import Tools */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Upload size={18} color="var(--color-primary)" />
            <span>Migrering & import</span>
          </h3>
        </div>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--color-text-muted)",
            marginBottom: "0.85rem",
          }}
        >
          Importera dina tidigare filer med förhandsgranskning och dublettkontroll. Originalfiler
          ändras aldrig.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <button className="btn btn-secondary" onClick={onOpenCsvImport}>
            <FileSpreadsheet size={16} />
            <span>Importera ekonomi (CSV)</span>
          </button>
          <button className="btn btn-secondary" onClick={onOpenNotesImport}>
            <Upload size={16} />
            <span>Importera anteckningar (Text)</span>
          </button>
        </div>
      </div>

      {/* 5. Backup & Export */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Download size={18} color="var(--color-primary)" />
            <span>Säkerhetskopia & export</span>
          </h3>
        </div>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--color-text-muted)",
            marginBottom: "0.75rem",
          }}
        >
          Exportera all lokal data från IndexedDB till en JSON-fil som kan sparas på din dator eller
          telefon.
        </p>
        <button className="btn btn-secondary" onClick={onExportBackup}>
          <Download size={16} />
          <span>Ladda ner komplett säkerhetskopia (JSON)</span>
        </button>
      </div>



      {/* 6. System Info & Local Storage Management */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Database size={18} color="var(--color-text-muted)" />
            <span>Applikationsinfo & lokal lagring</span>
          </h3>
        </div>
        <div
          style={{
            fontSize: "0.8rem",
            color: "var(--color-text-muted)",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
            marginBottom: "1rem",
          }}
        >
          <div>
            <strong>Applikation:</strong> Bifogat (Biodlingsloggbok PWA)
          </div>
          <div>
            <strong>Datamodell-version:</strong> v{meta.schemaVersion || 1}
          </div>
          <div>
            <strong>Lokal databas:</strong> IndexedDB (bifogat_db)
          </div>
          <div>
            <strong>Plattform:</strong> Offline-först PWA
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem" }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ color: "var(--color-danger)", borderColor: "var(--color-danger-border)" }}
            onClick={async () => {
              const ok = window.confirm(
                "VARNING: Detta rensar den lokala IndexedDB-cachen på denna enhet. Om du har osynkade ändringar kan de förloras. Vill du fortsätta?",
              );
              if (ok) {
                await onClearLocalData();
              }
            }}
          >
            <Trash2 size={14} />
            <span>Rensa lokal webbläsarcache</span>
          </button>
        </div>
      </div>

      <ComponentShowcaseModal
        isOpen={showUiShowcase}
        onClose={() => setShowUiShowcase(false)}
      />
    </div>
  );
};
