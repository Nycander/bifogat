import React, { useState } from "react";
import { Hive, HiveStatus } from "../../domain/types";
import { X, Check } from "lucide-react";
import { useBottomSheet } from "../../hooks/useBottomSheet";
import { BottomSheetDragHandle } from "../../components/ui/BottomSheetDragHandle";

interface HiveEditModalProps {
  hive?: Hive;
  onClose: () => void;
  onSave: (data: { name: string; status: HiveStatus; notes?: string }) => Promise<void>;
}

export const HiveEditModal: React.FC<HiveEditModalProps> = ({ hive, onClose, onSave }) => {
  const [name, setName] = useState(hive?.name || "");
  const [status, setStatus] = useState<HiveStatus>(hive?.status || "active");
  const [notes, setNotes] = useState(hive?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Kupans namn kan inte vara tomt");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        name: name.trim(),
        status,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Kunde inte spara kupan");
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
          <h2 className="modal-title">{hive ? "Redigera kupa" : "Lägg till ny kupa"}</h2>
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

          <div className="form-group">
            <label className="form-label" htmlFor="hive-name">
              Kupnamn / beteckning *
            </label>
            <input
              id="hive-name"
              type="text"
              className="form-input"
              placeholder="t.ex. Kupa A, Bigård Skogen 2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="hive-status">
              Status
            </label>
            <select
              id="hive-status"
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as HiveStatus)}
            >
              <option value="active">Aktiv (i drift)</option>
              <option value="inactive">Inaktiv (tom / vilande)</option>
              <option value="merged">Sammanslagen med annan koloni</option>
              <option value="archived">Arkiverad</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="hive-notes">
              Anteckningar om kupan / kolonin
            </label>
            <textarea
              id="hive-notes"
              className="form-textarea"
              placeholder="Drottningursprung, årtal, rammått (t.ex. Svea, LN, Dadant)..."
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
              <span>{isSubmitting ? "Sparar..." : "Spara kupa"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
