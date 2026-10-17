import React, { useState } from "react";
import { Hive, HiveEvent, HiveStatus } from "../../domain/types";
import { Plus, Layers, Calendar, ChevronRight } from "lucide-react";

interface HivesViewProps {
  hives: Hive[];
  events: HiveEvent[];
  onOpenHiveDetail: (hive: Hive) => void;
  onOpenCreateHive: () => void;
  onLogEventForHive: (hiveId: string) => void;
}

export const HivesView: React.FC<HivesViewProps> = ({
  hives,
  events,
  onOpenHiveDetail,
  onOpenCreateHive,
  onLogEventForHive,
}) => {
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("active");

  const filteredHives = hives.filter((h) => {
    if (filter === "active") return h.status === "active";
    if (filter === "inactive") return h.status !== "active";
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

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <div>
          <h1>Bikupor & samhällen</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
            Hantera dina bisamhällen och deras inspektionshistorik
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onOpenCreateHive}>
          <Plus size={16} />
          <span>Ny kupa</span>
        </button>
      </div>

      <div className="tabs-header">
        <button
          className={`tab-btn ${filter === "active" ? "active" : ""}`}
          onClick={() => setFilter("active")}
        >
          Aktiva ({hives.filter((h) => h.status === "active").length})
        </button>
        <button
          className={`tab-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          Alla ({hives.length})
        </button>
        <button
          className={`tab-btn ${filter === "inactive" ? "active" : ""}`}
          onClick={() => setFilter("inactive")}
        >
          Inaktiva ({hives.filter((h) => h.status !== "active").length})
        </button>
      </div>

      {filteredHives.length === 0 ? (
        <div className="card empty-state">
          <Layers size={40} className="empty-state-icon" />
          <h3 className="empty-state-title">Inga kupor att visa</h3>
          <p className="empty-state-desc">
            {filter === "active"
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

                  {latestEvent ? (
                    <div
                      style={{
                        background: "#f8fafc",
                        padding: "0.5rem 0.65rem",
                        borderRadius: "6px",
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
                  }}
                >
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLogEventForHive(hive.id);
                    }}
                  >
                    <Plus size={14} />
                    <span>Logga besök</span>
                  </button>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--color-primary)",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.2rem",
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
    </div>
  );
};
