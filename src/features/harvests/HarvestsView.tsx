import React, { useState, useMemo } from "react";
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
  BarChart2,
  Layers,
  Award,
  Sparkles,
  TrendingUp,
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
  const [activeTab, setActiveTab] = useState<"batches" | "statistics">("batches");
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("all");
  const [expandedBatchIds, setExpandedBatchIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedBatchIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getHiveName = (hiveId?: string) => {
    if (!hiveId) return "Gemensam / hela bigården";
    const hive = hives.find((h) => h.id === hiveId);
    return hive ? hive.name : "Okänd kupa";
  };

  // Comprehensive harvest statistics calculation
  const stats = useMemo(() => {
    const yearsSet = new Set<string>();
    let totalHarvestGrams = 0;
    let totalJarredGrams = 0;
    let totalJarsCount = 0;
    let nyslungadGrams = 0;
    let nyslungadJars = 0;
    let rordGrams = 0;
    let rordJars = 0;

    const jarSizesMap: Record<number, number> = {};
    const yearStatsMap: Record<
      string,
      { totalGrams: number; jarredGrams: number; jars: number; batchesCount: number }
    > = {};
    const hiveStatsMap: Record<
      string,
      {
        hiveId: string;
        hiveName: string;
        totalGrams: number;
        jarCount: number;
        batchesCount: number;
        years: Record<string, number>;
      }
    > = {};

    // Initialize all known hives
    for (const h of hives) {
      hiveStatsMap[h.id] = {
        hiveId: h.id,
        hiveName: h.name,
        totalGrams: 0,
        jarCount: 0,
        batchesCount: 0,
        years: {},
      };
    }
    // Apiary common
    hiveStatsMap["common"] = {
      hiveId: "common",
      hiveName: "Gemensam / hela bigården",
      totalGrams: 0,
      jarCount: 0,
      batchesCount: 0,
      years: {},
    };

    for (const h of harvests) {
      const year = h.date.substring(0, 4) || "Okänt år";
      yearsSet.add(year);

      // Calculate jarred grams for this harvest
      let batchJarredGrams = 0;
      let batchJars = 0;

      if (h.fillings && h.fillings.length > 0) {
        for (const f of h.fillings) {
          const fGrams = (f.jarCount || 0) * (f.jarSizeGrams || 500);
          batchJarredGrams += fGrams;
          batchJars += f.jarCount || 0;

          // Track honey type
          if (f.honeyType === "nyslungad") {
            nyslungadGrams += fGrams;
            nyslungadJars += f.jarCount || 0;
          } else {
            rordGrams += fGrams;
            rordJars += f.jarCount || 0;
          }

          // Track jar sizes
          const sz = f.jarSizeGrams || 500;
          jarSizesMap[sz] = (jarSizesMap[sz] || 0) + (f.jarCount || 0);
        }
      } else if (h.jarCount !== undefined && h.jarSizeGrams !== undefined) {
        const legacyGrams = h.jarCount * h.jarSizeGrams;
        batchJarredGrams += legacyGrams;
        batchJars += h.jarCount;
        rordGrams += legacyGrams;
        rordJars += h.jarCount;
        jarSizesMap[h.jarSizeGrams] = (jarSizesMap[h.jarSizeGrams] || 0) + h.jarCount;
      }

      // Effective yield: use scale weight if known, otherwise sum of jar fillings!
      const effectiveBatchGrams =
        h.honeyWeightGrams && h.honeyWeightGrams > 0 ? h.honeyWeightGrams : batchJarredGrams;

      totalHarvestGrams += effectiveBatchGrams;
      totalJarredGrams += batchJarredGrams;
      totalJarsCount += batchJars;

      // Year stats
      if (!yearStatsMap[year]) {
        yearStatsMap[year] = { totalGrams: 0, jarredGrams: 0, jars: 0, batchesCount: 0 };
      }
      yearStatsMap[year].totalGrams += effectiveBatchGrams;
      yearStatsMap[year].jarredGrams += batchJarredGrams;
      yearStatsMap[year].jars += batchJars;
      yearStatsMap[year].batchesCount += 1;

      // Hive stats
      const targetHiveKey = h.hiveId && hiveStatsMap[h.hiveId] ? h.hiveId : "common";
      const targetHive = hiveStatsMap[targetHiveKey];
      if (targetHive) {
        targetHive.totalGrams += effectiveBatchGrams;
        targetHive.jarCount += batchJars;
        targetHive.batchesCount += 1;
        targetHive.years[year] = (targetHive.years[year] || 0) + effectiveBatchGrams;
      }
    }

    const sortedYears = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
    const hiveList = Object.values(hiveStatsMap)
      .filter((h) => h.totalGrams > 0 || h.hiveId !== "common")
      .sort((a, b) => b.totalGrams - a.totalGrams);

    // Best producing hive (excluding common)
    const topHive = hiveList.find((h) => h.hiveId !== "common" && h.totalGrams > 0) || null;

    // Average per active hive
    const producingHivesCount = hiveList.filter((h) => h.hiveId !== "common" && h.totalGrams > 0).length;
    const avgGramsPerHive = producingHivesCount > 0 ? totalHarvestGrams / producingHivesCount : 0;

    return {
      years: sortedYears,
      totalHarvestKg: totalHarvestGrams / 1000,
      totalJarredKg: totalJarredGrams / 1000,
      totalJarsCount,
      nyslungadKg: nyslungadGrams / 1000,
      nyslungadJars,
      rordKg: rordGrams / 1000,
      rordJars,
      jarSizesMap,
      yearStatsMap,
      hiveList,
      topHive,
      producingHivesCount,
      avgKgPerHive: avgGramsPerHive / 1000,
    };
  }, [harvests, hives]);

  // Filtered harvest batches
  const filteredHarvests = useMemo(() => {
    if (selectedYearFilter === "all") return harvests;
    return harvests.filter((h) => h.date.startsWith(selectedYearFilter));
  }, [harvests, selectedYearFilter]);

  return (
    <div>
      {/* Header */}
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
            Slungning, automatisk dragperiod, nyslungad/rörd honung och kupstatistik
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {onOpenHoneySale && (
            <button className="btn btn-honey btn-sm" onClick={onOpenHoneySale}>
              <Droplet size={16} />
              <span>Sälj honung</span>
            </button>
          )}
          {harvests.length > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenJarFilling()}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            >
              <PackageCheck size={16} color="var(--color-primary-base)" />
              <span>Tappa burkar</span>
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={onOpenCreateHarvest}>
            <Plus size={16} />
            <span>Ny skördedag (Batch)</span>
          </button>
        </div>
      </div>

      {/* Top Tabs: Batches vs Statistics */}
      <div className="tabs-header" style={{ marginBottom: "1.25rem" }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === "batches" ? "active" : ""}`}
          onClick={() => setActiveTab("batches")}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Droplet size={15} />
            <span>Skördepartier & burktappning ({harvests.length})</span>
          </span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "statistics" ? "active" : ""}`}
          onClick={() => setActiveTab("statistics")}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <BarChart2 size={15} />
            <span>Skördestatistik & kupjämförelse</span>
          </span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: SKÖRDESTATISTIK & KUPJÄMFÖRELSE
          ========================================================================= */}
      {activeTab === "statistics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Quick Metrics Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total skörd (all-time)</span>
              <span className="stat-value" style={{ color: "var(--color-accent-dark)" }}>
                {stats.totalHarvestKg.toFixed(1).replace(".", ",")} kg
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                {stats.totalJarsCount} burkar upptappade
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Snitt per kupa</span>
              <span className="stat-value" style={{ color: "var(--color-primary-base)" }}>
                {stats.avgKgPerHive > 0 ? `${stats.avgKgPerHive.toFixed(1).replace(".", ",")} kg` : "—"}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                {stats.producingHivesCount} producerande kupor
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Nyslungad honung</span>
              <span className="stat-value" style={{ color: "var(--color-honey-base)" }}>
                {stats.nyslungadKg.toFixed(1).replace(".", ",")} kg
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                {stats.nyslungadJars} st burkar ({stats.totalJarredKg > 0 ? Math.round((stats.nyslungadKg / stats.totalJarredKg) * 100) : 0}%)
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Rörd honung</span>
              <span className="stat-value" style={{ color: "var(--color-success-text)" }}>
                {stats.rordKg.toFixed(1).replace(".", ",")} kg
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                {stats.rordJars} st burkar ({stats.totalJarredKg > 0 ? Math.round((stats.rordKg / stats.totalJarredKg) * 100) : 0}%)
              </span>
            </div>
          </div>

          {/* 1. Skörd per kupa över tid (HIVE COMPARISON) */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Award size={18} color="var(--color-primary-base)" />
                <span>Skörd per kupa över tid</span>
              </h3>
              {stats.topHive && (
                <span className="badge badge-success" style={{ fontSize: "0.75rem" }}>
                  🏆 Toppkupa: {stats.topHive.hiveName} ({(stats.topHive.totalGrams / 1000).toFixed(1).replace(".", ",")} kg)
                </span>
              )}
            </div>

            <p style={{ fontSize: "0.825rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
              Jämför honungsproduktion mellan kupor och se vilka kolonier som ger bäst skörd.
            </p>

            {stats.hiveList.length === 0 || stats.totalHarvestKg === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>
                Inga skördar registrerade än. Klicka på "Ny skördedag" för att lägga till din första skörd.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {stats.hiveList.map((hItem, idx) => {
                  const kg = hItem.totalGrams / 1000;
                  const pct = stats.totalHarvestKg > 0 ? Math.round((kg / stats.totalHarvestKg) * 100) : 0;
                  const isTop = stats.topHive?.hiveId === hItem.hiveId && kg > 0;

                  return (
                    <div
                      key={hItem.hiveId}
                      style={{
                        background: isTop ? "var(--color-primary-surface)" : "var(--color-surface-inset)",
                        border: `1px solid ${isTop ? "var(--color-primary-border)" : "var(--color-border-subtle)"}`,
                        borderRadius: "10px",
                        padding: "0.85rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.4rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
                            {hItem.hiveName}
                          </span>
                          {isTop && (
                            <span className="badge badge-warning" style={{ fontSize: "0.7rem", padding: "1px 6px" }}>
                              Bästa skörd
                            </span>
                          )}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <strong style={{ fontSize: "1.05rem", color: "var(--color-accent-dark)" }}>
                            {kg.toFixed(1).replace(".", ",")} kg
                          </strong>{" "}
                          <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                            ({hItem.jarCount} burkar · {pct}%)
                          </span>
                        </div>
                      </div>

                      {/* Proportional visual bar */}
                      <div
                        style={{
                          height: "8px",
                          width: "100%",
                          background: "var(--color-border-default)",
                          borderRadius: "4px",
                          overflow: "hidden",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(100, pct)}%`,
                            background: isTop ? "var(--color-honey-base)" : "var(--color-primary-base)",
                            borderRadius: "4px",
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>

                      {/* Annual breakdown for this hive */}
                      {Object.keys(hItem.years).length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            gap: "0.6rem",
                            fontSize: "0.75rem",
                            color: "var(--color-text-secondary)",
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>Årsfördelning:</span>
                          {Object.entries(hItem.years)
                            .sort(([a], [b]) => b.localeCompare(a))
                            .map(([yr, grams]) => (
                              <span
                                key={yr}
                                style={{
                                  background: "var(--color-surface-bg)",
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                  border: "1px solid var(--color-border-subtle)",
                                }}
                              >
                                {yr}: <strong>{(grams / 1000).toFixed(1).replace(".", ",")} kg</strong>
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Årlig utveckling & Beredningsform */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {/* Årlig utveckling */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <TrendingUp size={18} color="var(--color-primary-base)" />
                  <span>Årsutveckling</span>
                </h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {stats.years.map((year) => {
                  const y = stats.yearStatsMap[year];
                  const yKg = y ? y.totalGrams / 1000 : 0;
                  return (
                    <div
                      key={year}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.6rem 0.75rem",
                        background: "var(--color-surface-inset)",
                        borderRadius: "8px",
                        border: "1px solid var(--color-border-subtle)",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "1rem" }}>{year}</strong>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                          {y?.batchesCount || 0} slungningar · {y?.jars || 0} burkar
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <strong style={{ fontSize: "1.1rem", color: "var(--color-accent-dark)" }}>
                          {yKg.toFixed(1).replace(".", ",")} kg
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Beredning: Nyslungad vs Rörd */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <Droplet size={18} color="var(--color-honey-base)" />
                  <span>Nyslungad vs Rörd honung</span>
                </h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <p style={{ fontSize: "0.825rem", color: "var(--color-text-muted)" }}>
                  Fördelning av upptappad honung mellan flytande nyslungad och mognad rörd honung.
                </p>

                {/* Split bar */}
                <div
                  style={{
                    height: "12px",
                    width: "100%",
                    background: "var(--color-border-subtle)",
                    borderRadius: "6px",
                    overflow: "hidden",
                    display: "flex",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${stats.totalJarredKg > 0 ? (stats.nyslungadKg / stats.totalJarredKg) * 100 : 0}%`,
                      background: "var(--color-honey-base)",
                    }}
                    title="Nyslungad"
                  />
                  <div
                    style={{
                      height: "100%",
                      width: `${stats.totalJarredKg > 0 ? (stats.rordKg / stats.totalJarredKg) * 100 : 100}%`,
                      background: "var(--color-primary-base)",
                    }}
                    title="Rörd honung"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                  <div
                    style={{
                      padding: "0.6rem",
                      background: "var(--color-honey-surface)",
                      borderRadius: "8px",
                      border: "1px solid var(--color-honey-border)",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-honey-text)" }}>
                      🍯 Nyslungad
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-honey-text)" }}>
                      {stats.nyslungadKg.toFixed(1).replace(".", ",")} kg
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-honey-text)", opacity: 0.85 }}>
                      {stats.nyslungadJars} st burkar
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "0.6rem",
                      background: "var(--color-success-surface)",
                      borderRadius: "8px",
                      border: "1px solid var(--color-success-border)",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-success-text)" }}>
                      🥄 Rörd honung
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-success-text)" }}>
                      {stats.rordKg.toFixed(1).replace(".", ",")} kg
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-success-text)", opacity: 0.85 }}>
                      {stats.rordJars} st burkar
                    </div>
                  </div>
                </div>

                {/* Jar sizes summary */}
                {Object.keys(stats.jarSizesMap).length > 0 && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: "0.3rem" }}>
                      Mest använda burkstorlekar:
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {Object.entries(stats.jarSizesMap)
                        .sort(([, a], [, b]) => b - a)
                        .map(([sz, count]) => (
                          <span
                            key={sz}
                            className="badge badge-neutral"
                            style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                          >
                            {sz}g: <strong>{count} burkar</strong>
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: SKÖRDEPARTIER & BURKTAPPNING (BATCHES)
          ========================================================================= */}
      {activeTab === "batches" && (
        <div>
          {/* Year Filter Pill Bar */}
          {stats.years.length > 1 && (
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Visa år:</span>
              <button
                type="button"
                className={`btn btn-sm ${selectedYearFilter === "all" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setSelectedYearFilter("all")}
              >
                Alla år ({harvests.length})
              </button>
              {stats.years.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  className={`btn btn-sm ${selectedYearFilter === yr ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setSelectedYearFilter(yr)}
                >
                  {yr}
                </button>
              ))}
            </div>
          )}

          {filteredHarvests.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "3rem 1.5rem",
                color: "var(--color-text-muted)",
              }}
            >
              <Droplet size={40} style={{ margin: "0 auto 1rem", opacity: 0.4 }} />
              <h3 style={{ marginBottom: "0.5rem" }}>Inga skördepartier registrerade än</h3>
              <p style={{ fontSize: "0.875rem", maxWidth: "420px", margin: "0 auto 1.5rem" }}>
                Registrera din första slungningsdag. Dragperiod beräknas automatiskt och du kan tappa på
                burk direkt eller löpande.
              </p>
              <button className="btn btn-primary" onClick={onOpenCreateHarvest}>
                <Plus size={16} />
                <span>Registrera första skördedagen</span>
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {filteredHarvests.map((harvest) => {
                const isExpanded = expandedBatchIds[harvest.id] ?? false;
                const hiveName = getHiveName(harvest.hiveId);

                // Calculate jarred totals
                let jarredGrams = 0;
                let totalJars = 0;
                let nyslungadBatchJars = 0;
                let rordBatchJars = 0;

                if (harvest.fillings && harvest.fillings.length > 0) {
                  for (const f of harvest.fillings) {
                    jarredGrams += (f.jarCount || 0) * (f.jarSizeGrams || 500);
                    totalJars += f.jarCount || 0;
                    if (f.honeyType === "nyslungad") {
                      nyslungadBatchJars += f.jarCount || 0;
                    } else {
                      rordBatchJars += f.jarCount || 0;
                    }
                  }
                } else if (harvest.jarCount !== undefined) {
                  totalJars = harvest.jarCount;
                  jarredGrams = harvest.jarCount * (harvest.jarSizeGrams || 500);
                  rordBatchJars = harvest.jarCount;
                }

                const hasScaleEstimate = harvest.honeyWeightGrams !== undefined && harvest.honeyWeightGrams > 0;
                const totalExtractedKg = (harvest.honeyWeightGrams || 0) / 1000;
                const jarredKg = jarredGrams / 1000;
                const remainingKg = Math.max(0, totalExtractedKg - jarredKg);

                const dragPeriodDisplay = harvest.dragPeriod || harvest.collectedDates;

                return (
                  <div
                    key={harvest.id}
                    className="card"
                    style={{
                      border: "1px solid var(--color-border-default)",
                      borderRadius: "10px",
                      padding: "1rem",
                      background: "var(--color-surface-bg)",
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
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <h3
                            style={{
                              margin: 0,
                              fontSize: "1.1rem",
                              fontWeight: 700,
                              color: "var(--color-text-primary)",
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
                                    ? "var(--color-success-surface)"
                                    : harvest.waterContentPercent <= 20
                                      ? "var(--color-warning-surface)"
                                      : "var(--color-danger-surface)",
                                color:
                                  harvest.waterContentPercent < 18
                                    ? "var(--color-success-text)"
                                    : harvest.waterContentPercent <= 20
                                      ? "var(--color-warning-text)"
                                      : "var(--color-danger-text)",
                                border: `1px solid ${
                                  harvest.waterContentPercent < 18
                                    ? "var(--color-success-border)"
                                    : harvest.waterContentPercent <= 20
                                      ? "var(--color-warning-border)"
                                      : "var(--color-danger-border)"
                                }`,
                              }}
                            >
                              💧 {harvest.waterContentPercent}% vatten
                            </span>
                          )}
                        </div>

                        {/* Date and Dragperiod */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.85rem",
                            fontSize: "0.825rem",
                            color: "var(--color-text-muted)",
                            marginTop: "0.35rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <span>
                            <Calendar size={13} style={{ display: "inline", verticalAlign: "middle" }} />{" "}
                            Slungad: {harvest.date}
                          </span>
                          {dragPeriodDisplay && (
                            <span
                              style={{
                                background: "var(--color-surface-inset)",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                border: "1px solid var(--color-border-subtle)",
                                color: "var(--color-accent-dark)",
                                fontWeight: 500,
                              }}
                            >
                              🌸 Dragperiod: {dragPeriodDisplay}
                            </span>
                          )}
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
                          <span>Tappa burkar</span>
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onEditHarvest(harvest)}
                          title="Redigera parti"
                          style={{ padding: "0.35rem 0.5rem" }}
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
                          style={{ padding: "0.35rem 0.5rem" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Progress & metrics */}
                    <div
                      className="box-inset"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                        gap: "0.6rem",
                        padding: "0.75rem",
                        marginBottom: "0.75rem",
                      }}
                    >
                      {hasScaleEstimate ? (
                        <>
                          <div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                              Slungat estimat
                            </div>
                            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                              {totalExtractedKg.toFixed(1).replace(".", ",")} kg
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                              Tappat på burk
                            </div>
                            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-success-text)" }}>
                              {jarredKg.toFixed(1).replace(".", ",")} kg{" "}
                              <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>
                                ({totalJars} st)
                              </span>
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                              Kvar i kärl
                            </div>
                            <div
                              style={{
                                fontSize: "1.1rem",
                                fontWeight: 700,
                                color: remainingKg > 0 ? "var(--color-warning-text)" : "var(--color-success-text)",
                              }}
                            >
                              {remainingKg.toFixed(1).replace(".", ",")} kg
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                              Upptappad skörd
                            </div>
                            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-success-text)" }}>
                              {jarredKg.toFixed(1).replace(".", ",")} kg{" "}
                              <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>
                                ({totalJars} burkar)
                              </span>
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                              Status
                            </div>
                            <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--color-primary-base)" }}>
                              Löpande tappning från kärl
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                              Beredning
                            </div>
                            <div style={{ fontSize: "0.85rem", color: "var(--color-text-primary)" }}>
                              {nyslungadBatchJars > 0 && <span>🍯 {nyslungadBatchJars} nyslungad </span>}
                              {rordBatchJars > 0 && <span>🥄 {rordBatchJars} rörd</span>}
                              {totalJars === 0 && "Inga burkar tappade än"}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Honey Type Tags if any jars recorded */}
                    {totalJars > 0 && (
                      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                        {nyslungadBatchJars > 0 && (
                          <span
                            className="badge badge-warning"
                            style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                          >
                            🍯 Nyslungad: {nyslungadBatchJars} st
                          </span>
                        )}
                        {rordBatchJars > 0 && (
                          <span
                            className="badge badge-success"
                            style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                          >
                            🥄 Rörd honung: {rordBatchJars} st
                          </span>
                        )}
                      </div>
                    )}

                    {/* Notes if any */}
                    {harvest.notes && (
                      <div
                        style={{
                          fontSize: "0.825rem",
                          color: "var(--color-text-secondary)",
                          marginBottom: "0.6rem",
                          fontStyle: "italic",
                        }}
                      >
                        Anteckning: {harvest.notes}
                      </div>
                    )}

                    {/* Fillings Accordion */}
                    {harvest.fillings && harvest.fillings.length > 0 && (
                      <div style={{ marginTop: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => toggleExpand(harvest.id)}
                          style={{
                            background: "none",
                            border: "none",
                            fontSize: "0.8rem",
                            color: "var(--color-primary-base)",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            padding: "0.2rem 0",
                          }}
                        >
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          <span>
                            {isExpanded ? "Dölj" : "Visa"} burktappningar ({harvest.fillings.length} st)
                          </span>
                        </button>

                        {isExpanded && (
                          <div
                            style={{
                              marginTop: "0.5rem",
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.4rem",
                            }}
                          >
                            {harvest.fillings.map((filling) => {
                              const fillingKg = ((filling.jarCount * filling.jarSizeGrams) / 1000)
                                .toFixed(1)
                                .replace(".", ",");
                              const isNyslungad = filling.honeyType === "nyslungad";

                              return (
                                <div
                                  key={filling.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    background: "var(--color-surface-inset)",
                                    border: "1px solid var(--color-border-subtle)",
                                    padding: "0.45rem 0.75rem",
                                    borderRadius: "8px",
                                    fontSize: "0.825rem",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                                    <span style={{ fontWeight: 600, color: "var(--color-text-main)" }}>
                                      {filling.date}:
                                    </span>
                                    <span>
                                      {filling.jarCount} st × {filling.jarSizeGrams} g ={" "}
                                      <strong>{fillingKg} kg</strong>
                                    </span>
                                    <span
                                      className={`badge ${isNyslungad ? "badge-warning" : "badge-success"}`}
                                      style={{ fontSize: "0.7rem", padding: "1px 6px" }}
                                    >
                                      {isNyslungad ? "🍯 Nyslungad" : "🥄 Rörd"}
                                    </span>
                                    {filling.notes && (
                                      <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>
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
      )}
    </div>
  );
};
