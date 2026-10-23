import React from "react";
import { SyncEngineStatus } from "../sync/syncEngine";
import { RefreshCw, CloudCheck, CloudOff, AlertCircle, AlertTriangle } from "lucide-react";

interface SyncStatusBarProps {
  status: SyncEngineStatus;
  isOnline: boolean;
  onSyncNow: () => void;
  onOpenConflicts: () => void;
  onOpenOutboxPreview: () => void;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({
  status,
  isOnline,
  onSyncNow,
  onOpenConflicts,
  onOpenOutboxPreview,
}) => {
  const { state, lastSyncTime, pendingCount, conflictCount, lastError } = status;

  if (conflictCount > 0) {
    return (
      <button
        onClick={onOpenConflicts}
        className="sync-badge"
        style={{
          backgroundColor: "var(--color-danger-surface)",
          color: "var(--color-danger-text)",
          borderColor: "var(--color-danger-border)",
          cursor: "pointer",
        }}
        title="Klicka för att lösa konflikt mellan lokal och molndata"
      >
        <AlertTriangle size={14} />
        <span>
          {conflictCount} konflikt{conflictCount > 1 ? "er" : ""} att lösa
        </span>
      </button>
    );
  }

  if (!isOnline || state === "offline") {
    return (
      <button
        onClick={onOpenOutboxPreview}
        className="sync-badge sync-offline"
        title="Ingen internetanslutning. Data sparas lokalt i IndexedDB. Klicka för att granska väntande ändringar."
        style={{ cursor: "pointer" }}
      >
        <CloudOff size={14} />
        <span>Offline {pendingCount > 0 ? `(${pendingCount} väntar)` : ""}</span>
      </button>
    );
  }

  if (state === "syncing") {
    return (
      <div className="sync-badge sync-syncing" title={status.syncMessage || "Synkroniserar..."}>
        <RefreshCw size={14} className="spin" style={{ animation: "spin 1s linear infinite" }} />
        <span>{status.syncMessage || "Synkar..."}</span>
      </div>
    );
  }

  if (state === "error") {
    return (
      <button
        onClick={onSyncNow}
        className="sync-badge sync-error"
        title={lastError || "Ett fel uppstod vid synkronisering. Klicka för att försöka igen."}
        style={{ cursor: "pointer" }}
      >
        <AlertCircle size={14} />
        <span>Synkfel (försök igen)</span>
      </button>
    );
  }

  if (pendingCount > 0) {
    return (
      <button
        onClick={onOpenOutboxPreview}
        className="sync-badge sync-syncing"
        title={`${pendingCount} lokala ändringar väntar på skrivning till Google Sheets. Klicka för att förhandsgranska och skicka.`}
        style={{ cursor: "pointer" }}
      >
        <RefreshCw size={14} />
        <span>{pendingCount} väntar (granska)</span>
      </button>
    );
  }

  if (lastSyncTime) {
    const formatted = new Date(lastSyncTime).toLocaleTimeString("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <button
        onClick={onSyncNow}
        className="sync-badge sync-idle"
        title={`Senast synkad med Google Sheets kl ${formatted}. Klicka för att synka nu.`}
        style={{ cursor: "pointer" }}
      >
        <RefreshCw size={13} />
        <span>Synkad ({formatted})</span>
      </button>
    );
  }

  return (
    <button
      onClick={onSyncNow}
      className="sync-badge sync-idle"
      title="Synkronisering med Google Sheets. Klicka för att synka."
      style={{ cursor: "pointer" }}
    >
      <RefreshCw size={13} />
      <span>Synka nu</span>
    </button>
  );
};
