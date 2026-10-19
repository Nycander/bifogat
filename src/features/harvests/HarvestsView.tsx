import React, { useState } from "react";
import { Harvest, Hive } from "../../domain/types";
import {
  Plus,
  Droplet,
  Calendar,
  Trash2,
  Edit2,
  PackageCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
} from "lucide-react";

interface HarvestsViewProps {
  harvests: Harvest[];
  hives: Hive[];
  onOpenCreateHarvest: () => void;
  onEditHarvest: (harvest: Harvest) => void;
  onDeleteHarvest: (id: string) => Promise<void>;
  onOpenJarFilling: (harvestId?: string) => void;
  onDeleteFilling: (harvestId: string, fillingId: string) => Promise<void>;
  onOpenHoneySale?: () => void;
}

export const HarvestsView: React.FC<HarvestsViewProps> = ({
  harvests,
  hives,
  onOpenCreateHarvest,
  onEditHarvest,
  onDeleteHarvest,
  onOpenJarFilling,
  onDeleteFilling,
  onOpenHoneySale,
}) => {
  const [expandedBatchIds, setExpandedBatchIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedBatchIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getHiveName = (hiveId?: string) => {
    if (!hiveId) return "Hela bigården";
    const hive = hives.find((h) => h.id === hiveId);
    return hive ? hive.name : "Okänd kupa";
  };

  // Group by year for annual summary
  const summaryByYear: Record<
    string,
    { totalExtractedGrams: number; totalJarredGrams: number; totalJars: number; count: number }
  > = {};

  for (const h of harvests) {
    const year = h.date.substring(0, 4) || "Okänt år";
    if (!summaryByYear[year]) {
      summaryByYear[year] = {
        totalExtractedGrams: 0,
        totalJarredGrams: 0,
        totalJars: 0,
        count: 0,
      };
    }
    summaryByYear[year].count += 1;
    if (h.honeyWeightGrams !== undefined) {
      summaryByYear[year].totalExtractedGrams += h.honeyWeightGrams;
    }

    if (h.fillings && h.fillings.length > 0) {
      for (const f of h.fillings) {
        summaryByYear[year].totalJars += f.jarCount || 0;
        summaryByYear[year].totalJarredGrams += (f.jarCount || 0) * (f.jarSizeGrams || 500);
      }
    } else if (h.jarCount !== undefined) {
      summaryByYear[year].totalJars += h.jarCount;
      summaryByYear[year].totalJarredGrams += (h.jarCount || 0) * (h.jarSizeGrams || 500);
    }
  }

  const years = Object.keys(summaryByYear).sort((a, b) => b.localeCompare(a));

  return (
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
        <div>
          <h1>Skörd & honungsproduktion</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
            Separata slungningar, vattenhaltmätning och löpande burkfyllning
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {onOpenHoneySale && (
            <button
              className="btn btn-primary btn-sm"
              onClick={onOpenHoneySale}
              style={{
                background: "#d97706",
                borderColor: "#b45309",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontWeight: 700,
              }}
            >
              <Droplet size={16} />
              <span>Sälj burkar</span>
            </button>
          )}
          {harvests.length > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenJarFilling()}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            >
              <PackageCheck size={16} color="var(--color-primary)" />
              <span>Tappa burkar</span>
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={onOpenCreateHarvest}>
            <Plus size={16} />
            <span>Ny skördedag (Batch)</span>
          </button>
        </div>
      </div>

      {/* Annual summary */}
      {years.length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: "1.25rem",
            backgroundColor: "var(--color-primary-subtle)",
            borderColor: "var(--color-primary-light)",
          }}
        >
          <div className="card-header">
            <h3 className="card-title" style={{ color: "var(--color-accent-dark)" }}>
              <Droplet size={18} />
              <span>Årlig produktionsöversikt</span>
            </h3>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {years.map((yr) => {
              const data = summaryByYear[yr];
              const kgExtracted = (data.totalExtractedGrams / 1000).toFixed(1).replace(".", ",");
              const kgJarred = (data.totalJarredGrams / 1000).toFixed(1).replace(".", ",");
              const kgRemaining = Math.max(
                0,
                (data.totalExtractedGrams - data.totalJarredGrams) / 1000,
              )
                .toFixed(1)
                .replace(".", ",");

              return (
                <div
                  key={yr}
                  style={{
                    background: "#fff",
                    padding: "0.85rem",
                    borderRadius: "8px",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "var(--color-accent-dark)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    År {yr}
                  </div>
                  <div
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 800,
                      color: "var(--color-text-main)",
                      marginTop: "0.2rem",
                    }}
                  >
                    {data.totalExtractedGrams > 0 ? `${kgExtracted} kg slungat` : `${data.totalJars} st burkar`}
                  </div>
                  <div style={{ fontSize: "0.775rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                    <div>
                      🍯 <strong>{data.totalJars} st burkar</strong> ({kgJarred} kg)
                    </div>
                    {data.totalExtractedGrams > 0 && (
                      <div style={{ color: "#b45309", marginTop: "0.15rem" }}>
                        📦 {kgRemaining} kg kvar i kärl
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {harvests.length === 0 ? (
        <div className="card empty-state">
          <Droplet size={40} className="empty-state-icon" />
          <h3 className="empty-state-title">Inga skördar registrerade än</h3>
          <p className="empty-state-desc">
            Registrera skördedagen när du slungar honung och mäter vattenhalt. Därefter kan du löpande
            registrera burkfyllning vid olika datum mot batchen!
          </p>
          <button className="btn btn-primary" onClick={onOpenCreateHarvest}>
            <Plus size={16} />
            <span>Registrera första skördedagen</span>
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {harvests.map((harvest) => {
            const hiveName = getHiveName(harvest.hiveId);
            const totalExtractedKg =
              harvest.honeyWeightGrams !== undefined ? harvest.honeyWeightGrams / 1000 : 0;

            // Compute jarred grams from fillings
            let jarredGrams = 0;
            let totalJars = 0;
            if (harvest.fillings && harvest.fillings.length > 0) {
              jarredGrams = harvest.fillings.reduce(
                (sum, f) => sum + (f.jarCount || 0) * (f.jarSizeGrams || 500),
                0,
              );
              totalJars = harvest.fillings.reduce((sum, f) => sum + (f.jarCount || 0), 0);
            } else if (harvest.jarCount !== undefined) {
              totalJars = harvest.jarCount;
              jarredGrams = harvest.jarCount * (harvest.jarSizeGrams || 500);
            }

            const jarredKg = jarredGrams / 1000;
            const remainingKg = Math.max(0, totalExtractedKg - jarredKg);
            const percentJarred =
              totalExtractedKg > 0 ? Math.min(100, Math.round((jarredKg / totalExtractedKg) * 100)) : 0;

            const isExpanded = expandedBatchIds[harvest.id] ?? false;

            return (
              <div
                key={harvest.id}
                className="card"
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "10px",
                  padding: "1rem",
                  background: "#ffffff",
                }}
              >
                {/* Header row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "1.1rem",
                          fontWeight: 700,
                          color: "var(--color-text-main)",
                        }}
                      >
                        {harvest.batchName || `Skörd ${harvest.date}`}
                      </h3>
                      <span className="badge badge-event-harvest">{hiveName}</span>
                      {harvest.waterContentPercent !== undefined && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background:
                              harvest.waterContentPercent < 18
                                ? "#dcfce7"
                                : harvest.waterContentPercent <= 20
                                  ? "#fef9c3"
                                  : "#fee2e2",
                            color:
                              harvest.waterContentPercent < 18
                                ? "#166534"
                                : harvest.waterContentPercent <= 20
                                  ? "#854d0e"
                                  : "#991b1b",
                          }}
                        >
                          💧 {harvest.waterContentPercent}% vatten
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        fontSize: "0.8rem",
                        color: "var(--color-text-muted)",
                        marginTop: "0.3rem",
                      }}
                    >
                      <span>
                        <Calendar size={13} style={{ display: "inline", verticalAlign: "middle" }} />{" "}
                        Slungad: {harvest.date}
                      </span>
                      {harvest.collectedDates && <span>(Insamlad: {harvest.collectedDates})</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onOpenJarFilling(harvest.id)}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                    >
                      <PackageCheck size={15} />
                      <span>Tappa på burk</span>
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onEditHarvest(harvest)}
                      title="Redigera parti"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        if (confirm(`Är du säker på att du vill ta bort ${harvest.batchName || "denna skörd"}?`)) {
                          onDeleteHarvest(harvest.id);
                        }
                      }}
                      title="Ta bort parti"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Progress & metrics */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: "0.6rem",
                    background: "#f8fafc",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      Slungad vikt
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                      {totalExtractedKg > 0 ? `${totalExtractedKg.toFixed(1).replace(".", ",")} kg` : "Ej angiven"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      Tappat på burk
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#166534" }}>
                      {jarredKg.toFixed(1).replace(".", ",")} kg{" "}
                      <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--color-text-muted)" }}>
                        ({totalJars} st)
                      </span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      Kvar i mognadskärl
                    </div>
                    <div
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        color: remainingKg > 0 ? "#b45309" : "#166534",
                      }}
                    >
                      {totalExtractedKg > 0
                        ? `${remainingKg.toFixed(1).replace(".", ",")} kg`
                        : `${totalJars} st burkar`}
                    </div>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                {totalExtractedKg > 0 && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.75rem",
                        color: "var(--color-text-muted)",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <span>Tappningsgrad</span>
                      <span>
                        {percentJarred}% ({jarredKg.toFixed(1)} av {totalExtractedKg.toFixed(1)} kg)
                      </span>
                    </div>
                    <div
                      style={{
                        height: "8px",
                        background: "#e2e8f0",
                        borderRadius: "4px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${percentJarred}%`,
                          background: percentJarred === 100 ? "#22c55e" : "#f59e0b",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Notes */}
                {harvest.notes && (
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--color-text-main)",
                      background: "#fffbeb",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      marginBottom: "0.75rem",
                      border: "1px solid #fef3c7",
                    }}
                  >
                    <strong>Anteckningar:</strong> {harvest.notes}
                  </div>
                )}

                {/* Fillings list toggle */}
                {harvest.fillings && harvest.fillings.length > 0 && (
                  <div style={{ marginTop: "0.5rem", borderTop: "1px solid var(--color-border)", paddingTop: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={() => toggleExpand(harvest.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        fontSize: "0.825rem",
                        fontWeight: 600,
                        color: "var(--color-primary)",
                        padding: "0.25rem 0",
                      }}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      <span>
                        Tappningstillfällen ({harvest.fillings.length} st, {totalJars} burkar)
                      </span>
                    </button>

                    {isExpanded && (
                      <div
                        style={{
                          marginTop: "0.5rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.4rem",
                          paddingLeft: "0.5rem",
                        }}
                      >
                        {harvest.fillings.map((filling) => {
                          const fillingKg = ((filling.jarCount * filling.jarSizeGrams) / 1000)
                            .toFixed(1)
                            .replace(".", ",");
                          return (
                            <div
                              key={filling.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                background: "#f8fafc",
                                padding: "0.4rem 0.65rem",
                                borderRadius: "6px",
                                fontSize: "0.825rem",
                              }}
                            >
                              <div>
                                <span style={{ fontWeight: 600, color: "var(--color-text-main)" }}>
                                  {filling.date}:
                                </span>{" "}
                                <span>
                                  {filling.jarCount} st × {filling.jarSizeGrams} g ={" "}
                                  <strong>{fillingKg} kg</strong>
                                </span>
                                {filling.notes && (
                                  <span style={{ color: "var(--color-text-muted)", marginLeft: "0.5rem" }}>
                                    ({filling.notes})
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                style={{ padding: "0.15rem 0.35rem", fontSize: "0.75rem" }}
                                onClick={() => {
                                  if (confirm("Ta bort denna burktappning?")) {
                                    onDeleteFilling(harvest.id, filling.id);
                                  }
                                }}
                                title="Ta bort tappning"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
