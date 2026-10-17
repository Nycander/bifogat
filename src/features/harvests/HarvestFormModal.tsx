import React, { useState } from "react";
import { Harvest, Hive } from "../../domain/types";
import { formatDate } from "../../domain/validation";
import { X, Check } from "lucide-react";

interface HarvestFormModalProps {
  harvest?: Harvest;
  hives: Hive[];
  onClose: () => void;
  onSave: (data: {
    date: string;
    hiveId?: string;
    honeyWeightGrams?: number;
    jarSizeGrams?: number;
    jarCount?: number;
    notes?: string;
  }) => Promise<void>;
}

export const HarvestFormModal: React.FC<HarvestFormModalProps> = ({
  harvest,
  hives,
  onClose,
  onSave,
}) => {
  const [date, setDate] = useState(harvest?.date || formatDate(new Date()));
  const [hiveId, setHiveId] = useState(harvest?.hiveId || "");
  // For easy user entry, let user enter weight in kg or grams
  const [weightKg, setWeightKg] = useState(
    harvest?.honeyWeightGrams !== undefined ? (harvest.honeyWeightGrams / 1000).toString() : "",
  );
  const [jarCount, setJarCount] = useState(
    harvest?.jarCount !== undefined ? harvest.jarCount.toString() : "",
  );
  const [jarSizeGrams, setJarSizeGrams] = useState(
    harvest?.jarSizeGrams ? harvest.jarSizeGrams.toString() : "500",
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

    let parsedJarCount: number | undefined;
    if (jarCount.trim()) {
      const count = parseInt(jarCount, 10);
      if (isNaN(count) || count < 0) {
        setError("Ange ett giltigt antal burkar");
        return;
      }
      parsedJarCount = count;
    }

    const parsedJarSize = jarSizeGrams.trim() ? parseInt(jarSizeGrams, 10) : undefined;

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        date,
        hiveId: hiveId || undefined,
        honeyWeightGrams,
        jarCount: parsedJarCount,
        jarSizeGrams: parsedJarSize,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Kunde inte spara skörderesultatet");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{harvest ? "Redigera skörd" : "Registrera honungsskörd"}</h2>
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="harvest-date">
                Skördedatum *
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
                Kupa (valfritt)
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
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="harvest-weight">
                Vikt slungad honung (kg)
              </label>
              <input
                id="harvest-weight"
                type="text"
                className="form-input"
                placeholder="t.ex. 22,5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
              <span className="form-help">Lämna tomt om okänd</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="harvest-jars">
                Antal burkar
              </label>
              <input
                id="harvest-jars"
                type="number"
                min="0"
                className="form-input"
                placeholder="t.ex. 45"
                value={jarCount}
                onChange={(e) => setJarCount(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="harvest-jarsize">
              Burkstorlek (gram)
            </label>
            <input
              id="harvest-jarsize"
              type="number"
              min="0"
              className="form-input"
              value={jarSizeGrams}
              onChange={(e) => setJarSizeGrams(e.target.value)}
              placeholder="500"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="harvest-notes">
              Anteckningar
            </label>
            <textarea
              id="harvest-notes"
              className="form-textarea"
              placeholder="Vattenhalt (t.ex. 17.5%), dragkälla (raps, lind, ljung), ympning..."
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
              <span>{isSubmitting ? "Sparar..." : "Spara skörd"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
