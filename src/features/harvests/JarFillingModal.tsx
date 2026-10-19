import React, { useState } from "react";
import { Harvest } from "../../domain/types";
import { formatDate } from "../../domain/validation";
import { X, Check, Droplet, PackageCheck } from "lucide-react";

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
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedHarvest = harvests.find((h) => h.id === selectedHarvestId);

  // Calculate current jarred and remaining for selected batch
  const effectiveJarSize = jarSizeGrams === -1 ? parseInt(customJarSize, 10) || 500 : jarSizeGrams;
  const count = parseInt(jarCount, 10) || 0;
  const thisFillingGrams = count * effectiveJarSize;

  let previousJarredGrams = 0;
  if (selectedHarvest?.fillings && selectedHarvest.fillings.length > 0) {
    previousJarredGrams = selectedHarvest.fillings.reduce(
      (sum, f) => sum + f.jarCount * f.jarSizeGrams,
      0,
    );
  } else if (selectedHarvest?.jarCount && selectedHarvest?.jarSizeGrams) {
    previousJarredGrams = selectedHarvest.jarCount * selectedHarvest.jarSizeGrams;
  }

  const totalExtractedGrams = selectedHarvest?.honeyWeightGrams || 0;
  const remainingBeforeGrams = Math.max(0, totalExtractedGrams - previousJarredGrams);
  const remainingAfterGrams = Math.max(0, remainingBeforeGrams - thisFillingGrams);

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
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Kunde inte registrera burkfyllningen.");
      setIsSubmitting(false);
    }
  };

  const commonSizes = [250, 350, 500, 700];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <PackageCheck size={20} color="var(--color-primary)" />
            <h2 className="modal-title">Tappa honung på burk</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Stäng">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
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
                  `Skörd ${h.date} (${h.honeyWeightGrams ? (h.honeyWeightGrams / 1000).toFixed(1) + " kg" : "okänd vikt"})`;
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
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                padding: "0.75rem",
                borderRadius: "8px",
                marginBottom: "1rem",
                fontSize: "0.85rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#166534",
                  fontWeight: 600,
                  marginBottom: "0.3rem",
                }}
              >
                <span>Status för {selectedHarvest.batchName || "valt parti"}:</span>
                {selectedHarvest.waterContentPercent && (
                  <span>💧 {selectedHarvest.waterContentPercent}% vattenhalt</span>
                )}
              </div>
              <div style={{ color: "#374151" }}>
                Totalt slungat:{" "}
                <strong>
                  {totalExtractedGrams > 0
                    ? `${(totalExtractedGrams / 1000).toFixed(1).replace(".", ",")} kg`
                    : "Ej angivet"}
                </strong>
                {totalExtractedGrams > 0 && (
                  <span>
                    {" · "}
                    Kvar i kärl före denna tappning:{" "}
                    <strong>
                      {(remainingBeforeGrams / 1000).toFixed(1).replace(".", ",")} kg
                    </strong>
                  </span>
                )}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
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
                required
                autoFocus
              />
            </div>
          </div>

          {/* Jar Size Selector */}
          <div className="form-group">
            <label className="form-label">Burkstorlek</label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
              {commonSizes.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setJarSizeGrams(sz)}
                  className={`btn btn-sm ${jarSizeGrams === sz ? "btn-primary" : "btn-secondary"}`}
                >
                  {sz} g
                </button>
              ))}
              <button
                type="button"
                onClick={() => setJarSizeGrams(-1)}
                className={`btn btn-sm ${jarSizeGrams === -1 ? "btn-primary" : "btn-secondary"}`}
              >
                Annan storlek...
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
                required
              />
            )}
          </div>

          {/* Dynamic calculation banner */}
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              padding: "0.65rem 0.85rem",
              borderRadius: "8px",
              marginBottom: "1rem",
              fontSize: "0.85rem",
              color: "#92400e",
            }}
          >
            <div>
              <strong>Denna tappning:</strong> {count} st burkar à {effectiveJarSize} g ={" "}
              <strong>{(thisFillingGrams / 1000).toFixed(1).replace(".", ",")} kg honung</strong>.
            </div>
            {totalExtractedGrams > 0 && (
              <div style={{ marginTop: "0.2rem" }}>
                Kvar i mognadskärl efter tappning:{" "}
                <strong>
                  {(remainingAfterGrams / 1000).toFixed(1).replace(".", ",")} kg
                </strong>{" "}
                ({Math.round((remainingAfterGrams / totalExtractedGrams) * 100)}% av partiet).
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="filling-notes">
              Anteckningar / Partikod (frivilligt)
            </label>
            <input
              id="filling-notes"
              type="text"
              className="form-input"
              placeholder="t.ex. Bäst före 2028-08, etiketterad, gåva till grannen..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Avbryt
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <Check size={16} />
              <span>{isSubmitting ? "Sparar..." : "Spara burktappning"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
