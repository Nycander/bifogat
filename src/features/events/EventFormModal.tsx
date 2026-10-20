import React, { useState } from "react";
import { Hive, EventType, Task } from "../../domain/types";
import { formatDate } from "../../domain/validation";
import { X, Check, CheckSquare, Square, Plus, Trash2, Calendar, ClipboardList } from "lucide-react";

interface EventFormModalProps {
  hives: Hive[];
  initialHiveId?: string;
  tasks: Task[];
  onClose: () => void;
  onSave: (data: {
    hiveId: string;
    date: string;
    type: EventType;
    title: string;
    notes: string;
    completedTaskIds?: string[];
    newTasks?: Array<{ title: string; dueDate?: string }>;
  }) => Promise<void>;
}

export const EventFormModal: React.FC<EventFormModalProps> = ({
  hives,
  initialHiveId,
  tasks,
  onClose,
  onSave,
}) => {
  const [hiveId, setHiveId] = useState(initialHiveId || (hives[0]?.id ?? ""));
  const [date, setDate] = useState(formatDate(new Date()));
  const [type, setType] = useState<EventType>("inspection");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  // Todos to complete during this visit
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);

  // New todos to create for next visit
  const [newTasks, setNewTasks] = useState<Array<{ title: string; dueDate?: string }>>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter open tasks for this hive (plus general tasks without hive reference)
  const openTasksForThisHive = tasks.filter(
    (t) => t.status === "open" && (!t.hiveId || t.hiveId === hiveId),
  );

  const toggleTaskCompletion = (taskId: string) => {
    setCompletedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId],
    );
  };

  const handleAddNewTask = () => {
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;
    setNewTasks((prev) => [...prev, { title: trimmed, dueDate: newTaskDueDate || undefined }]);
    setNewTaskTitle("");
    setNewTaskDueDate("");
  };

  const handleRemoveNewTask = (index: number) => {
    setNewTasks((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!hiveId) {
      setError("Du måste välja en kupa");
      return;
    }
    if (!title.trim() && !notes.trim()) {
      setError("Fyll i åtminstone en kort sammanfattning eller anteckning");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        hiveId,
        date,
        type,
        title: title.trim() || "Kupbesök",
        notes: notes.trim(),
        completedTaskIds,
        newTasks,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Kunde inte spara kupbesöket");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: "620px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ClipboardList size={20} color="var(--color-primary)" />
            <h2 className="modal-title">Logga kupbesök & åtgärder</h2>
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

          {/* Hive & Date Selector */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "0.75rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="event-hive">
                Besökt kupa *
              </label>
              <select
                id="event-hive"
                className="form-select"
                value={hiveId}
                onChange={(e) => {
                  setHiveId(e.target.value);
                  setCompletedTaskIds([]);
                }}
                required
              >
                {hives.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} {h.status !== "active" ? `(${h.status})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="event-date">
                Besöksdatum *
              </label>
              <input
                id="event-date"
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* 1. Att göra inför detta besök */}
          <div
            className="box-success"
            style={{
              padding: "0.75rem 0.9rem",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.4rem",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-success-text)" }}>
                Att göra inför / under detta besök ({openTasksForThisHive.length} st):
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--color-success-text)", opacity: 0.85 }}>
                Bocka av det du har utfört
              </span>
            </div>

            {openTasksForThisHive.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: "var(--color-success-text)", fontStyle: "italic", opacity: 0.85 }}>
                Inga tidigare planerade uppgifter för denna kupa.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {openTasksForThisHive.map((task) => {
                  const isChecked = completedTaskIds.includes(task.id);
                  return (
                    <label
                      key={task.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        background: isChecked ? "var(--color-success-surface)" : "var(--color-surface-bg)",
                        padding: "0.35rem 0.6rem",
                        borderRadius: "6px",
                        border: "1px solid",
                        borderColor: isChecked ? "var(--color-success-border)" : "var(--color-border-subtle)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTaskCompletion(task.id)}
                        style={{ display: "none" }}
                      />
                      {isChecked ? (
                        <CheckSquare size={16} color="var(--color-success-base)" />
                      ) : (
                        <Square size={16} color="var(--color-text-secondary)" />
                      )}
                      <span
                        style={{
                          flex: 1,
                          textDecoration: isChecked ? "line-through" : "none",
                          color: isChecked ? "var(--color-success-text)" : "var(--color-text-primary)",
                          fontWeight: isChecked ? 600 : 400,
                        }}
                      >
                        {task.title}
                      </span>
                      {!task.hiveId && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            background: "var(--color-surface-inset)",
                            color: "var(--color-text-secondary)",
                            padding: "0.1rem 0.4rem",
                            borderRadius: "10px",
                          }}
                        >
                          Allmän
                        </span>
                      )}
                      {isChecked && (
                        <span style={{ fontSize: "0.7rem", color: "var(--color-success-text)", fontWeight: 600 }}>
                          Klar!
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Besökslogg (Typ & Sammanfattning) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="event-type">
                Typ av åtgärd
              </label>
              <select
                id="event-type"
                className="form-select"
                value={type}
                onChange={(e) => setType(e.target.value as EventType)}
              >
                <option value="inspection">Besiktning / Vårkoll</option>
                <option value="feeding">Foder / Invintring</option>
                <option value="treatment">Behandling (t.ex. Varroa)</option>
                <option value="equipment">Utrustning / Skattlådor</option>
                <option value="colony_change">Drottning / Avläggare</option>
                <option value="harvest">Skörd / Tömning</option>
                <option value="other">Övrigt</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="event-title">
                Kort sammanfattning *
              </label>
              <input
                id="event-title"
                type="text"
                className="form-input"
                placeholder="t.ex. Drottning sedd, 5 ramar yngel"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="event-notes">
              Observationer & anteckningar
            </label>
            <textarea
              id="event-notes"
              className="form-textarea"
              placeholder="Humör, foderstatus, drönarbygge, skattlådor..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* 3. Planera till nästa besök */}
          <div
            className="box-inset"
            style={{
              padding: "0.75rem 0.9rem",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: "0.875rem",
                color: "var(--color-text-primary)",
                marginBottom: "0.4rem",
              }}
            >
              Planera till nästa besök (skapa nya att-göra för denna kupa):
            </div>

            {newTasks.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.3rem",
                  marginBottom: "0.6rem",
                }}
              >
                {newTasks.map((nt, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "var(--color-surface-bg)",
                      border: "1px solid var(--color-border-subtle)",
                      padding: "0.3rem 0.5rem",
                      borderRadius: "6px",
                      fontSize: "0.825rem",
                    }}
                  >
                    <div>
                      <span>📌 {nt.title}</span>
                      {nt.dueDate && (
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginLeft: "0.5rem" }}>
                          (utförs senast: {nt.dueDate})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveNewTask(idx)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-danger-base)",
                        padding: "0 2px",
                      }}
                      title="Ta bort"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1, padding: "0.35rem 0.6rem", fontSize: "0.85rem" }}
                placeholder="t.ex. Sätta på skattlåda 2 eller Kolla drottningceller..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddNewTask();
                  }
                }}
              />
              <input
                type="date"
                className="form-input"
                style={{ width: "130px", padding: "0.35rem 0.4rem", fontSize: "0.8rem" }}
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                title="Förfallodatum (valfritt)"
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddNewTask}
                disabled={!newTaskTitle.trim()}
              >
                <Plus size={14} />
                <span>Lägg till</span>
              </button>
            </div>
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
              <span>{isSubmitting ? "Sparar..." : "Spara logg & uppgifter"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
