import React, { useState } from "react";
import { Harvest, Hive } from "../../domain/types";
import { formatDate } from "../../domain/validation";
import { X, Check, Droplet, Sparkles } from "lucide-react";

interface HarvestFormModalProps {
  harvest?: Harvest;
  hives: Hive[];
  onClose: () => void;
  onSave: (data: {
    batchName?: string;
    date: string;
    collectedDates?: string;
    hiveId?: string;
    honeyWeightGrams?: number;
    waterContentPercent?: number;
    notes?: string;
  }) => Promise<void>;
}

export const HarvestFormModal: React.FC<HarvestFormModalProps> = ({
  harvest,
  hives,
  onClose,
  onSave,
}) => {
  const currentYear = new Date().getFullYear();
  const defaultBatchName = harvest?.batchName || `Sommarskörd ${currentYear}`;

  const [batchName, setBatchName] = useState(defaultBatchName);
  const [date, setDate] = useState(harvest?.date || formatDate(new Date()));
  const [collectedDates, setCollectedDates] = useState(harvest?.collectedDates || "");
  const [hiveId, setHiveId] = useState(harvest?.hiveId || "");
  const [weightKg, setWeightKg] = useState(
    harvest?.honeyWeightGrams !== undefined ? (harvest.honeyWeightGrams / 1000).toString() : "",
  );
  const [waterContent, setWaterContent] = useState(
    harvest?.waterContentPercent !== undefined ? harvest.waterContentPercent.toString() : "",
  );
  const [notes, setNotes] = useState(harvest?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let honeyWeightGrams: number | undefined;
    if (weightKg.trim()) {
      const kg = parseFloat(weightKg.replace(",", "."));
      if (isNaN(kg) || kg < 0) {
        setError("Ange en giltig vikt i kg");
        return;
      }
      honeyWeightGrams = Math.round(kg * 1000);
    }

    let parsedWaterContent: number | undefined;
    if (waterContent.trim()) {
      const wc = parseFloat(waterContent.replace(",", "."));
      if (isNaN(wc) || wc < 0 || wc > 40) {
        setError("Ange en rimlig vattenhalt i procent (t.ex. 17.5%)");
        return;
      }
      parsedWaterContent = wc;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        batchName: batchName.trim() || `Skörd ${date}`,
        date,
        collectedDates: collectedDates.trim() || undefined,
        hiveId: hiveId || undefined,
        honeyWeightGrams,
        waterContentPercent: parsedWaterContent,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Kunde inte spara skördepartiet");
      setIsSubmitting(false);
    }
  };

  // Water content quality indicator
  const numWater = parseFloat(waterContent.replace(",", "."));
  let waterQuality: { text: string; color: string; bg: string } | null = null;
  if (!isNaN(numWater)) {
    if (numWater < 18) {
      waterQuality = {
        text: "Utmärkt kvalitet (< 18% vattenhalt, mycket hållbar)",
        color: "#166534",
        bg: "#f0fdf4",
      };
    } else if (numWater <= 20) {
      waterQuality = {
        text: "Godkänd svensk standard (18–20% vattenhalt)",
        color: "#854d0e",
        bg: "#fefce8",
      };
    } else {
      waterQuality = {
        text: "Varning: Hög vattenhalt (> 20%). Risk för jäsning!",
        color: "#991b1b",
        bg: "#fef2f2",
      };
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Droplet size={20} color="var(--color-primary)" />
            <h2 className="modal-title">
              {harvest ? "Redigera skördeparti" : "Registrera skördedag & slungning"}
            </h2>
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

          {/* Batch name and quick buttons */}
          <div className="form-group">
            <label className="form-label" htmlFor="batch-name">
              Partinamn / Batch *
            </label>
            <input
              id="batch-name"
              type="text"
              className="form-input"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder={`t.ex. Vårskörd ${currentYear} eller Sommarskörd ${currentYear}`}
              required
              autoFocus
            />
            <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
              {[`Vårskörd ${currentYear}`, `Sensommarskörd ${currentYear}`, `Ljunghonung ${currentYear}`].map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setBatchName(suggestion)}
                    style={{
                      background: "none",
                      border: "1px dashed var(--color-border)",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "12px",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    + {suggestion}
                  </button>
                ),
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="harvest-date">
                Slungningsdatum *
              </label>
              <input
                id="harvest-date"
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="harvest-hive">
                Bigård / Kupa
              </label>
              <select
                id="harvest-hive"
                className="form-select"
                value={hiveId}
                onChange={(e) => setHiveId(e.target.value)}
              >
                <option value="">Gemensam skörd / hela bigården</option>
                {hives.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} {h.status !== "active" ? `(${h.status})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="harvest-collected">
              Insamlingsperiod / Datum när ramar togs in (valfritt)
            </label>
            <input
              id="harvest-collected"
              type="text"
              className="form-input"
              placeholder="t.ex. 2026-06-10 till 2026-06-12"
              value={collectedDates}
              onChange={(e) => setCollectedDates(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="harvest-weight">
                Slungad mängd honung (kg)
              </label>
              <input
                id="harvest-weight"
                type="text"
                className="form-input"
                placeholder="t.ex. 35,5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
              <span className="form-help">Total vikt i kärl efter slungning & silning</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="harvest-water">
                Vattenhalt (%)
              </label>
              <input
                id="harvest-water"
                type="text"
                className="form-input"
                placeholder="t.ex. 17,4"
                value={waterContent}
                onChange={(e) => setWaterContent(e.target.value)}
              />
              <span className="form-help">Mätt med refraktometer</span>
            </div>
          </div>

          {/* Water quality feedback */}
          {waterQuality && (
            <div
              style={{
                background: waterQuality.bg,
                color: waterQuality.color,
                border: `1px solid ${waterQuality.color}33`,
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                marginBottom: "1rem",
                fontSize: "0.825rem",
                fontWeight: 500,
              }}
            >
              💧 {waterQuality.text}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="harvest-notes">
              Dragkälla & anteckningar
            </label>
            <textarea
              id="harvest-notes"
              className="form-textarea"
              placeholder="t.ex. Raps och maskros, rörd med ymp från förra året, mognad i 3 dagar..."
              rows={3}
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
              <span>{isSubmitting ? "Sparar..." : "Spara skördeparti"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
