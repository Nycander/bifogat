import React, { useState } from "react";
import { Task, Hive } from "../../domain/types";
import { X, Check, Layers, CheckSquare, Square } from "lucide-react";

interface TaskFormModalProps {
  task?: Task;
  hives: Hive[];
  initialHiveId?: string;
  onClose: () => void;
  onSave: (data: {
    title: string;
    notes?: string;
    hiveId?: string;
    hiveIds?: string[];
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
  const isEditing = Boolean(task);

  const [title, setTitle] = useState(task?.title || "");
  const [notes, setNotes] = useState(task?.notes || "");
  const [dueDate, setDueDate] = useState(task?.dueDate || "");

  // Hive assignment mode: "single" | "multiple" | "general"
  const defaultMode = isEditing
    ? task?.hiveId
      ? "single"
      : "general"
    : initialHiveId
      ? "single"
      : "single";

  const [assignMode, setAssignMode] = useState<"single" | "multiple" | "general">(defaultMode);
  const [singleHiveId, setSingleHiveId] = useState<string>(task?.hiveId || initialHiveId || (hives[0]?.id ?? ""));
  
  // Selected hives when assignMode === "multiple"
  const [selectedHiveIds, setSelectedHiveIds] = useState<string[]>(() => {
    if (initialHiveId) return [initialHiveId];
    // Default to all active hives
    const active = hives.filter((h) => h.status === "active").map((h) => h.id);
    return active.length > 0 ? active : hives.map((h) => h.id);
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeHives = hives.filter((h) => h.status === "active");

  const handleSelectAllActive = () => {
    setSelectedHiveIds(activeHives.map((h) => h.id));
  };

  const handleSelectAll = () => {
    setSelectedHiveIds(hives.map((h) => h.id));
  };

  const handleClearSelection = () => {
    setSelectedHiveIds([]);
  };

  const toggleHiveSelection = (id: string) => {
    setSelectedHiveIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Beskrivning av uppgiften måste fyllas i");
      return;
    }

    if (!isEditing && assignMode === "multiple" && selectedHiveIds.length === 0) {
      setError("Välj minst en kupa eller byt till 'Hela bigården'");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (isEditing) {
        await onSave({
          title: title.trim(),
          notes: notes.trim() || undefined,
          hiveId: assignMode === "general" ? undefined : singleHiveId || undefined,
          dueDate: dueDate || undefined,
        });
      } else if (assignMode === "multiple") {
        await onSave({
          title: title.trim(),
          notes: notes.trim() || undefined,
          hiveIds: selectedHiveIds,
          dueDate: dueDate || undefined,
        });
      } else if (assignMode === "single") {
        await onSave({
          title: title.trim(),
          notes: notes.trim() || undefined,
          hiveId: singleHiveId || undefined,
          dueDate: dueDate || undefined,
        });
      } else {
        // General apiary
        await onSave({
          title: title.trim(),
          notes: notes.trim() || undefined,
          hiveId: undefined,
          dueDate: dueDate || undefined,
        });
      }

      onClose();
    } catch (err: any) {
      setError(err.message || "Kunde inte spara uppgiften");
      setIsSubmitting(false);
    }
  };

  const getSubmitLabel = () => {
    if (isSubmitting) return "Sparar...";
    if (isEditing) return "Spara ändringar";
    if (assignMode === "multiple") {
      const count = selectedHiveIds.length;
      return count > 0 ? `Skapa uppgift i ${count} kupor` : "Välj kupor...";
    }
    if (assignMode === "general") return "Skapa för hela bigården";
    const hive = hives.find((h) => h.id === singleHiveId);
    return hive ? `Spara för ${hive.name}` : "Spara uppgift";
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEditing ? "Redigera uppgift" : "Ny uppgift / att göra"}
          </h2>
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
              placeholder="t.ex. Sätta på skattlåda, Oxalsyrabehandling, Kolla svärmceller"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

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

          {/* Hive Assignment Section */}
          <div
            style={{
              background: "var(--color-surface-inset)",
              border: "1px solid var(--color-border-subtle)",
              borderRadius: "8px",
              padding: "0.85rem",
              marginBottom: "1rem",
            }}
          >
            <label className="form-label" style={{ marginBottom: "0.45rem", fontWeight: 700 }}>
              Gäller vilka bisamhällen?
            </label>

            {!isEditing ? (
              <>
                {/* Mode selector pills */}
                <div style={{ display: "flex", gap: "0.35rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${assignMode === "single" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setAssignMode("single")}
                  >
                    En enskild kupa
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${assignMode === "multiple" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setAssignMode("multiple")}
                  >
                    Flera / Alla kupor
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${assignMode === "general" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setAssignMode("general")}
                  >
                    Hela bigården (allmän)
                  </button>
                </div>

                {/* Sub-view: Single hive */}
                {assignMode === "single" && (
                  <div>
                    <select
                      id="task-single-hive"
                      className="form-select"
                      value={singleHiveId}
                      onChange={(e) => setSingleHiveId(e.target.value)}
                    >
                      {hives.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} {h.status !== "active" ? `(${h.status})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sub-view: Multiple hives */}
                {assignMode === "multiple" && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                        flexWrap: "wrap",
                        gap: "0.4rem",
                      }}
                    >
                      <div style={{ display: "flex", gap: "0.35rem" }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                          onClick={handleSelectAllActive}
                        >
                          Välj aktiva ({activeHives.length})
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                          onClick={handleSelectAll}
                        >
                          Välj alla ({hives.length})
                        </button>
                      </div>
                      {selectedHiveIds.length > 0 && (
                        <button
                          type="button"
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--color-text-muted)",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                          onClick={handleClearSelection}
                        >
                          Rensa val
                        </button>
                      )}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                        gap: "0.4rem",
                        maxHeight: "160px",
                        overflowY: "auto",
                        padding: "0.25rem",
                        background: "var(--color-surface-bg)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "6px",
                      }}
                    >
                      {hives.map((h) => {
                        const isChecked = selectedHiveIds.includes(h.id);
                        return (
                          <label
                            key={h.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              padding: "0.4rem 0.5rem",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "0.85rem",
                              fontWeight: isChecked ? 600 : 400,
                              background: isChecked ? "var(--color-primary-light)" : "transparent",
                              border: `1px solid ${isChecked ? "var(--color-primary)" : "transparent"}`,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleHiveSelection(h.id)}
                              style={{ cursor: "pointer" }}
                            />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {h.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: "0.35rem", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      Samma uppgift skapas som ett eget att-göra för varje vald kupa ({selectedHiveIds.length} st valda).
                    </div>
                  </div>
                )}

                {/* Sub-view: General */}
                {assignMode === "general" && (
                  <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", margin: 0 }}>
                    Uppgiften kopplas inte till någon specifik kupa, utan gäller hela bigården i stort (t.ex. köpa burkar, städa slungrummet).
                  </p>
                )}
              </>
            ) : (
              // Editing mode: single hive dropdown
              <div>
                <select
                  id="task-edit-hive"
                  className="form-select"
                  value={singleHiveId}
                  onChange={(e) => setSingleHiveId(e.target.value)}
                >
                  <option value="">Gäller hela bigården</option>
                  {hives.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="task-notes">
              Ytterligare detaljer (valfritt)
            </label>
            <textarea
              id="task-notes"
              className="form-textarea"
              placeholder="Instruktioner, utrustning som behövs..."
              rows={2}
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
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || (!isEditing && assignMode === "multiple" && selectedHiveIds.length === 0)}
            >
              <Check size={16} />
              <span>{getSubmitLabel()}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
