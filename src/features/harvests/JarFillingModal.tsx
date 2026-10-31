import React, { useState, useEffect } from "react";
import { Harvest, HoneyPreparationType } from "../../domain/types";
import { formatDate } from "../../domain/validation";
import { X, Check, PackageCheck, Droplet, Sparkles } from "lucide-react";
import { useBottomSheet } from "../../hooks/useBottomSheet";
import { BottomSheetDragHandle } from "../../components/ui/BottomSheetDragHandle";

interface JarFillingModalProps {
  harvests: Harvest[];
  initialHarvestId?: string;
  onClose: () => void;
  onSaveFilling: (
    harvestId: string,
    data: {
      date: string;
      jarCount: number;
      jarSizeGrams: number;
      honeyType?: HoneyPreparationType;
      notes?: string;
    },
  ) => Promise<void>;
}

export const JarFillingModal: React.FC<JarFillingModalProps> = ({
  harvests,
  initialHarvestId,
  onClose,
  onSaveFilling,
}) => {
  const [selectedHarvestId, setSelectedHarvestId] = useState(
    initialHarvestId || (harvests[0]?.id ?? ""),
  );
  const [date, setDate] = useState(formatDate(new Date()));
  const [jarCount, setJarCount] = useState("24");
  const [jarSizeGrams, setJarSizeGrams] = useState(500);
  const [customJarSize, setCustomJarSize] = useState("");
  const [honeyType, setHoneyType] = useState<HoneyPreparationType>("rörd");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedHarvest = harvests.find((h) => h.id === selectedHarvestId);

  // Auto-detect default honey type based on harvest slungningsdatum:
  // If tapped within 30 days of slungning, default to "nyslungad", else "rörd"
  useEffect(() => {
    if (selectedHarvest?.date && date) {
      const harvestTime = new Date(selectedHarvest.date).getTime();
      const fillingTime = new Date(date).getTime();
      const diffDays = Math.round((fillingTime - harvestTime) / (1000 * 60 * 60 * 24));
      if (diffDays <= 30 && diffDays >= 0) {
        setHoneyType("nyslungad");
      } else {
        setHoneyType("rörd");
      }
    }
  }, [selectedHarvest?.date, date]);

  // Calculate current jarred and remaining for selected batch
  const effectiveJarSize = jarSizeGrams === -1 ? parseInt(customJarSize, 10) || 500 : jarSizeGrams;
  const count = parseInt(jarCount, 10) || 0;
  const thisFillingGrams = count * effectiveJarSize;

  let previousJarredGrams = 0;
  let previousJarCount = 0;
  if (selectedHarvest?.fillings && selectedHarvest.fillings.length > 0) {
    for (const f of selectedHarvest.fillings) {
      previousJarredGrams += (f.jarCount || 0) * (f.jarSizeGrams || 500);
      previousJarCount += f.jarCount || 0;
    }
  } else if (selectedHarvest?.jarCount && selectedHarvest?.jarSizeGrams) {
    previousJarredGrams = selectedHarvest.jarCount * selectedHarvest.jarSizeGrams;
    previousJarCount = selectedHarvest.jarCount;
  }

  const hasScaleEstimate = Boolean(selectedHarvest?.honeyWeightGrams && selectedHarvest.honeyWeightGrams > 0);
  const totalExtractedGrams = selectedHarvest?.honeyWeightGrams || 0;
  const remainingBeforeGrams = Math.max(0, totalExtractedGrams - previousJarredGrams);
  const remainingAfterGrams = Math.max(0, remainingBeforeGrams - thisFillingGrams);

  const newTotalJarredGrams = previousJarredGrams + thisFillingGrams;
  const newTotalJarCount = previousJarCount + count;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedHarvestId) {
      setError("Välj ett skördeparti / batch att tappa från.");
      return;
    }

    if (count <= 0) {
      setError("Ange ett giltigt antal burkar (större än 0).");
      return;
    }

    if (effectiveJarSize <= 0) {
      setError("Ange en giltig burkstorlek i gram.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSaveFilling(selectedHarvestId, {
        date,
        jarCount: count,
        jarSizeGrams: effectiveJarSize,
        honeyType,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Kunde inte registrera burkfyllningen.");
      setIsSubmitting(false);
    }
  };

  const { contentRef, bottomSheetHandlers } = useBottomSheet({ onClose });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={contentRef}
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        {...bottomSheetHandlers}
      >
        <BottomSheetDragHandle />
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "var(--color-honey-surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-honey-base)",
              }}
            >
              <PackageCheck size={18} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: "1.15rem", margin: 0 }}>
                Tappa honung på burk
              </h2>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                Registrera antal burkar och honungstyp (nyslungad eller rörd)
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Stäng">
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}
        >
          <div className="modal-scroll-body">
            {error && (
              <div className="form-error" style={{ marginBottom: "1rem" }}>
                {error}
              </div>
            )}

            {/* Select batch */}
            <div className="form-group">
              <label className="form-label" htmlFor="filling-harvest">
                Skördeparti / Batch att tappa från *
              </label>
              <select
                id="filling-harvest"
                className="form-select"
                value={selectedHarvestId}
                onChange={(e) => setSelectedHarvestId(e.target.value)}
                required
              >
                {harvests.map((h) => {
                  const title =
                    h.batchName ||
                    `Skörd ${h.date} (${h.honeyWeightGrams ? (h.honeyWeightGrams / 1000).toFixed(1) + " kg" : "löpande tappning"})`;
                  return (
                    <option key={h.id} value={h.id}>
                      {title}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Batch Status Card */}
            {selectedHarvest && (
              <div
                style={{
                  background: "var(--color-surface-inset)",
                  border: "1px solid var(--color-border-subtle)",
                  padding: "0.85rem",
                  borderRadius: "10px",
                  marginBottom: "1rem",
                  fontSize: "0.85rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "var(--color-accent-dark)",
                    fontWeight: 700,
                    marginBottom: "0.3rem",
                  }}
                >
                  <span>{selectedHarvest.batchName || "Valt parti"}</span>
                  {selectedHarvest.waterContentPercent && (
                    <span style={{ color: "var(--color-primary-base)" }}>💧 {selectedHarvest.waterContentPercent}% vattenhalt</span>
                  )}
                </div>

                <div style={{ color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                  {hasScaleEstimate ? (
                    <>
                      <div>
                        Grovt estimat vid slungning:{" "}
                        <strong>{(totalExtractedGrams / 1000).toFixed(1).replace(".", ",")} kg</strong>
                      </div>
                      <div>
                        Kvar i kärl före denna tappning:{" "}
                        <strong>{(remainingBeforeGrams / 1000).toFixed(1).replace(".", ",")} kg</strong>
                        {thisFillingGrams > 0 && (
                          <span style={{ color: "var(--color-text-muted)" }}>
                            {" "}→ efter tappning: {(remainingAfterGrams / 1000).toFixed(1).replace(".", ",")} kg
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div>
                      Hittills upptappat:{" "}
                      <strong>
                        {(previousJarredGrams / 1000).toFixed(1).replace(".", ",")} kg ({previousJarCount} burkar)
                      </strong>
                      {count > 0 && (
                        <div style={{ color: "var(--color-success-text)", fontWeight: 600, marginTop: "0.2rem" }}>
                          ✓ Efter denna tappning: {(newTotalJarredGrams / 1000).toFixed(1).replace(".", ",")} kg ({newTotalJarCount} burkar)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. Honey Type Selector (Nyslungad vs Rörd) */}
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                Honungstyp / Beredning *
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                <button
                  type="button"
                  onClick={() => setHoneyType("nyslungad")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.75rem",
                    borderRadius: "10px",
                    border: `2px solid ${honeyType === "nyslungad" ? "var(--color-honey-base)" : "var(--color-border)"}`,
                    background: honeyType === "nyslungad" ? "var(--color-honey-surface)" : "var(--color-surface)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Droplet size={20} color="var(--color-honey-base)" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: honeyType === "nyslungad" ? "var(--color-honey-text)" : "var(--color-text-primary)" }}>
                      Nyslungad
                    </div>
                    <div style={{ fontSize: "0.725rem", color: "var(--color-text-muted)" }}>
                      Flytande, färsk
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setHoneyType("rörd")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.75rem",
                    borderRadius: "10px",
                    border: `2px solid ${honeyType === "rörd" ? "var(--color-primary-base)" : "var(--color-border)"}`,
                    background: honeyType === "rörd" ? "var(--color-primary-surface)" : "var(--color-surface)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Sparkles size={20} color="var(--color-primary-base)" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: honeyType === "rörd" ? "var(--color-accent-dark)" : "var(--color-text-primary)" }}>
                      Rörd honung
                    </div>
                    <div style={{ fontSize: "0.725rem", color: "var(--color-text-muted)" }}>
                      Krämig, ympad & mognad
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Date and Jar count */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="filling-date">
                  Tappningsdatum *
                </label>
                <input
                  id="filling-date"
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="filling-count">
                  Antal burkar *
                </label>
                <input
                  id="filling-count"
                  type="number"
                  min="1"
                  className="form-input"
                  value={jarCount}
                  onChange={(e) => setJarCount(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>
            </div>

            {/* Jar Size Selector */}
            <div className="form-group" style={{ marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                  Burkstorlek
                </label>
                <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                  Denna tappning: <strong>{((count * effectiveJarSize) / 1000).toFixed(1)} kg</strong>
                </span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setJarSizeGrams(500)}
                  className={`btn ${jarSizeGrams === 500 ? "btn-primary" : "btn-secondary"}`}
                  style={{ fontWeight: 700, padding: "0.45rem 1rem" }}
                >
                  500 g (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setJarSizeGrams(350)}
                  className={`btn btn-sm ${jarSizeGrams === 350 ? "btn-primary" : "btn-secondary"}`}
                >
                  350 g
                </button>
                <button
                  type="button"
                  onClick={() => setJarSizeGrams(250)}
                  className={`btn btn-sm ${jarSizeGrams === 250 ? "btn-primary" : "btn-secondary"}`}
                >
                  250 g
                </button>
                <button
                  type="button"
                  onClick={() => setJarSizeGrams(700)}
                  className={`btn btn-sm ${jarSizeGrams === 700 ? "btn-primary" : "btn-secondary"}`}
                >
                  700 g
                </button>
                <button
                  type="button"
                  onClick={() => setJarSizeGrams(-1)}
                  className={`btn btn-sm ${jarSizeGrams === -1 ? "btn-primary" : "btn-secondary"}`}
                >
                  Annan...
                </button>
              </div>
              {jarSizeGrams === -1 && (
                <input
                  type="number"
                  min="50"
                  className="form-input"
                  placeholder="Ange burkstorlek i gram, t.ex. 400"
                  value={customJarSize}
                  onChange={(e) => setCustomJarSize(e.target.value)}
                  style={{ marginTop: "0.3rem" }}
                  required
                />
              )}
            </div>

            {/* Notes (Optional) */}
            <div className="form-group">
              <label className="form-label" htmlFor="filling-notes">
                Anteckning (valfritt)
              </label>
              <input
                id="filling-notes"
                type="text"
                className="form-input"
                placeholder="t.ex. Parti 1, etiketterade med bäst-före 2028"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Pinned Modal Actions */}
          <div
            className="modal-actions"
            style={{
              marginTop: "0.75rem",
              paddingTop: "0.75rem",
              borderTop: "1px solid var(--color-border-subtle)",
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ flex: 1, justifyContent: "center" }}
            >
              <Check size={16} />
              <span>
                {isSubmitting
                  ? "Sparar..."
                  : `Spara ${count} st ${effectiveJarSize}g (${honeyType === "nyslungad" ? "nyslungad" : "rörd"})`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
