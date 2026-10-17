import React from "react";
import { SyncConflict } from "../../domain/types";
import { X, AlertTriangle, Check, ArrowRight } from "lucide-react";

interface ConflictModalProps {
  conflicts: SyncConflict[];
  onClose: () => void;
  onResolve: (conflictId: string, keepLocal: boolean) => Promise<void>;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({ conflicts, onClose, onResolve }) => {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: "680px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertTriangle size={20} color="var(--color-danger)" />
            <h2 className="modal-title">Synkroniseringskonflikter ({conflicts.length})</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Stäng">
            <X size={20} />
          </button>
        </div>

        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--color-text-muted)",
            marginBottom: "1.25rem",
          }}
        >
          Ändringar har gjorts både lokalt på den här enheten och direkt i Google Kalkylark för
          samma post. Välj vilken version du vill behålla för varje post. Ingen data skrivs över
          automatiskt utan ditt godkännande.
        </p>

        {conflicts.length === 0 ? (
          <div className="empty-state" style={{ padding: "2rem" }}>
            <Check size={32} color="var(--color-success)" style={{ margin: "0 auto 0.5rem" }} />
            <p>Inga olösta konflikter!</p>
          </div>
        ) : (
          <div className="item-list">
            {conflicts.map((c) => (
              <div
                key={c.id}
                className="card"
                style={{ padding: "1rem", border: "1px solid #fca5a5" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span
                    className="badge"
                    style={{ background: "#fee2e2", color: "#b91c1c", textTransform: "uppercase" }}
                  >
                    {c.entity} ({c.recordId.substring(0, 8)}...)
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                    Upptäckt:{" "}
                    {new Date(c.detectedAt).toLocaleTimeString("sv-SE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.75rem",
                    marginTop: "0.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      background: "#f8fafc",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "var(--color-primary)",
                      }}
                    >
                      Lokal version (på enheten)
                    </div>
                    <pre
                      style={{
                        fontSize: "0.75rem",
                        marginTop: "0.35rem",
                        whiteSpace: "pre-wrap",
                        maxHeight: "120px",
                        overflowY: "auto",
                      }}
                    >
                      {JSON.stringify(c.localVersion, null, 2)}
                    </pre>
                  </div>

                  <div
                    style={{
                      background: "#f8fafc",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <div
                      style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-info)" }}
                    >
                      Molnversion (Google Sheets)
                    </div>
                    <pre
                      style={{
                        fontSize: "0.75rem",
                        marginTop: "0.35rem",
                        whiteSpace: "pre-wrap",
                        maxHeight: "120px",
                        overflowY: "auto",
                      }}
                    >
                      {JSON.stringify(c.remoteVersion, null, 2)}
                    </pre>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onResolve(c.id, false)}
                    title="Skriv över lokalt med molndata"
                  >
                    Använd molnversion
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onResolve(c.id, true)}
                    title="Skriv över Google Sheets med lokal data"
                  >
                    Behåll lokal version
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: "1.25rem" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
};
