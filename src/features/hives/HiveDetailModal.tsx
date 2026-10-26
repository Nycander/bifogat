import React, { useState } from "react";
import { Hive, HiveEvent, Task } from "../../domain/types";
import {
  X,
  Plus,
  Edit2,
  Calendar,
  ClipboardList,
  CheckSquare,
  Trash2,
  Clock,
  Check,
} from "lucide-react";

interface HiveDetailModalProps {
  hive: Hive;
  events: HiveEvent[];
  tasks: Task[];
  onClose: () => void;
  onLogEvent: (hiveId: string) => void;
  onEditHive: (hive: Hive) => void;
  onToggleTask: (id: string) => Promise<void>;
  onOpenCreateTask: (hiveId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => Promise<void>;
}

export const HiveDetailModal: React.FC<HiveDetailModalProps> = ({
  hive,
  events,
  tasks,
  onClose,
  onLogEvent,
  onEditHive,
  onToggleTask,
  onOpenCreateTask,
  onEditTask,
  onDeleteTask,
}) => {
  const hiveEvents = events.filter((e) => e.hiveId === hive.id);
  const hiveTasks = tasks.filter((t) => t.hiveId === hive.id);
  const openTasks = hiveTasks.filter((t) => t.status === "open");
  const completedTasks = hiveTasks.filter((t) => t.status === "completed");

  const [activeTab, setActiveTab] = useState<"tasks" | "events">(
    openTasks.length > 0 ? "tasks" : "events",
  );
  const [showCompleted, setShowCompleted] = useState(false);

  const getStatusBadge = (status: Hive["status"]) => {
    switch (status) {
      case "active":
        return <span className="badge badge-active">Aktiv</span>;
      case "inactive":
        return <span className="badge badge-inactive">Inaktiv</span>;
      case "merged":
        return <span className="badge badge-merged">Sammanslagen</span>;
      case "archived":
        return <span className="badge badge-archived">Arkiverad</span>;
    }
  };

  const getEventBadge = (type: HiveEvent["type"]) => {
    switch (type) {
      case "inspection":
        return <span className="badge badge-event-inspection">Besiktning</span>;
      case "feeding":
        return <span className="badge badge-event-feeding">Foder</span>;
      case "treatment":
        return <span className="badge badge-event-treatment">Behandling</span>;
      case "harvest":
        return <span className="badge badge-event-harvest">Skörd</span>;
      case "equipment":
        return <span className="badge badge-event-equipment">Lådor</span>;
      case "colony_change":
        return <span className="badge badge-event-colony_change">Koloni</span>;
      default:
        return <span className="badge badge-event-other">Övrigt</span>;
    }
  };

  const isOverdue = (dateStr?: string) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().substring(0, 10);
    return dateStr < today;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: "640px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <h2 className="modal-title">{hive.name}</h2>
            {getStatusBadge(hive.status)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onEditHive(hive)}
              title="Redigera kupuppgifter"
            >
              <Edit2 size={14} />
              <span>Ändra</span>
            </button>
            <button className="modal-close-btn" onClick={onClose} aria-label="Stäng">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="modal-scroll-body" style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: "4px" }}>
          {hive.notes && (
            <div
              className="box-inset"
              style={{
                padding: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                ANTECKNING OM KUPAN
              </div>
              <div
                style={{ fontSize: "0.9rem", color: "var(--color-text-primary)", marginTop: "0.2rem" }}
              >
                {hive.notes}
              </div>
            </div>
          )}

          {/* Tab switcher inside Hive Detail */}
          <div className="tabs-header" style={{ marginBottom: "1rem" }}>
            <button
              className={`tab-btn ${activeTab === "tasks" ? "active" : ""}`}
              onClick={() => setActiveTab("tasks")}
            >
              <CheckSquare size={15} style={{ display: "inline", marginRight: "4px" }} />
            Att göra ({openTasks.length})
          </button>
          <button
            className={`tab-btn ${activeTab === "events" ? "active" : ""}`}
            onClick={() => setActiveTab("events")}
          >
            <ClipboardList size={15} style={{ display: "inline", marginRight: "4px" }} />
            Besök & historik ({hiveEvents.length})
          </button>
        </div>

        {/* Tab: Tasks / Att göra */}
        {activeTab === "tasks" && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
              }}
            >
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>
                Planerade åtgärder för {hive.name}
              </h3>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onOpenCreateTask(hive.id)}
              >
                <Plus size={14} />
                <span>Ny uppgift</span>
              </button>
            </div>

            {openTasks.length === 0 ? (
              <div className="empty-state" style={{ padding: "1.75rem 1rem" }}>
                <Check size={28} style={{ color: "var(--color-success)", margin: "0 auto 0.5rem" }} />
                <p className="empty-state-title" style={{ fontSize: "0.95rem" }}>
                  Inga öppna uppgifter för denna kupa
                </p>
                <p className="empty-state-desc" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                  Allt är i ordning! Planera nästa åtgärd eller tillsyn vid behov.
                </p>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onOpenCreateTask(hive.id)}
                >
                  <Plus size={14} />
                  <span>Skapa uppgift för {hive.name}</span>
                </button>
              </div>
            ) : (
              <div className="item-list">
                {openTasks.map((task) => {
                  const overdue = isOverdue(task.dueDate);
                  return (
                    <div key={task.id} className="list-item" style={{ padding: "0.75rem" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.75rem",
                          flex: 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          className="task-checkbox"
                          checked={false}
                          onChange={() => onToggleTask(task.id)}
                          aria-label={`Markera "${task.title}" som klar`}
                          style={{ marginTop: "0.2rem" }}
                        />
                        <div className="list-item-main">
                          <div className="list-item-title">{task.title}</div>
                          {task.dueDate && (
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: overdue ? "var(--color-danger)" : "var(--color-primary-hover)",
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                marginTop: "0.2rem",
                              }}
                            >
                              <Clock size={12} />
                              {overdue ? `Försenad: ${task.dueDate}` : `Förfaller: ${task.dueDate}`}
                            </div>
                          )}
                          {task.notes && (
                            <div className="list-item-notes" style={{ marginTop: "0.3rem" }}>
                              {task.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <button
                          className="btn-icon-only"
                          onClick={() => onEditTask(task)}
                          title="Redigera uppgift"
                          style={{ background: "transparent", border: "none", cursor: "pointer" }}
                        >
                          <Edit2 size={15} color="var(--color-text-muted)" />
                        </button>
                        <button
                          className="btn-icon-only"
                          onClick={() => onDeleteTask(task.id)}
                          title="Ta bort uppgift"
                          style={{ background: "transparent", border: "none", cursor: "pointer" }}
                        >
                          <Trash2 size={15} color="var(--color-danger)" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {completedTasks.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowCompleted(!showCompleted)}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {showCompleted
                    ? `Dölj avklarade uppgifter (${completedTasks.length})`
                    : `Visa avklarade uppgifter (${completedTasks.length})`}
                </button>

                {showCompleted && (
                  <div className="item-list" style={{ marginTop: "0.5rem" }}>
                    {completedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="list-item"
                        style={{ padding: "0.6rem 0.75rem", opacity: 0.7 }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.65rem",
                            flex: 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            className="task-checkbox"
                            checked={true}
                            onChange={() => onToggleTask(task.id)}
                            aria-label={`Markera "${task.title}" som öppen`}
                          />
                          <span
                            className="list-item-title task-title completed"
                            style={{ fontSize: "0.85rem" }}
                          >
                            {task.title}
                          </span>
                        </div>
                        <button
                          className="btn-icon-only"
                          onClick={() => onDeleteTask(task.id)}
                          title="Ta bort avklarad uppgift"
                          style={{ background: "transparent", border: "none", cursor: "pointer" }}
                        >
                          <Trash2 size={14} color="var(--color-text-muted)" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Events / Besök & historik */}
        {activeTab === "events" && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
              }}
            >
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>
                Loggade besök & åtgärder ({hiveEvents.length})
              </h3>
              <button className="btn btn-primary btn-sm" onClick={() => onLogEvent(hive.id)}>
                <Plus size={14} />
                <span>Logga besök</span>
              </button>
            </div>

            {hiveEvents.length === 0 ? (
              <div className="empty-state" style={{ padding: "1.75rem 1rem" }}>
                <p className="empty-state-desc">
                  Inga loggade besök ännu för {hive.name}. Tryck på "Logga besök" ovan för att göra din första inspektion.
                </p>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onLogEvent(hive.id)}
                  style={{ marginTop: "0.5rem" }}
                >
                  <Plus size={14} />
                  <span>Logga första besöket</span>
                </button>
              </div>
            ) : (
              <div className="item-list">
                {hiveEvents.map((event) => (
                  <div key={event.id} className="list-item">
                    <div className="list-item-main">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--color-text-muted)",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <Calendar size={13} />
                          {event.date}
                        </span>
                        {getEventBadge(event.type)}
                      </div>
                      {event.title && <div className="list-item-title">{event.title}</div>}
                      {event.notes && <div className="list-item-notes">{event.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>

        <div
          className="modal-actions"
          style={{
            flexShrink: 0,
            marginTop: "0.75rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid var(--color-border-subtle)",
          }}
        >
          <button className="btn btn-secondary" onClick={onClose}>
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
};
