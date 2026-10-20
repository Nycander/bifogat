import React, { useState, useEffect } from "react";
import { Hive, HiveEvent, Task, HiveStatus } from "../../domain/types";
import {
  Plus,
  Layers,
  Calendar,
  ChevronRight,
  CheckSquare,
  Clock,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
} from "lucide-react";

interface HivesViewProps {
  hives: Hive[];
  events: HiveEvent[];
  tasks: Task[];
  initialSubTab?: "hives" | "tasks";
  onOpenHiveDetail: (hive: Hive) => void;
  onOpenCreateHive: () => void;
  onLogEventForHive: (hiveId: string) => void;
  onToggleTask: (id: string) => Promise<void>;
  onOpenCreateTask: (hiveId?: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => Promise<void>;
}

export const HivesView: React.FC<HivesViewProps> = ({
  hives,
  events,
  tasks,
  initialSubTab = "hives",
  onOpenHiveDetail,
  onOpenCreateHive,
  onLogEventForHive,
  onToggleTask,
  onOpenCreateTask,
  onEditTask,
  onDeleteTask,
}) => {
  const [subTab, setSubTab] = useState<"hives" | "tasks">(initialSubTab);
  const [hiveFilter, setHiveFilter] = useState<"all" | "active" | "inactive">("active");

  // Filter for tasks sub-tab
  const [taskStatusFilter, setTaskStatusFilter] = useState<"open" | "completed">("open");
  const [taskHiveFilter, setTaskHiveFilter] = useState<string>("all");

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const filteredHives = hives.filter((h) => {
    if (hiveFilter === "active") return h.status === "active";
    if (hiveFilter === "inactive") return h.status !== "active";
    return true;
  });

  const getStatusBadge = (status: HiveStatus) => {
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

  const getLatestEvent = (hiveId: string) => {
    return events.find((e) => e.hiveId === hiveId);
  };

  const getTasksForHive = (hiveId: string) => {
    return tasks.filter((t) => t.hiveId === hiveId);
  };

  const getHiveName = (hiveId?: string) => {
    if (!hiveId) return "Hela bigården";
    const h = hives.find((hive) => hive.id === hiveId);
    return h ? h.name : "Okänd kupa";
  };

  const isOverdue = (dateStr?: string) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().substring(0, 10);
    return dateStr < today;
  };

  const totalOpenTasks = tasks.filter((t) => t.status === "open").length;

  // Filtered tasks for tasks tab
  const displayedTasks = tasks
    .filter((t) => t.status === taskStatusFilter)
    .filter((t) => {
      if (taskHiveFilter === "all") return true;
      if (taskHiveFilter === "general") return !t.hiveId;
      return t.hiveId === taskHiveFilter;
    });

  return (
    <div>
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div>
          <h1>Bikupor & åtgärder</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
            Hantera dina bisamhällen, planerade åtgärder och inspektioner
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onOpenCreateTask()}
            title="Planera ny uppgift för kupa eller bigård"
          >
            <CheckSquare size={16} />
            <span>Ny uppgift</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={onOpenCreateHive}>
            <Plus size={16} />
            <span>Ny kupa</span>
          </button>
        </div>
      </div>

      {/* Main View Segment Switcher: Kupor vs Att göra */}
      <div className="tabs-header" style={{ marginBottom: "1rem" }}>
        <button
          className={`tab-btn ${subTab === "hives" ? "active" : ""}`}
          onClick={() => setSubTab("hives")}
        >
          <Layers size={16} style={{ display: "inline", marginRight: "5px" }} />
          Kupor ({hives.length})
        </button>
        <button
          className={`tab-btn ${subTab === "tasks" ? "active" : ""}`}
          onClick={() => setSubTab("tasks")}
        >
          <CheckSquare size={16} style={{ display: "inline", marginRight: "5px" }} />
          Att göra ({totalOpenTasks})
        </button>
      </div>

      {/* SUBTAB 1: HIVES VIEW */}
      {subTab === "hives" && (
        <>
          <div className="tabs-header" style={{ marginBottom: "1rem" }}>
            <button
              className={`tab-btn ${hiveFilter === "active" ? "active" : ""}`}
              onClick={() => setHiveFilter("active")}
            >
              Aktiva ({hives.filter((h) => h.status === "active").length})
            </button>
            <button
              className={`tab-btn ${hiveFilter === "all" ? "active" : ""}`}
              onClick={() => setHiveFilter("all")}
            >
              Alla ({hives.length})
            </button>
            <button
              className={`tab-btn ${hiveFilter === "inactive" ? "active" : ""}`}
              onClick={() => setHiveFilter("inactive")}
            >
              Inaktiva ({hives.filter((h) => h.status !== "active").length})
            </button>
          </div>

          {filteredHives.length === 0 ? (
            <div className="card empty-state">
              <Layers size={40} className="empty-state-icon" />
              <h3 className="empty-state-title">Inga kupor att visa</h3>
              <p className="empty-state-desc">
                {hiveFilter === "active"
                  ? "Du har inga aktiva kupor registrerade just nu."
                  : "Det finns inga kupor i den här listan."}
              </p>
              <button className="btn btn-primary" onClick={onOpenCreateHive}>
                <Plus size={16} />
                <span>Lägg till din första kupa</span>
              </button>
            </div>
          ) : (
            <div className="hive-grid">
              {filteredHives.map((hive) => {
                const latestEvent = getLatestEvent(hive.id);
                const hiveTasks = getTasksForHive(hive.id);
                const openHiveTasks = hiveTasks.filter((t) => t.status === "open");
                const nextTask = openHiveTasks[0];
                const overdue = nextTask ? isOverdue(nextTask.dueDate) : false;

                return (
                  <div
                    key={hive.id}
                    className="hive-card"
                    onClick={() => onOpenHiveDetail(hive)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") onOpenHiveDetail(hive);
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>{hive.name}</h3>
                        {getStatusBadge(hive.status)}
                      </div>

                      {hive.notes && (
                        <p
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--color-text-muted)",
                            marginBottom: "0.75rem",
                          }}
                        >
                          {hive.notes}
                        </p>
                      )}

                      {/* Embedded Tasks Badge / Preview */}
                      {openHiveTasks.length > 0 ? (
                        <div
                          className={overdue ? "box-danger" : "box-warning"}
                          style={{
                            padding: "0.45rem 0.65rem",
                            fontSize: "0.8rem",
                            marginBottom: "0.6rem",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: "0.15rem",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 700,
                                color: overdue ? "var(--color-danger-text)" : "var(--color-warning-text)",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.3rem",
                              }}
                            >
                              <CheckSquare size={13} />
                              {openHiveTasks.length}{" "}
                              {openHiveTasks.length === 1 ? "uppgift" : "uppgifter"} att göra
                            </span>
                            {nextTask?.dueDate && (
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  fontWeight: 600,
                                  color: overdue ? "var(--color-danger-text)" : "var(--color-warning-text)",
                                }}
                              >
                                {overdue ? "Försenad!" : nextTask.dueDate}
                              </span>
                            )}
                          </div>
                          {nextTask && (
                            <div
                              style={{
                                color: "var(--color-text-primary)",
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {nextTask.title}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--color-success-text)",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            marginBottom: "0.6rem",
                            fontWeight: 500,
                          }}
                        >
                          <Check size={13} />
                          <span>Inga öppna uppgifter</span>
                        </div>
                      )}

                      {/* Latest Event */}
                      {latestEvent ? (
                        <div
                          className="box-inset"
                          style={{
                            padding: "0.5rem 0.65rem",
                            fontSize: "0.8rem",
                            marginBottom: "0.75rem",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              color: "var(--color-text-muted)",
                              marginBottom: "0.15rem",
                            }}
                          >
                            <Calendar size={12} />
                            <span>Senaste besök: {latestEvent.date}</span>
                          </div>
                          <div style={{ fontWeight: 600, color: "var(--color-text-main)" }}>
                            {latestEvent.title || latestEvent.notes.substring(0, 45)}
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--color-text-light)",
                            marginBottom: "0.75rem",
                            fontStyle: "italic",
                          }}
                        >
                          Inga besök loggade ännu
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderTop: "1px solid var(--color-border)",
                        paddingTop: "0.65rem",
                        marginTop: "0.5rem",
                        gap: "0.4rem",
                      }}
                    >
                      <div style={{ display: "flex", gap: "0.35rem" }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLogEventForHive(hive.id);
                          }}
                          title="Logga besök eller inspektion"
                        >
                          <Plus size={14} />
                          <span>Besök</span>
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCreateTask(hive.id);
                          }}
                          title="Lägg till att göra för denna kupa"
                        >
                          <CheckSquare size={14} />
                          <span>Att göra</span>
                        </button>
                      </div>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--color-primary)",
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: "0.15rem",
                        }}
                      >
                        Detaljer <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* SUBTAB 2: UNIFIED TASKS / ATT GÖRA */}
      {subTab === "tasks" && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            {/* Status tabs */}
            <div className="tabs-header" style={{ marginBottom: 0 }}>
              <button
                className={`tab-btn ${taskStatusFilter === "open" ? "active" : ""}`}
                onClick={() => setTaskStatusFilter("open")}
              >
                Att göra ({tasks.filter((t) => t.status === "open").length})
              </button>
              <button
                className={`tab-btn ${taskStatusFilter === "completed" ? "active" : ""}`}
                onClick={() => setTaskStatusFilter("completed")}
              >
                Avklarade ({tasks.filter((t) => t.status === "completed").length})
              </button>
            </div>

            {/* Hive filter dropdown */}
            <select
              className="form-select"
              style={{ width: "auto", minWidth: "160px", padding: "0.35rem 0.65rem", fontSize: "0.85rem" }}
              value={taskHiveFilter}
              onChange={(e) => setTaskHiveFilter(e.target.value)}
              aria-label="Filtrera efter kupa"
            >
              <option value="all">Alla kupor ({tasks.length})</option>
              {hives.map((h) => {
                const count = tasks.filter((t) => t.hiveId === h.id).length;
                return (
                  <option key={h.id} value={h.id}>
                    {h.name} ({count})
                  </option>
                );
              })}
              <option value="general">Gäller hela bigården</option>
            </select>
          </div>

          {displayedTasks.length === 0 ? (
            <div className="card empty-state">
              <CheckSquare size={40} className="empty-state-icon" />
              <h3 className="empty-state-title">
                {taskStatusFilter === "open"
                  ? "Inga öppna uppgifter!"
                  : "Inga avklarade uppgifter i denna vy."}
              </h3>
              <p className="empty-state-desc">
                {taskStatusFilter === "open"
                  ? "Allt är ordnat vid kuporna just nu. Lägg till en ny åtgärd vid behov."
                  : "När du bockar av uppgifter visas de här."}
              </p>
              {taskStatusFilter === "open" && (
                <button
                  className="btn btn-primary"
                  onClick={() =>
                    onOpenCreateTask(taskHiveFilter !== "all" && taskHiveFilter !== "general" ? taskHiveFilter : undefined)
                  }
                >
                  <Plus size={16} />
                  <span>Skapa uppgift</span>
                </button>
              )}
            </div>
          ) : (
            <div className="item-list">
              {displayedTasks.map((task) => {
                const hive = hives.find((h) => h.id === task.hiveId);
                const hiveName = getHiveName(task.hiveId);
                const isCompleted = task.status === "completed";
                const overdue = !isCompleted && isOverdue(task.dueDate);

                return (
                  <div key={task.id} className="list-item">
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
                        checked={isCompleted}
                        onChange={() => onToggleTask(task.id)}
                        aria-label={`Markera "${task.title}" som ${isCompleted ? "öppen" : "klar"}`}
                        style={{ marginTop: "0.2rem" }}
                      />
                      <div className="list-item-main">
                        <div
                          className={`list-item-title ${isCompleted ? "task-title completed" : ""}`}
                        >
                          {task.title}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            flexWrap: "wrap",
                            marginTop: "0.25rem",
                          }}
                        >
                          {task.dueDate && (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: overdue ? "var(--color-danger)" : "var(--color-primary-hover)",
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                              }}
                            >
                              <Clock size={12} />
                              {overdue ? `Försenad: ${task.dueDate}` : `Förfaller: ${task.dueDate}`}
                            </span>
                          )}

                          {hive ? (
                            <button
                              type="button"
                              className="badge badge-inactive"
                              onClick={() => onOpenHiveDetail(hive)}
                              style={{
                                border: "none",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                              }}
                              title={`Öppna detaljer för ${hive.name}`}
                            >
                              {hive.name}
                            </button>
                          ) : (
                            <span className="badge badge-inactive" style={{ fontSize: "0.75rem" }}>
                              {hiveName}
                            </span>
                          )}
                        </div>

                        {task.notes && (
                          <div className="list-item-notes" style={{ marginTop: "0.35rem" }}>
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
                        <Edit2 size={16} color="var(--color-text-muted)" />
                      </button>
                      <button
                        className="btn-icon-only"
                        onClick={() => onDeleteTask(task.id)}
                        title="Ta bort uppgift"
                        style={{ background: "transparent", border: "none", cursor: "pointer" }}
                      >
                        <Trash2 size={16} color="var(--color-danger)" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
