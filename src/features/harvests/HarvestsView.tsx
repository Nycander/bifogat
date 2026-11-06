import React, { useState, useMemo } from "react";
import { Harvest, Hive, HiveEvent } from "../../domain/types";
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
  TrendingUp,
  Crown,
  Sparkles,
} from "lucide-react";

interface HarvestsViewProps {
  harvests: Harvest[];
  hives: Hive[];
  events?: HiveEvent[];
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
  events = [],
  onOpenCreateHarvest,
  onEditHarvest,
  onDeleteHarvest,
  onOpenJarFilling,
  onDeleteFilling,
}) => {
  const [activeTab, setActiveTab] = useState<"batches" | "statistics">("batches");
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("all");
  const [expandedBatchIds, setExpandedBatchIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedBatchIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getHivesCountForYear = (year: string) => {
    // 1. Hives created on or before December 31 of that year
    const existed = hives.filter((h) => {
      const createdYear = h.createdAt ? h.createdAt.substring(0, 4) : "9999";
      return createdYear <= year;
    });

    // 2. Unique hive IDs with events or harvests in that year
    const activeHiveIdsInYear = new Set<string>();
    if (events) {
      for (const e of events) {
        if (e.date && e.date.startsWith(year) && e.hiveId) {
          activeHiveIdsInYear.add(e.hiveId);
        }
      }
    }
    for (const h of harvests) {
      if (h.date && h.date.startsWith(year) && h.hiveId) {
        activeHiveIdsInYear.add(h.hiveId);
      }
    }

    const countFromCreated = existed.length;
    const countFromActivity = activeHiveIdsInYear.size;

    const count = Math.max(countFromCreated, countFromActivity);
    return count > 0 ? count : 1;
  };

  const activeHivesCount = useMemo(() => {
    const active = hives.filter((h) => h.status === "active").length;
    return active > 0 ? active : hives.length > 0 ? hives.length : 1;
  }, [hives]);

  // Bigårdens samlade skördestatistik över tid
  const stats = useMemo(() => {
    const yearsSet = new Set<string>();
    let totalHarvestGrams = 0;
    let totalJarredGrams = 0;
    let totalJarsCount = 0;
    let count500gJars = 0;
    let otherJarsCount = 0;

    let nyslungadGrams = 0;
    let nyslungadJars = 0;
    let rordGrams = 0;
    let rordJars = 0;

    const yearStatsMap: Record<
      string,
      {
        totalGrams: number;
        jarredGrams: number;
        jars: number;
        jars500g: number;
        batches: Array<{
          id: string;
          name: string;
          date: string;
          dragPeriod?: string;
          grams: number;
          jars: number;
        }>;
      }
    > = {};

    for (const h of harvests) {
      const year = h.date.substring(0, 4) || "Okänt år";
      yearsSet.add(year);

      let batchJarredGrams = 0;
      let batchJars = 0;
      let batch500gJars = 0;

      if (h.fillings && h.fillings.length > 0) {
        for (const f of h.fillings) {
          const sz = f.jarSizeGrams || 500;
          const fGrams = (f.jarCount || 0) * sz;
          batchJarredGrams += fGrams;
          batchJars += f.jarCount || 0;

          if (sz === 500) {
            batch500gJars += f.jarCount || 0;
            count500gJars += f.jarCount || 0;
          } else {
            otherJarsCount += f.jarCount || 0;
          }

          // Track honey type
          if (f.honeyType === "nyslungad") {
            nyslungadGrams += fGrams;
            nyslungadJars += f.jarCount || 0;
          } else {
            rordGrams += fGrams;
            rordJars += f.jarCount || 0;
          }
        }
      } else if (h.jarCount !== undefined) {
        const sz = h.jarSizeGrams || 500;
        const legacyGrams = h.jarCount * sz;
        batchJarredGrams += legacyGrams;
        batchJars += h.jarCount;
        if (sz === 500) {
          batch500gJars += h.jarCount;
          count500gJars += h.jarCount;
        } else {
          otherJarsCount += h.jarCount;
        }
        rordGrams += legacyGrams;
        rordJars += h.jarCount;
      }

      // Effective yield: use scale weight if known, otherwise sum of jar fillings!
      const effectiveBatchGrams =
        h.honeyWeightGrams && h.honeyWeightGrams > 0 ? h.honeyWeightGrams : batchJarredGrams;

      totalHarvestGrams += effectiveBatchGrams;
      totalJarredGrams += batchJarredGrams;
      totalJarsCount += batchJars;

      if (!yearStatsMap[year]) {
        yearStatsMap[year] = {
          totalGrams: 0,
          jarredGrams: 0,
          jars: 0,
          jars500g: 0,
          batches: [],
        };
      }

      yearStatsMap[year].totalGrams += effectiveBatchGrams;
      yearStatsMap[year].jarredGrams += batchJarredGrams;
      yearStatsMap[year].jars += batchJars;
      yearStatsMap[year].jars500g += batch500gJars;
      yearStatsMap[year].batches.push({
        id: h.id,
        name: h.batchName || `Skörd ${h.date}`,
        date: h.date,
        dragPeriod: h.dragPeriod || h.collectedDates,
        grams: effectiveBatchGrams,
        jars: batchJars,
      });
    }

    const sortedYears = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));

    // Best year
    let bestYear = "";
    let bestYearGrams = 0;
    for (const [yr, yData] of Object.entries(yearStatsMap)) {
      if (yData.totalGrams > bestYearGrams) {
        bestYearGrams = yData.totalGrams;
        bestYear = yr;
      }
    }

    let totalYearlyAvgSum = 0;
    let validYearsCount = 0;
    for (const [yr, yData] of Object.entries(yearStatsMap)) {
      const hCount = getHivesCountForYear(yr);
      if (hCount > 0 && yData.totalGrams > 0) {
        totalYearlyAvgSum += (yData.totalGrams / 1000) / hCount;
        validYearsCount += 1;
      }
    }
    const historicalAvgPerHive = validYearsCount > 0 ? totalYearlyAvgSum / validYearsCount : 0;

    return {
      years: sortedYears,
      totalHarvestKg: totalHarvestGrams / 1000,
      totalJarredKg: totalJarredGrams / 1000,
      totalJarsCount,
      count500gJars,
      otherJarsCount,
      nyslungadKg: nyslungadGrams / 1000,
      nyslungadJars,
      rordKg: rordGrams / 1000,
      rordJars,
      yearStatsMap,
      bestYear,
      bestYearKg: bestYearGrams / 1000,
      avgKgPerHive: historicalAvgPerHive,
    };
  }, [harvests, hives, events]);

  // Filtered harvest batches
  const filteredHarvests = useMemo(() => {
    if (selectedYearFilter === "all") return harvests;
    return harvests.filter((h) => h.date.startsWith(selectedYearFilter));
  }, [harvests, selectedYearFilter]);

  return (
    <div>
      {/* Header */}
      <div className="view-header">
        <div className="view-header-title">
          <h1>Skörd</h1>
          <p className="view-header-subtitle">
            Registrera slungningar, följ dragperioder och hantera burktappning
          </p>
        </div>
        <div className="view-header-actions">
          {harvests.length > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenJarFilling()}
            >
              <PackageCheck size={16} />
              <span>Tappa burkar</span>
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={onOpenCreateHarvest}>
            <Plus size={16} />
            <span>Ny skörd</span>
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
            <span>Partier</span>
          </span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "statistics" ? "active" : ""}`}
          onClick={() => setActiveTab("statistics")}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <BarChart2 size={15} />
            <span>Statistik</span>
          </span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: BIGÅRDENS SKÖRDESTATISTIK & ÅRSUTVECKLING
          ========================================================================= */}
      {activeTab === "statistics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Quick Metrics Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Totalskörd</span>
              <span className="stat-value" style={{ color: "var(--color-accent-dark)" }}>
                {stats.totalHarvestKg.toFixed(1).replace(".", ",")} kg
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                {stats.totalJarsCount} burkar · {stats.count500gJars} st 500g
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Snitt / kupa</span>
              <span className="stat-value" style={{ color: "var(--color-primary-base)" }}>
                {stats.avgKgPerHive > 0 ? `${stats.avgKgPerHive.toFixed(1).replace(".", ",")} kg` : "—"}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                {activeHivesCount} aktiva kupor
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Nyslungad</span>
              <span className="stat-value" style={{ color: "var(--color-honey-base)" }}>
                {stats.nyslungadKg.toFixed(1).replace(".", ",")} kg
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                {stats.nyslungadJars} burkar ({stats.totalJarredKg > 0 ? Math.round((stats.nyslungadKg / stats.totalJarredKg) * 100) : 0}%)
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Rörd</span>
              <span className="stat-value" style={{ color: "var(--color-success-text)" }}>
                {stats.rordKg.toFixed(1).replace(".", ",")} kg
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                {stats.rordJars} burkar ({stats.totalJarredKg > 0 ? Math.round((stats.rordKg / stats.totalJarredKg) * 100) : 0}%)
              </span>
            </div>
          </div>

          {/* 1. Årsjämförelse & Historik (APIARY OVER TIME) */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <TrendingUp size={18} color="var(--color-primary-base)" />
                <span>Historik</span>
              </h3>
              {stats.bestYear && (
                <span className="badge badge-success" style={{ fontSize: "0.75rem" }}>
                  <Crown size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} /> Rekord {stats.bestYear}: {stats.bestYearKg.toFixed(1).replace(".", ",")} kg
                </span>
              )}
            </div>

            {stats.years.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>
                Inga skördar registrerade än.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {stats.years.map((year) => {
                  const y = stats.yearStatsMap[year];
                  const yKg = y ? y.totalGrams / 1000 : 0;
                  const pct = stats.bestYearKg > 0 ? Math.round((yKg / stats.bestYearKg) * 100) : 0;
                  const isRecord = stats.bestYear === year && yKg > 0;
                  const hivesInYear = getHivesCountForYear(year);
                  const avgPerHiveYear = hivesInYear > 0 ? yKg / hivesInYear : yKg;

                  return (
                    <div
                      key={year}
                      style={{
                        background: isRecord ? "var(--color-primary-surface)" : "var(--color-surface-inset)",
                        border: `1px solid ${isRecord ? "var(--color-primary-border)" : "var(--color-border-subtle)"}`,
                        borderRadius: "10px",
                        padding: "0.85rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "0.35rem",
                          gap: "0.5rem",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--color-text-primary)" }}>
                              Säsong {year}
                            </span>
                            {isRecord && (
                              <span className="badge badge-warning" style={{ fontSize: "0.7rem", padding: "1px 6px" }}>
                                Bästa
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                            {y ? y.jars : 0} burkar · {avgPerHiveYear.toFixed(1).replace(".", ",")} kg/kupa · {hivesInYear} {hivesInYear === 1 ? "kupa" : "kupor"}
                          </div>
                        </div>

                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <strong style={{ fontSize: "1.15rem", color: "var(--color-accent-dark)" }}>
                            {yKg.toFixed(1).replace(".", ",")} kg
                          </strong>
                        </div>
                      </div>

                      {/* Visual Progress Bar */}
                      <div
                        style={{
                          height: "8px",
                          width: "100%",
                          background: "var(--color-border-default)",
                          borderRadius: "4px",
                          overflow: "hidden",
                          marginBottom: "0.6rem",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(100, pct)}%`,
                            background: isRecord ? "var(--color-honey-base)" : "var(--color-primary-base)",
                            borderRadius: "4px",
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>

                      {/* Batches in this year */}
                      {y?.batches && y.batches.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "0.4rem" }}>
                          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-secondary)" }}>
                            Slungningar:
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            {y.batches.map((b) => (
                              <div
                                key={b.id}
                                style={{
                                  background: "var(--color-surface-bg)",
                                  border: "1px solid var(--color-border-subtle)",
                                  borderRadius: "6px",
                                  padding: "0.3rem 0.6rem",
                                  fontSize: "0.75rem",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.4rem",
                                }}
                              >
                                <span style={{ fontWeight: 600 }}>{b.name}:</span>
                                <strong>{(b.grams / 1000).toFixed(1).replace(".", ",")} kg</strong>
                                {b.dragPeriod && (
                                  <span style={{ color: "var(--color-text-muted)", fontSize: "0.7rem" }}>
                                    • {b.dragPeriod}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Honungstyp & Standardförpackning (500g) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            {/* Nyslungad vs Rörd honung */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <Droplet size={18} color="var(--color-honey-base)" />
                  <span>Honungstyp</span>
                </h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
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
                    title="Rörd"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                  <div
                    style={{
                      padding: "0.65rem",
                      background: "var(--color-honey-surface)",
                      borderRadius: "8px",
                      border: "1px solid var(--color-honey-border)",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-honey-text)" }}>
                      Nyslungad
                    </div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--color-honey-text)" }}>
                      {stats.nyslungadKg.toFixed(1).replace(".", ",")} kg
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-honey-text)", opacity: 0.85 }}>
                      {stats.nyslungadJars} burkar
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "0.65rem",
                      background: "var(--color-success-surface)",
                      borderRadius: "8px",
                      border: "1px solid var(--color-success-border)",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-success-text)" }}>
                      Rörd
                    </div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--color-success-text)" }}>
                      {stats.rordKg.toFixed(1).replace(".", ",")} kg
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-success-text)", opacity: 0.85 }}>
                      {stats.rordJars} burkar
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Standardförpackning: 500g burkar */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <PackageCheck size={18} color="var(--color-primary-base)" />
                  <span>Burkstorlekar</span>
                </h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div
                  style={{
                    padding: "0.75rem",
                    background: "var(--color-surface-inset)",
                    borderRadius: "8px",
                    border: "1px solid var(--color-border-subtle)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>500 g</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      {stats.totalJarsCount > 0 ? Math.round((stats.count500gJars / stats.totalJarsCount) * 100) : 100}% av skörden
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--color-accent-dark)" }}>
                      {stats.count500gJars} st
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      {(stats.count500gJars * 0.5).toFixed(1).replace(".", ",")} kg
                    </div>
                  </div>
                </div>

                {stats.otherJarsCount > 0 && (
                  <div
                    style={{
                      padding: "0.5rem 0.75rem",
                      background: "var(--color-surface-bg)",
                      borderRadius: "6px",
                      border: "1px solid var(--color-border-subtle)",
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.8rem",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    <span>Övriga:</span>
                    <strong>{stats.otherJarsCount} st</strong>
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
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "1rem",
                alignItems: "center",
                overflowX: "auto",
                whiteSpace: "nowrap",
                paddingBottom: "4px",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", flexShrink: 0 }}>Visa år:</span>
              <button
                type="button"
                className={`btn btn-sm ${selectedYearFilter === "all" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setSelectedYearFilter("all")}
                style={{ flexShrink: 0 }}
              >
                Alla år
              </button>
              {stats.years.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  className={`btn btn-sm ${selectedYearFilter === yr ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setSelectedYearFilter(yr)}
                  style={{ flexShrink: 0 }}
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
              <h3 style={{ marginBottom: "0.5rem" }}>Inga skördepartier</h3>
              <p style={{ fontSize: "0.875rem", maxWidth: "420px", margin: "0 auto 1.5rem" }}>
                Registrera din första slungningsdag.
              </p>
              <button className="btn btn-primary" onClick={onOpenCreateHarvest}>
                <Plus size={16} />
                <span>Ny skörd</span>
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {filteredHarvests.map((harvest) => {
                const isExpanded = expandedBatchIds[harvest.id] ?? false;

                // Calculate jarred totals
                let jarredGrams = 0;
                let totalJars = 0;
                let jars500g = 0;
                let nyslungadBatchJars = 0;
                let rordBatchJars = 0;

                if (harvest.fillings && harvest.fillings.length > 0) {
                  for (const f of harvest.fillings) {
                    const sz = f.jarSizeGrams || 500;
                    jarredGrams += (f.jarCount || 0) * sz;
                    totalJars += f.jarCount || 0;
                    if (sz === 500) jars500g += f.jarCount || 0;

                    if (f.honeyType === "nyslungad") {
                      nyslungadBatchJars += f.jarCount || 0;
                    } else {
                      rordBatchJars += f.jarCount || 0;
                    }
                  }
                } else if (harvest.jarCount !== undefined) {
                  totalJars = harvest.jarCount;
                  const sz = harvest.jarSizeGrams || 500;
                  jarredGrams = harvest.jarCount * sz;
                  if (sz === 500) jars500g = harvest.jarCount;
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
                              <Droplet size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "2px" }} /> {harvest.waterContentPercent}% vatten
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
                            <Calendar size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} />
                            {harvest.date}
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
                              <Sparkles size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }} /> {dragPeriodDisplay}
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
                          <span>Tappa</span>
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
                        gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                        gap: "0.6rem",
                        padding: "0.75rem",
                        marginBottom: "0.75rem",
                      }}
                    >
                      {hasScaleEstimate ? (
                        <>
                          <div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                              Slungat
                            </div>
                            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                              {totalExtractedKg.toFixed(1).replace(".", ",")} kg
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                              Burkat
                            </div>
                            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-success-text)" }}>
                              {jarredKg.toFixed(1).replace(".", ",")} kg
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                              {totalJars} st ({jars500g} st 500g)
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                              Kvar
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
                              Burkat
                            </div>
                            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-success-text)" }}>
                              {jarredKg.toFixed(1).replace(".", ",")} kg
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                              {totalJars} st ({jars500g} st 500g)
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                              Status
                            </div>
                            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-primary-base)" }}>
                              Löpande tappning
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                              Beredning
                            </div>
                            <div style={{ fontSize: "0.85rem", color: "var(--color-text-primary)" }}>
                              {nyslungadBatchJars > 0 && (
                                <span>
                                  <Droplet size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "2px" }} />
                                  {nyslungadBatchJars} nyslungad{" "}
                                </span>
                              )}
                              {rordBatchJars > 0 && (
                                <span>
                                  <Sparkles size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "2px" }} />
                                  {rordBatchJars} rörd
                                </span>
                              )}
                              {totalJars === 0 && "Ej tappad"}
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
                            <Droplet size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "2px" }} />
                            Nyslungad: {nyslungadBatchJars} st
                          </span>
                        )}
                        {rordBatchJars > 0 && (
                          <span
                            className="badge badge-success"
                            style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                          >
                            <Sparkles size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "2px" }} />
                            Rörd: {rordBatchJars} st
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
                            {isExpanded ? "Dölj" : "Visa"} tappningar ({harvest.fillings.length})
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
                              const sz = filling.jarSizeGrams || 500;
                              const fillingKg = ((filling.jarCount * sz) / 1000)
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
                                      {filling.jarCount} st × {sz} g ={" "}
                                      <strong>{fillingKg} kg</strong>
                                    </span>
                                    <span
                                      className={`badge ${isNyslungad ? "badge-warning" : "badge-success"}`}
                                      style={{ fontSize: "0.7rem", padding: "1px 6px", display: "inline-flex", alignItems: "center", gap: "3px" }}
                                    >
                                      {isNyslungad ? <Droplet size={11} /> : <Sparkles size={11} />}
                                      {isNyslungad ? "Nyslungad" : "Rörd"}
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
