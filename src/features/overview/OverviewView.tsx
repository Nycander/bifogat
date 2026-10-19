import React from "react";
import { Hive, HiveEvent, Task, Harvest, Transaction } from "../../domain/types";
import { SyncEngineStatus } from "../../sync/syncEngine";
import { formatOreToSEK } from "../../domain/validation";
import {
  Layers,
  CheckSquare,
  Droplet,
  Wallet,
  Plus,
  Calendar,
  Clock,
  ArrowRight,
  ClipboardList,
} from "lucide-react";

interface OverviewViewProps {
  hives: Hive[];
  events: HiveEvent[];
  tasks: Task[];
  harvests: Harvest[];
  transactions: Transaction[];
  syncStatus: SyncEngineStatus;
  onOpenLogEvent: () => void;
  onOpenCreateTask: () => void;
  onToggleTask: (id: string) => Promise<void>;
  onNavigateToTab: (tab: any, subTab?: "hives" | "tasks") => void;
  onSelectHive: (hive: Hive) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  hives,
  events,
  tasks,
  harvests,
  transactions,
  syncStatus,
  onOpenLogEvent,
  onOpenCreateTask,
  onToggleTask,
  onNavigateToTab,
  onSelectHive,
}) => {
  const activeHives = hives.filter((h) => h.status === "active");
  const openTasks = tasks.filter((t) => t.status === "open").slice(0, 4);
  const recentEvents = events.slice(0, 5);

  const totalBalanceOre = transactions.reduce((acc, t) => acc + (t.amountOre || 0), 0);

  // Current year honey kg
  const currentYear = new Date().getFullYear().toString();
  const currentYearGrams = harvests
    .filter((h) => h.date.startsWith(currentYear))
    .reduce((acc, h) => acc + (h.honeyWeightGrams || 0), 0);
  const currentYearJars = harvests
    .filter((h) => h.date.startsWith(currentYear))
    .reduce((acc, h) => {
      if (h.fillings && h.fillings.length > 0) {
        return acc + h.fillings.reduce((sum, f) => sum + (f.jarCount || 0), 0);
      }
      return acc + (h.jarCount || 0);
    }, 0);

  const getHiveName = (hiveId: string) => {
    const h = hives.find((hive) => hive.id === hiveId);
    return h ? h.name : "Okänd kupa";
  };

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>Välkommen till Bifogat</span>
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
          Kupjournal och loggbok för din bigård — alltid tillgänglig även offline
        </p>
      </div>

      {/* Quick Action Bar */}
      <div className="quick-actions">
        <button
          className="btn btn-primary"
          onClick={onOpenLogEvent}
          style={{ padding: "0.75rem", justifyContent: "center" }}
        >
          <Plus size={18} />
          <span>Logga kupbesök</span>
        </button>
        <button
          className="btn btn-secondary"
          onClick={onOpenCreateTask}
          style={{ padding: "0.75rem", justifyContent: "center" }}
        >
          <CheckSquare size={18} color="var(--color-primary)" />
          <span>Ny uppgift</span>
        </button>
      </div>

      {/* Key Numbers Grid */}
      <div className="stats-grid">
        <div
          className="stat-card"
          onClick={() => onNavigateToTab("hives")}
          style={{ cursor: "pointer" }}
          role="button"
          tabIndex={0}
        >
          <span className="stat-label">Aktiva kupor</span>
          <span className="stat-value">{activeHives.length}</span>
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
            av {hives.length} totalt
          </span>
        </div>

        <div
          className="stat-card"
          onClick={() => onNavigateToTab("hives", "tasks")}
          style={{ cursor: "pointer" }}
          role="button"
          tabIndex={0}
        >
          <span className="stat-label">Att göra</span>
          <span className="stat-value">{tasks.filter((t) => t.status === "open").length}</span>
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
            öppna uppgifter
          </span>
        </div>

        <div
          className="stat-card"
          onClick={() => onNavigateToTab("harvests")}
          style={{ cursor: "pointer" }}
          role="button"
          tabIndex={0}
        >
          <span className="stat-label">Skörd {currentYear}</span>
          <span className="stat-value">
            {currentYearGrams > 0
              ? `${(currentYearGrams / 1000).toFixed(0)} kg`
              : currentYearJars > 0
                ? `${currentYearJars} b.`
                : "0 kg"}
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
            slungad honung
          </span>
        </div>

        <div
          className="stat-card"
          onClick={() => onNavigateToTab("economy")}
          style={{ cursor: "pointer" }}
          role="button"
          tabIndex={0}
        >
          <span className="stat-label">Kassasaldo</span>
          <span
            className="stat-value"
            style={{
              fontSize: "1.15rem",
              color: totalBalanceOre >= 0 ? "var(--color-success)" : "var(--color-danger)",
            }}
          >
            {formatOreToSEK(totalBalanceOre)}
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
            löpande saldo
          </span>
        </div>
      </div>

      {/* Next Open Tasks */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <CheckSquare size={18} color="var(--color-primary)" />
            <span>Kommande uppgifter</span>
          </h2>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateToTab("hives", "tasks")}
            style={{ fontSize: "0.8rem" }}
          >
            <span>Visa alla ({tasks.filter((t) => t.status === "open").length})</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {openTasks.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "1rem",
              color: "var(--color-text-muted)",
              fontSize: "0.875rem",
            }}
          >
            Inga öppna uppgifter just nu! Bra jobbat!
          </div>
        ) : (
          <div className="item-list">
            {openTasks.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  padding: "0.45rem 0",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <input
                  type="checkbox"
                  className="task-checkbox"
                  checked={false}
                  onChange={() => onToggleTask(t.id)}
                  aria-label={`Markera "${t.title}" som klar`}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.925rem", fontWeight: 600 }}>{t.title}</div>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      fontSize: "0.75rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {t.dueDate && <span>Förfaller: {t.dueDate}</span>}
                    {t.hiveId && <span>Kupa: {getHiveName(t.hiveId)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Hive Events */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <ClipboardList size={18} color="var(--color-primary)" />
            <span>Senaste händelser & inspektioner</span>
          </h2>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateToTab("hives")}
            style={{ fontSize: "0.8rem" }}
          >
            <span>Alla kupor</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {recentEvents.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "1.25rem",
              color: "var(--color-text-muted)",
              fontSize: "0.875rem",
            }}
          >
            Inga kupbesök loggade än. Tryck på "Logga kupbesök" ovan för att göra din första
            notering.
          </div>
        ) : (
          <div className="item-list">
            {recentEvents.map((e) => (
              <div key={e.id} className="list-item" style={{ padding: "0.65rem 0.85rem" }}>
                <div className="list-item-main">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      marginBottom: "0.15rem",
                    }}
                  >
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      {e.date}
                    </span>
                    <span className="badge badge-event-inspection" style={{ fontSize: "0.7rem" }}>
                      {getHiveName(e.hiveId)}
                    </span>
                  </div>
                  <div
                    className="list-item-title"
                    style={{ fontSize: "0.9rem", marginBottom: "0.15rem" }}
                  >
                    {e.title}
                  </div>
                  {e.notes && (
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--color-text-muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
