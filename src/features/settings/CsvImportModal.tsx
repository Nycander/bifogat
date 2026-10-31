import React, { useState } from "react";
import { Transaction } from "../../domain/types";
import { parseSwedishFinancialCsv, CsvImportResult } from "../../import/csvParser";
import { formatOreToSEK } from "../../domain/validation";
import { X, Upload, Check, FileText, ArrowRight } from "lucide-react";
import { useBottomSheet } from "../../hooks/useBottomSheet";
import { BottomSheetDragHandle } from "../../components/ui/BottomSheetDragHandle";

interface CsvImportModalProps {
  existingTransactions: Transaction[];
  onClose: () => void;
  onConfirmImport: (transactions: Transaction[], lastBalanceOre: number | null) => Promise<void>;
  onExportBackup: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  existingTransactions,
  onClose,
  onConfirmImport,
  onExportBackup,
}) => {
  const [csvText, setCsvText] = useState("");
  const [previewResult, setPreviewResult] = useState<CsvImportResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"input" | "preview">("input");
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      processCsv(text);
    };
    reader.readAsText(file, "utf-8");
  };

  const processCsv = (text: string) => {
    try {
      setError(null);
      const res = parseSwedishFinancialCsv(text, existingTransactions);
      if (res.totalRows === 0) {
        setError("Inga giltiga rader hittades i CSV-texten");
        return;
      }
      setPreviewResult(res);
      setStep("preview");
    } catch (err: any) {
      setError(err.message || "Fel vid tolkning av CSV");
    }
  };

  const handleConfirm = async () => {
    if (!previewResult || isSubmitting) return;
    try {
      setIsSubmitting(true);
      await onConfirmImport(
        previewResult.transactionsToImport,
        previewResult.lastImportedBalanceOre,
      );
      onClose();
    } catch (err: any) {
      setError(err.message || "Kunde inte importera transaktionerna");
      setIsSubmitting(false);
    }
  };

  const { contentRef, backdropRef } = useBottomSheet({ onClose });

  return (
    <div ref={backdropRef} className="modal-backdrop" onClick={onClose}>
      <div
        ref={contentRef}
        className="modal-content"
        style={{ maxWidth: "720px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <BottomSheetDragHandle />
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileText size={20} color="var(--color-primary)" />
            <h2 className="modal-title">Importera kassabok från CSV</h2>
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

        {step === "input" ? (
          <div>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--color-text-muted)",
                marginBottom: "1rem",
              }}
            >
              Importera dina tidigare ekonomiska poster från Google Kalkylark eller en exporterad
              CSV-fil. Systemet hanterar svenska format, kommatecken, minustecken och
              summeringsrader säkert.
            </p>

            <div style={{ marginBottom: "1.25rem" }}>
              <label
                className="btn btn-secondary"
                style={{
                  width: "100%",
                  padding: "1.5rem",
                  border: "2px dashed var(--color-border)",
                  cursor: "pointer",
                }}
              >
                <Upload size={24} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 700 }}>Välj CSV-fil från din enhet</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                    Stödjer semikolon (;) eller kommatecken (,)
                  </div>
                </div>
                <input
                  type="file"
                  accept=".csv,.txt"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Eller klistra in CSV-text direkt här:</label>
              <textarea
                className="form-textarea"
                rows={6}
                placeholder="Datum;Beskrivning ;Förändring;Ackumulerat;Motpart..."
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>
                Avbryt
              </button>
              <button
                className="btn btn-primary"
                onClick={() => processCsv(csvText)}
                disabled={!csvText.trim()}
              >
                <span>Granska data</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div>
            {previewResult && (
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      background: "var(--color-surface-inset)",
                      padding: "0.65rem",
                      borderRadius: "8px",
                      border: "1px solid var(--color-border-subtle)",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      Giltiga poster
                    </div>
                    <div
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 800,
                        color: "var(--color-success)",
                      }}
                    >
                      {previewResult.validCount}
                    </div>
                  </div>
                  <div
                    style={{
                      background: "var(--color-surface-inset)",
                      padding: "0.65rem",
                      borderRadius: "8px",
                      border: "1px solid var(--color-border-subtle)",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      Saldorader (exkluderas)
                    </div>
                    <div
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 800,
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {previewResult.skippedCount}
                    </div>
                  </div>
                  <div
                    style={{
                      background: "var(--color-surface-inset)",
                      padding: "0.65rem",
                      borderRadius: "8px",
                      border: "1px solid var(--color-border-subtle)",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      Dubbletter
                    </div>
                    <div
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 800,
                        color: "var(--color-warning)",
                      }}
                    >
                      {previewResult.duplicateCount}
                    </div>
                  </div>
                  <div
                    style={{
                      background: "var(--color-surface-inset)",
                      padding: "0.65rem",
                      borderRadius: "8px",
                      border: "1px solid var(--color-border-subtle)",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      Felaktiga rader
                    </div>
                    <div
                      style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-danger)" }}
                    >
                      {previewResult.malformedCount}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: previewResult.balanceMatches ? "var(--color-success-surface)" : "var(--color-warning-surface)",
                    border: `1px solid ${previewResult.balanceMatches ? "var(--color-success-border)" : "var(--color-warning-border)"}`,
                    color: previewResult.balanceMatches ? "var(--color-success-text)" : "var(--color-warning-text)",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    <strong>Beräknat förändringssaldo:</strong>{" "}
                    {formatOreToSEK(previewResult.calculatedBalanceOre)}
                  </div>
                  {previewResult.lastImportedBalanceOre !== null && (
                    <div style={{ marginTop: "0.2rem" }}>
                      <strong>Slutsaldo i filen:</strong>{" "}
                      {formatOreToSEK(previewResult.lastImportedBalanceOre)}
                    </div>
                  )}
                  {previewResult.balanceMatches ? (
                    <div
                      style={{
                        color: "var(--color-success)",
                        fontWeight: 600,
                        marginTop: "0.2rem",
                      }}
                    >
                      ✓ Saldokontroll stämmer överens.
                    </div>
                  ) : (
                    <div
                      style={{
                        color: "var(--color-warning)",
                        fontWeight: 600,
                        marginTop: "0.2rem",
                      }}
                    >
                      Observera: Det finns en skillnad mellan ackumulerat slutvärde och radernas
                      summa (kan bero på tidigare ingående balans).
                    </div>
                  )}
                </div>

                <div
                  style={{ maxHeight: "220px", overflowY: "auto" }}
                  className="preview-table-container"
                >
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Rad</th>
                        <th>Datum</th>
                        <th>Beskrivning</th>
                        <th>Belopp</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewResult.rows.map((r) => (
                        <tr key={r.rawLineIndex}>
                          <td>{r.rawLineIndex}</td>
                          <td>{r.date || r.rawDate || "—"}</td>
                          <td>{r.description}</td>
                          <td>
                            {r.amountOre !== null ? formatOreToSEK(r.amountOre) : r.rawChange}
                          </td>
                          <td>
                            {r.status === "valid" && (
                              <span className="badge badge-active">Klar</span>
                            )}
                            {r.status === "skipped_balance_summary" && (
                              <span className="badge badge-inactive">Saldorad</span>
                            )}
                            {r.status === "duplicate" && (
                              <span className="badge badge-inactive">Finns redan</span>
                            )}
                            {r.status === "malformed" && (
                              <span className="badge badge-danger">
                                Fel
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    marginTop: "1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={onExportBackup}
                  >
                    Ladda ner säkerhetskopia först
                  </button>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setStep("input")}
                    >
                      Tillbaka
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleConfirm}
                      disabled={previewResult.validCount === 0 || isSubmitting}
                    >
                      <Check size={16} />
                      <span>
                        {isSubmitting
                          ? "Sparar..."
                          : `Bekräfta & importera (${previewResult.validCount})`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
