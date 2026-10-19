import React, { useState } from "react";
import { Task, Hive } from "../../domain/types";
import { X, Check } from "lucide-react";

interface TaskFormModalProps {
  task?: Task;
  hives: Hive[];
  initialHiveId?: string;
  onClose: () => void;
  onSave: (data: {
    title: string;
    notes?: string;
    hiveId?: string;
    dueDate?: string;
  }) => Promise<void>;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  task,
  hives,
  initialHiveId,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(task?.title || "");
  const [notes, setNotes] = useState(task?.notes || "");
  const [hiveId, setHiveId] = useState(task?.hiveId || initialHiveId || "");
  const [dueDate, setDueDate] = useState(task?.dueDate || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Beskrivning av uppgiften måste fyllas i");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        title: title.trim(),
        notes: notes.trim() || undefined,
        hiveId: hiveId || undefined,
        dueDate: dueDate || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Kunde inte spara uppgiften");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{task ? "Redigera uppgift" : "Ny uppgift / att göra"}</h2>
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
            <label className="form-label" htmlFor="task-title">
              Uppgift *
            </label>
            <input
              id="task-title"
              type="text"
              className="form-input"
              placeholder="t.ex. Köpa 50 st burkar, Kolla svärmceller"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="task-due">
                Förfallodatum (valfritt)
              </label>
              <input
                id="task-due"
                type="date"
                className="form-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="task-hive">
                Koppla till kupa (valfritt)
              </label>
              <select
                id="task-hive"
                className="form-select"
                value={hiveId}
                onChange={(e) => setHiveId(e.target.value)}
              >
                <option value="">Gäller hela bigården</option>
                {hives.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="task-notes">
              Ytterligare detaljer (valfritt)
            </label>
            <textarea
              id="task-notes"
              className="form-textarea"
              placeholder="Inköpsställe, utrustning som behövs, instruktioner..."
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
              <span>{isSubmitting ? "Sparar..." : "Spara uppgift"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
