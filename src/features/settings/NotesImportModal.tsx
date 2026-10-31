import React, { useState } from "react";
import { Hive } from "../../domain/types";
import { parseHistoricalNotes, normalizeHiveName, ParsedNotesResult } from "../../import/notesParser";
import { X, Upload, Check, FileText, ArrowRight, Plus } from "lucide-react";
import { useBottomSheet } from "../../hooks/useBottomSheet";
import { BottomSheetDragHandle } from "../../components/ui/BottomSheetDragHandle";

interface NotesImportModalProps {
  existingHives: Hive[];
  onClose: () => void;
  onConfirmImport: (result: ParsedNotesResult) => Promise<void>;
  onExportBackup: () => void;
}

export const NotesImportModal: React.FC<NotesImportModalProps> = ({
  existingHives,
  onClose,
  onConfirmImport,
  onExportBackup: _onExportBackup,
}) => {
  const [notesText, setNotesText] = useState("");
  const [previewResult, setPreviewResult] = useState<ParsedNotesResult | null>(null);
  const [step, setStep] = useState<"input" | "preview">("input");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setNotesText(text);
      processNotes(text);
    };
    reader.readAsText(file, "utf-8");
  };

  const processNotes = (text: string) => {
    try {
      setError(null);
      const res = parseHistoricalNotes(text, existingHives);
      setPreviewResult(res);
      setStep("preview");
    } catch (err: any) {
      setError(err.message || "Fel vid tolkning av anteckningar");
    }
  };

  const handleConfirm = async () => {
    if (!previewResult || isSubmitting) return;
    try {
      setIsSubmitting(true);
      await onConfirmImport(previewResult);
      onClose();
    } catch (err: any) {
      setError(err.message || "Kunde inte importera anteckningarna");
      setIsSubmitting(false);
    }
  };

  const [newHiveInput, setNewHiveInput] = useState("");

  const handleRemoveHive = (nameToRemove: string) => {
    if (!previewResult) return;
    const remainingHives = previewResult.detectedHives.filter((h) => h.name !== nameToRemove);
    const fallbackHive = remainingHives[0]?.name || "Kupa A";
    setPreviewResult({
      ...previewResult,
      detectedHives: remainingHives,
      events: previewResult.events.map((ev) =>
        ev.hiveName === nameToRemove ? { ...ev, hiveName: fallbackHive } : ev,
      ),
      harvests: previewResult.harvests.map((h) =>
        h.hiveName === nameToRemove ? { ...h, hiveName: fallbackHive } : h,
      ),
    });
  };

  const handleAddHive = () => {
    const trimmed = newHiveInput.trim();
    if (!trimmed || !previewResult) return;
    const norm = normalizeHiveName(trimmed);
    if (previewResult.detectedHives.some((h) => h.name.toLowerCase() === norm.toLowerCase())) {
      setNewHiveInput("");
      return;
    }
    const isNew = !existingHives.some((eh) => eh.name.toLowerCase() === norm.toLowerCase());
    setPreviewResult({
      ...previewResult,
      detectedHives: [...previewResult.detectedHives, { name: norm, isNew }],
    });
    setNewHiveInput("");
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
            <h2 className="modal-title">Importera historiska anteckningar</h2>
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
              Klistra in dina gamla anteckningar från Google Keep eller textfiler. Sektioner som{" "}
              <em>Köpa</em>, <em>Skörd</em>, <em>Loggbok</em>, <em>Kupa A/B/C</em> och{" "}
              <em>Nästa gång</em> tolkas och delas upp i uppgifter, skördar och händelser med
              fullständigt bevarad originaltext.
            </p>

            <div
              style={{
                background: "var(--color-surface-inset)",
                border: "1px solid var(--color-border-subtle)",
                borderRadius: "8px",
                padding: "0.65rem 0.85rem",
                marginBottom: "1rem",
                fontSize: "0.8rem",
                color: "var(--color-text-muted)",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  color: "var(--color-text-main)",
                  marginBottom: "0.25rem",
                }}
              >
                💡 Rekommenderat anteckningsformat för bästa tolkning:
              </div>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", lineHeight: 1.5 }}>
                <li>
                  <strong>Kupsektioner:</strong> Skriv <code># Kupa A</code>, <code>Kupa A:</code>{" "}
                  eller <code>Kupa A</code> som egen rad före noteringarna.
                </li>
                <li>
                  <strong>Avläggare:</strong> Skriv <code># Avläggare 2026</code> eller{" "}
                  <code>Avläggare 2026:</code> för att skilja kupan från ordet "avläggare" i löptext.
                </li>
                <li>
                  <strong>Datum:</strong> Skriv datum först på raden, t.ex.{" "}
                  <code>2026-05-15: Kupa A - 4 ramar yngel</code>.
                </li>
              </ul>
            </div>

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
                  <div style={{ fontWeight: 700 }}>Välj text- eller markdown-fil (.txt / .md)</div>
                </div>
                <input
                  type="file"
                  accept=".txt,.md"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Eller klistra in anteckningstexten direkt här:</label>
              <textarea
                className="form-textarea"
                rows={8}
                placeholder={`# Köpa\n- Apistan\n- 50 st burkar\n\n# Kupa A\n- 2026-05-15: Drottning sedd, 4 ramar yngel\n\n# Skörd\n- 45 st 500 g burkar`}
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>
                Avbryt
              </button>
              <button
                className="btn btn-primary"
                onClick={() => processNotes(notesText)}
                disabled={!notesText.trim()}
              >
                <span>Granska innehåll</span>
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
                      Identifierade kupor
                    </div>
                    <div
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 800,
                        color: "var(--color-primary)",
                      }}
                    >
                      {previewResult.detectedHives.length}
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
                      Loggade händelser
                    </div>
                    <div
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 800,
                        color: "var(--color-success)",
                      }}
                    >
                      {previewResult.events.length}
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
                      Uppgifter (Köpa/Nästa)
                    </div>
                    <div
                      style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-info)" }}
                    >
                      {previewResult.tasks.length}
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
                      Skördeposter
                    </div>
                    <div
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 800,
                        color: "var(--color-accent-dark)",
                      }}
                    >
                      {previewResult.harvests.length}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--color-warning-surface)",
                    border: "1px solid var(--color-warning-border)",
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    marginBottom: "0.75rem",
                    fontSize: "0.875rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "var(--color-warning-text)" }}>
                      Identifierade kupor/avläggare ({previewResult.detectedHives.length} st):
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-warning-text)", opacity: 0.85 }}>
                      Klicka på kryss för att ta bort, eller lägg till saknad kupa nedan
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    {previewResult.detectedHives.map((h) => (
                      <span
                        key={h.name}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.25rem 0.6rem",
                          borderRadius: "16px",
                          background: "var(--color-surface-bg)",
                          border: "1px solid var(--color-warning-border)",
                          color: "var(--color-warning-text)",
                          fontWeight: 500,
                          fontSize: "0.85rem",
                        }}
                      >
                        {h.name} {h.isNew ? "(ny)" : "(finns redan)"}
                        <button
                          type="button"
                          onClick={() => handleRemoveHive(h.name)}
                          title={`Ta bort ${h.name} från importen`}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "0 2px",
                            display: "inline-flex",
                            alignItems: "center",
                            color: "var(--color-warning-text)",
                          }}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add missing hive input */}
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: "0.35rem 0.6rem", fontSize: "0.85rem", flex: 1 }}
                      placeholder="Saknas en kupa? Skriv t.ex. 'Kupa B' eller 'Avläggare 2026'..."
                      value={newHiveInput}
                      onChange={(e) => setNewHiveInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddHive();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleAddHive}
                      disabled={!newHiveInput.trim()}
                    >
                      <Plus size={14} />
                      <span>Lägg till kupa</span>
                    </button>
                  </div>
                </div>

                {previewResult.unclassifiedEntries.length > 0 && (
                  <div
                    style={{
                      background: "var(--color-surface-inset)",
                      border: "1px solid var(--color-border-subtle)",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "8px",
                      marginBottom: "0.75rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <strong>
                      {previewResult.unclassifiedEntries.length} oklassificerade rader
                    </strong>{" "}
                    (saknade datum, sparas som allmänna anteckningar så ingen data förloras).
                  </div>
                )}

                <div className="modal-actions" style={{ marginTop: "1.25rem" }}>
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
                    disabled={isSubmitting}
                  >
                    <Check size={16} />
                    <span>{isSubmitting ? "Sparar..." : "Bekräfta & skapa poster"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
