import React, { useState } from "react";
import { Hive, EventType, Task } from "../../domain/types";
import { formatDate } from "../../domain/validation";
import {
  X,
  Check,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  ClipboardList,
  ArrowRight,
  ArrowLeft,
  Search,
  Droplet,
  Shield,
  Layers,
  Crown,
  MoreHorizontal,
} from "lucide-react";
import { useBottomSheet } from "../../hooks/useBottomSheet";
import { BottomSheetDragHandle } from "../../components/ui/BottomSheetDragHandle";
import { deriveEventTitle } from "../../utils/eventTitleDerivation";

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
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [hiveId, setHiveId] = useState(initialHiveId || (hives[0]?.id ?? ""));
  const [date, setDate] = useState(formatDate(new Date()));
  const [type, setType] = useState<EventType>("inspection");
  const [notes, setNotes] = useState("");

  // Todos to complete during this visit
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);

  // New todos to create for next visit
  const [newTasks, setNewTasks] = useState<Array<{ title: string; dueDate?: string }>>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDerivedTitle = (notesText: string, eventType: EventType): string => {
    return deriveEventTitle(notesText, eventType);
  };

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

  const addObservationTag = (tag: string) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(8);
    }
    setNotes((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return tag;
      if (trimmed.includes(tag)) return prev;
      return `${trimmed}. ${tag}`;
    });

    // Keep textarea focused so the mobile software keyboard stays open
    requestAnimationFrame(() => {
      const textarea = document.getElementById("event-single-notes") as HTMLTextAreaElement | null;
      if (textarea) {
        textarea.focus();
        // Place cursor at the end of the newly inserted tag
        const length = textarea.value.length;
        textarea.setSelectionRange(length, length);
      }
    });
  };

  const handleNextFromStep1 = () => {
    if (!hiveId) {
      setError("Vänligen välj en kupa");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    setError(null);
    setStep(3);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    if (!hiveId) {
      setError("Du måste välja en kupa");
      setStep(1);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const cleanNotes = notes.trim();
      const finalTitle = getDerivedTitle(cleanNotes, type);

      await onSave({
        hiveId,
        date,
        type,
        title: finalTitle,
        notes: cleanNotes,
        completedTaskIds,
        newTasks,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Kunde inte spara kupbesöket");
      setIsSubmitting(false);
    }
  };

  const { contentRef, backdropRef, bottomSheetHandlers } = useBottomSheet({ onClose });

  const eventTypes: Array<{ id: EventType; label: string; icon: any; color: string }> = [
    { id: "inspection", label: "Besiktning", icon: Search, color: "var(--color-primary-base)" },
    { id: "feeding", label: "Foder", icon: Droplet, color: "var(--color-warning-base)" },
    { id: "treatment", label: "Behandling", icon: Shield, color: "var(--color-info-base)" },
    { id: "equipment_change", label: "Skattlåda", icon: Layers, color: "var(--color-secondary-text)" },
    { id: "queen_activity", label: "Drottning", icon: Crown, color: "#d97706" },
    { id: "other", label: "Övrigt", icon: MoreHorizontal, color: "var(--color-text-muted)" },
  ];

  const quickObservationChips = [
    "Drottning sedd",
    "Yngel i alla stadier",
    "Gott om foder",
    "Lugnt temperament",
    "Mycket bin / trångt",
    "Drottningcell sedd",
    "Nektardrag pågår",
  ];

  const currentHive = hives.find((h) => h.id === hiveId);

  return (
    <div ref={backdropRef} className="modal-backdrop" onClick={onClose}>
      <div
        ref={contentRef}
        className="modal-content zero-scroll-modal"
        style={{ maxWidth: "560px" }}
        onClick={(e) => e.stopPropagation()}
        {...bottomSheetHandlers}
      >
        <BottomSheetDragHandle />

        {/* Modal Header & Step Indicator */}
        <div className="modal-header wizard-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div className="wizard-icon-badge">
              <ClipboardList size={18} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: "1.1rem", margin: 0 }}>
                Logga kupbesök
              </h2>
              <span className="wizard-subtitle">
                Steg {step} av 3: {step === 1 ? "Kupa & Typ" : step === 2 ? "Observationer" : "Att göra & Spara"}
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Stäng">
            <X size={20} />
          </button>
        </div>

        {/* Step Progress Dots */}
        <div className="wizard-progress-track">
          <div className={`wizard-step-dot ${step >= 1 ? "active" : ""}`}>1</div>
          <div className={`wizard-step-line ${step >= 2 ? "active" : ""}`} />
          <div className={`wizard-step-dot ${step >= 2 ? "active" : ""}`}>2</div>
          <div className={`wizard-step-line ${step >= 3 ? "active" : ""}`} />
          <div className={`wizard-step-dot ${step >= 3 ? "active" : ""}`}>3</div>
        </div>

        {error && <div className="form-error wizard-error-alert">{error}</div>}

        {/* STEP 1: Kupa & Åtgärd */}
        {step === 1 && (
          <div className="wizard-step-content">
            <div className="form-group" style={{ marginBottom: "0.85rem" }}>
              <label className="form-label">Vilken kupa besöker du? *</label>
              <div className="hive-chip-selector">
                {hives.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    className={`hive-select-chip ${hiveId === h.id ? "selected" : ""}`}
                    onClick={() => {
                      setHiveId(h.id);
                      setCompletedTaskIds([]);
                    }}
                  >
                    <Layers size={15} />
                    <span className="hive-chip-name">{h.name}</span>
                    {hiveId === h.id && <Check size={16} className="hive-chip-check" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Quick Selector */}
            <div className="form-group" style={{ marginBottom: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label className="form-label" style={{ margin: 0 }}>Besöksdatum</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => setDate(formatDate(new Date()))}
                  >
                    Idag
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => {
                      const y = new Date();
                      y.setDate(y.getDate() - 1);
                      setDate(formatDate(y));
                    }}
                  >
                    Igår
                  </button>
                </div>
              </div>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                autoComplete="off"
                required
              />
            </div>

            {/* Action Type 6-Grid */}
            <div className="form-group" style={{ marginBottom: "0.5rem" }}>
              <label className="form-label">Typ av åtgärd *</label>
              <div className="action-type-grid">
                {eventTypes.map((et) => {
                  const Icon = et.icon;
                  const isSelected = type === et.id;
                  return (
                    <button
                      key={et.id}
                      type="button"
                      className={`action-type-card ${isSelected ? "selected" : ""}`}
                      onClick={() => setType(et.id)}
                    >
                      <Icon size={18} color={isSelected ? "var(--color-primary-text, #fff)" : et.color} />
                      <span>{et.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="wizard-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Avbryt
              </button>
              <button type="button" className="btn btn-primary" onClick={handleNextFromStep1}>
                <span>Fortsätt</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Observationer & Skick (Single Field, Upper-Half Positioned) */}
        {step === 2 && (
          <div className="wizard-step-content">
            <div className="wizard-context-banner" style={{ marginBottom: "6px" }}>
              <span className="wizard-context-pill">🐝 {currentHive?.name || "Kupa"}</span>
              <span className="wizard-context-pill">📅 {date}</span>
            </div>

            {/* Single Observation Field placed in the upper half of modal */}
            <div className="form-group" style={{ marginBottom: "8px" }}>
              <label className="form-label" htmlFor="event-single-notes" style={{ fontWeight: 700, marginBottom: "4px" }}>
                Anteckningar & observationer
              </label>
              <textarea
                id="event-single-notes"
                className="form-textarea"
                style={{ minHeight: "88px", resize: "none", fontSize: "0.92rem", lineHeight: "1.4" }}
                placeholder="Beskriv vad du såg och gjorde i kupan... (t.ex. Drottning sedd, 5 ramar yngel, gott om foder)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            {/* Quick Apiary Observation Chips directly below */}
            <div className="form-group" style={{ marginBottom: "6px" }}>
              <label className="form-label" style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "4px" }}>
                Snabbval att lägga till i anteckningen
              </label>
              <div className="quick-tags-cloud">
                {quickObservationChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="quick-tag-chip"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addObservationTag(chip)}
                  >
                    <Plus size={12} />
                    <span>{chip}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="wizard-actions" style={{ marginTop: "auto", paddingTop: "8px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(1)}
              >
                <ArrowLeft size={16} />
                <span>Tillbaka</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNextFromStep2}
              >
                <span>Fortsätt till att-göra</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Att göra & Slutför */}
        {step === 3 && (
          <div className="wizard-step-content">
            <div className="wizard-context-banner" style={{ marginBottom: "6px" }}>
              <span className="wizard-context-pill">🐝 {currentHive?.name}</span>
              <span className="wizard-context-pill">📝 {getDerivedTitle(notes, type)}</span>
            </div>

            {/* Tasks to Complete during this visit */}
            <div className="form-group" style={{ marginBottom: "0.85rem" }}>
              <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Uppgifter att bocka av</span>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  {openTasksForThisHive.length} öppna
                </span>
              </label>

              {openTasksForThisHive.length > 0 ? (
                <div className="wizard-tasks-list">
                  {openTasksForThisHive.map((t) => {
                    const isChecked = completedTaskIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        className={`wizard-task-item ${isChecked ? "checked" : ""}`}
                        onClick={() => toggleTaskCompletion(t.id)}
                      >
                        {isChecked ? (
                          <CheckSquare size={18} color="var(--color-primary-base)" />
                        ) : (
                          <Square size={18} color="var(--color-text-muted)" />
                        )}
                        <span className="wizard-task-text">{t.title}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="wizard-empty-tasks">
                  Inga öppna uppgifter låg planerade inför detta besök.
                </div>
              )}
            </div>

            {/* New Task for next visit */}
            <div className="form-group" style={{ marginBottom: "0.5rem" }}>
              <label className="form-label">Planera till nästa besök (valfritt)</label>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1, fontSize: "0.85rem", padding: "6px 8px" }}
                  placeholder="t.ex. Sätta på skattlåda 2..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddNewTask();
                    }
                  }}
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

              {newTasks.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                  {newTasks.map((nt, idx) => (
                    <div key={idx} className="wizard-new-task-pill">
                      <span>📌 {nt.title}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveNewTask(idx)}
                        className="btn-icon-subtle"
                        title="Ta bort"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="wizard-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(2)}
                disabled={isSubmitting}
              >
                <ArrowLeft size={16} />
                <span>Tillbaka</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-save-wizard"
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
              >
                <Check size={18} />
                <span>{isSubmitting ? "Sparar..." : "Spara kupbesök"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
