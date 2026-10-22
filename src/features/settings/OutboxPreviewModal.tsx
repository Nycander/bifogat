import React, { useState } from "react";
import { OutboxOp } from "../../domain/types";
import { formatOreToSEK } from "../../domain/validation";
import {
  X,
  Send,
  Trash2,
  CheckCircle,
  ShieldCheck,
  Eye,
  Layers,
  CheckSquare,
  Droplet,
  Wallet,
  Calendar,
} from "lucide-react";

interface OutboxPreviewModalProps {
  outboxOps: OutboxOp[];
  onClose: () => void;
  onConfirmPush: () => Promise<void>;
  onClearOutbox: () => Promise<void>;
}

export const OutboxPreviewModal: React.FC<OutboxPreviewModalProps> = ({
  outboxOps,
  onClose,
  onConfirmPush,
  onClearOutbox,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getEntityIcon = (entity: OutboxOp["entity"]) => {
    switch (entity) {
      case "hive":
        return <Layers size={16} color="var(--color-primary)" />;
      case "event":
        return <Calendar size={16} color="var(--color-info)" />;
      case "task":
        return <CheckSquare size={16} color="var(--color-success)" />;
      case "harvest":
        return <Droplet size={16} color="var(--color-accent-dark)" />;
      case "transaction":
        return <Wallet size={16} color="var(--color-warning)" />;
    }
  };

  const getOperationBadge = (op: OutboxOp["operation"]) => {
    switch (op) {
      case "create":
        return <span className="badge badge-active">Ny post</span>;
      case "update":
        return <span className="badge badge-event-inspection">Uppdatering</span>;
      case "delete":
        return <span className="badge badge-danger">Borttagning</span>;
    }
  };

  const renderPayloadSummary = (op: OutboxOp) => {
    const p = op.payload || {};
    switch (op.entity) {
      case "hive":
        return (
          <div>
            <strong>Kupa:</strong> {p.name || op.recordId} {p.status ? `(${p.status})` : ""}
            {p.notes && (
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{p.notes}</div>
            )}
          </div>
        );
      case "event":
        return (
          <div>
            <strong>Händelse ({p.date}):</strong> {p.title || p.type}
            {p.notes && (
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{p.notes}</div>
            )}
          </div>
        );
      case "task":
        return (
          <div>
            <strong>Uppgift:</strong> {p.title} {p.status ? `[${p.status}]` : ""}
            {p.dueDate && (
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                {" "}
                • Förfaller: {p.dueDate}
              </span>
            )}
          </div>
        );
      case "harvest":
        return (
          <div>
            <strong>Skörd ({p.date}):</strong>{" "}
            {p.honeyWeightGrams ? `${(p.honeyWeightGrams / 1000).toFixed(1)} kg` : ""}{" "}
            {p.jarCount ? `${p.jarCount} st burkar` : ""}
          </div>
        );
      case "transaction":
        return (
          <div>
            <strong>Transaktion ({p.date}):</strong> {p.description}{" "}
            <strong
              style={{
                color: (p.amountOre || 0) >= 0 ? "var(--color-success)" : "var(--color-danger)",
              }}
            >
              {formatOreToSEK(p.amountOre || 0)}
            </strong>
          </div>
        );
    }
  };

  const handlePush = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirmPush();
      onClose();
    } catch (err: any) {
      setError(err.message || "Kunde inte skriva ändringar till Google Sheets");
      setIsSubmitting(false);
    }
  };

  const handleClear = async () => {
    const ok = window.confirm(
      "Är du säker på att du vill kasta alla osynkade ändringar i kön? Dessa ändringar kommer inte att skrivas till ditt Google Kalkylark.",
    );
    if (ok) {
      await onClearOutbox();
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: "680px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ShieldCheck size={20} color="var(--color-primary)" />
            <h2 className="modal-title">Förhandsgranska skrivändringar</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Stäng">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="form-error" style={{ marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <div
          style={{
            background: "var(--color-warning-surface)",
            border: "1px solid var(--color-warning-border)",
            padding: "0.75rem 0.9rem",
            borderRadius: "8px",
            fontSize: "0.85rem",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{ fontWeight: 700, color: "var(--color-accent-dark)", marginBottom: "0.2rem" }}
          >
            Skrivskydd & Förhandsgranskning aktivt
          </div>
          <div style={{ color: "var(--color-text-main)" }}>
            Dina ändringar är säkert sparade i din enhets lokala databas (IndexedDB). Ingenting
            skrivs till ditt Google Kalkylark förrän du uttryckligen bekräftar nedan.
          </div>
        </div>

        {outboxOps.length === 0 ? (
          <div className="empty-state" style={{ padding: "2rem" }}>
            <CheckCircle
              size={32}
              color="var(--color-success)"
              style={{ margin: "0 auto 0.5rem" }}
            />
            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Inga väntande skrivningar</h3>
            <p className="empty-state-desc" style={{ marginTop: "0.35rem" }}>
              All lokal data stämmer redan överens med ditt Google Kalkylark.
            </p>
          </div>
        ) : (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
              }}
            >
              <span
                style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-text-main)" }}
              >
                {outboxOps.length} ändring{outboxOps.length > 1 ? "ar" : ""} i skrivkön:
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowRawJson(!showRawJson)}
                style={{ fontSize: "0.75rem" }}
              >
                <Eye size={12} />
                <span>{showRawJson ? "Dölj rådata" : "Visa JSON-fält"}</span>
              </button>
            </div>

            <div style={{ maxHeight: "280px", overflowY: "auto" }} className="item-list">
              {outboxOps.map((op, idx) => (
                <div key={op.id} className="list-item" style={{ padding: "0.75rem" }}>
                  <div
                    style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", flex: 1 }}
                  >
                    <div style={{ marginTop: "0.15rem" }}>{getEntityIcon(op.entity)}</div>
                    <div className="list-item-main">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.2rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            color: "var(--color-text-muted)",
                          }}
                        >
                          Flik: {op.entity}
                        </span>
                        {getOperationBadge(op.operation)}
                        <span style={{ fontSize: "0.7rem", color: "var(--color-text-light)" }}>
                          {new Date(op.timestamp).toLocaleTimeString("sv-SE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div style={{ fontSize: "0.85rem" }}>{renderPayloadSummary(op)}</div>

                      {showRawJson && (
                        <pre
                          style={{
                            fontSize: "0.7rem",
                            background: "var(--color-surface-inset)",
                            padding: "0.5rem",
                            borderRadius: "4px",
                            marginTop: "0.5rem",
                            overflowX: "auto",
                            border: "1px solid var(--color-border-subtle)",
                          }}
                        >
                          {JSON.stringify(op.payload || { id: op.recordId }, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div
              className="modal-actions"
              style={{ marginTop: "1.25rem", justifyContent: "space-between", flexWrap: "wrap" }}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleClear}
                disabled={isSubmitting}
                style={{ color: "var(--color-danger)", borderColor: "var(--color-danger-border)" }}
              >
                <Trash2 size={14} />
                <span>Kasta ändringar</span>
              </button>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Stäng
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handlePush}
                  disabled={isSubmitting}
                >
                  <Send size={15} />
                  <span>
                    {isSubmitting
                      ? "Skriver till Sheets..."
                      : `Skriv till Google Sheets (${outboxOps.length})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
