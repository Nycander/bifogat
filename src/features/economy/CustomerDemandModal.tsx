import React, { useState, useMemo } from "react";
import { Transaction } from "../../domain/types";
import { formatOreToSEK } from "../../domain/validation";
import {
  calculateCustomerAnalytics,
  CustomerLoyaltyStatus,
} from "../../domain/customerAnalytics";
import { detectLatestJarPriceOre } from "../../domain/honeyCostBreakdown";
import { useBottomSheet } from "../../hooks/useBottomSheet";
import { BottomSheetDragHandle } from "../../components/ui/BottomSheetDragHandle";
import {
  X,
  Users,
  Search,
  Info,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";
import { CustomerDrilldownSubModal } from "./CustomerDrilldownSubModal";

interface CustomerDemandModalProps {
  transactions: Transaction[];
  onClose: () => void;
}

type FilterTab = "all" | "regular" | "lapsed" | "new" | "channel";
type SortOption = "annual_demand" | "total_jars" | "total_spent" | "years" | "latest_date" | "name";

export const CustomerDemandModal: React.FC<CustomerDemandModalProps> = ({
  transactions,
  onClose,
}) => {
  const { contentRef, backdropRef, bottomSheetHandlers } = useBottomSheet({ onClose });

  // Standard jar price auto-detected from transactions (defaults to 100 kr)
  const standardPriceOre = useMemo(() => {
    return detectLatestJarPriceOre(transactions, 100);
  }, [transactions]);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<SortOption>("annual_demand");
  const [showMethodology, setShowMethodology] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);

  // Manual channel overrides stored in localStorage
  const [channelOverrides, setChannelOverrides] = useState<Record<string, "consumer" | "channel">>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem("bifogat_channel_overrides");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const handleToggleCustomerChannel = (customerName: string, isChannelNow: boolean) => {
    const key = customerName.toLowerCase().trim();
    const next: Record<string, "consumer" | "channel"> = {
      ...channelOverrides,
      [key]: isChannelNow ? "consumer" : "channel",
    };
    setChannelOverrides(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("bifogat_channel_overrides", JSON.stringify(next));
    }
  };

  // Calculate report across all historical transactions
  const report = useMemo(() => {
    return calculateCustomerAnalytics(transactions, {
      defaultPriceOre: standardPriceOre,
      channelOverrides,
    });
  }, [transactions, standardPriceOre, channelOverrides]);

  // Selected customer for drilldown
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerName) return null;
    return report.customers.find((c) => c.name.toLowerCase() === selectedCustomerName.toLowerCase()) || null;
  }, [report.customers, selectedCustomerName]);

  // Filtered & sorted customers
  const filteredCustomers = useMemo(() => {
    let list = report.customers;

    // Filter tab
    if (activeFilter === "regular") {
      list = list.filter((c) => c.status === "regular");
    } else if (activeFilter === "lapsed") {
      list = list.filter((c) => c.status === "lapsed");
    } else if (activeFilter === "new") {
      list = list.filter((c) => c.status === "new");
    } else if (activeFilter === "channel") {
      list = list.filter((c) => c.status === "channel" || c.isChannel);
    }

    // Search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }

    // Sorting
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "annual_demand":
          if (b.estimatedAnnualJars !== a.estimatedAnnualJars) {
            return b.estimatedAnnualJars - a.estimatedAnnualJars;
          }
          return b.totalJars - a.totalJars;
        case "total_jars":
          if (b.totalJars !== a.totalJars) {
            return b.totalJars - a.totalJars;
          }
          return b.totalSpentOre - a.totalSpentOre;
        case "total_spent":
          return b.totalSpentOre - a.totalSpentOre;
        case "years":
          if (b.activeYearCount !== a.activeYearCount) {
            return b.activeYearCount - a.activeYearCount;
          }
          return b.estimatedAnnualJars - a.estimatedAnnualJars;
        case "latest_date":
          return b.latestDate.localeCompare(a.latestDate);
        case "name":
          return a.name.localeCompare(b.name, "sv");
        default:
          return 0;
      }
    });
  }, [report.customers, activeFilter, searchQuery, sortBy]);

  const getStatusBadgeStyle = (status: CustomerLoyaltyStatus) => {
    switch (status) {
      case "regular":
        return {
          bg: "var(--color-honey-surface, #fffbeb)",
          border: "var(--color-honey-border, #fde68a)",
          text: "var(--color-honey-text, #92400e)",
        };
      case "lapsed":
        return {
          bg: "rgba(239, 68, 68, 0.08)",
          border: "rgba(239, 68, 68, 0.25)",
          text: "var(--color-danger, #dc2626)",
        };
      case "new":
        return {
          bg: "rgba(16, 185, 129, 0.08)",
          border: "rgba(16, 185, 129, 0.25)",
          text: "var(--color-success, #059669)",
        };
      case "channel":
        return {
          bg: "rgba(124, 58, 237, 0.08)",
          border: "rgba(124, 58, 237, 0.25)",
          text: "#7c3aed",
        };
      default:
        return {
          bg: "var(--color-surface-hover, #f3f4f6)",
          border: "var(--color-border, #e5e7eb)",
          text: "var(--color-text-muted, #6b7280)",
        };
    }
  };

  return (
    <div ref={backdropRef} className="modal-backdrop" onClick={onClose}>
      <div
        ref={contentRef}
        className="modal-content zero-scroll-modal"
        style={{ maxWidth: "680px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
        {...bottomSheetHandlers}
      >
        <BottomSheetDragHandle />

        {/* Modal Header */}
        <div className="modal-header wizard-header" style={{ paddingBottom: "12px", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              className="wizard-icon-badge"
              style={{
                background: "var(--color-honey-surface)",
                borderColor: "var(--color-honey-border)",
                color: "var(--color-honey-text)",
              }}
            >
              <Users size={18} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: "1.15rem", margin: 0, fontWeight: 700 }}>
                Stamkunder & Årsbehov
              </h2>
              <span className="wizard-subtitle" style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                Analys av 5 års honungskunder, återköpsmönster och estimerad efterfrågan
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Stäng">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="modal-scroll-body" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 4px 16px 4px" }}>
          {/* Top KPI Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "8px",
              marginBottom: "14px",
            }}
          >
            <div
              className="card"
              style={{
                padding: "10px 12px",
                marginBottom: 0,
                background: "var(--color-honey-surface)",
                borderColor: "var(--color-honey-border)",
              }}
            >
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-honey-text)" }}>
                STAMKUNDERNAS BEHOV
              </div>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--color-honey-text)", marginTop: "2px" }}>
                {report.regularEstimatedAnnualJars} st
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                burkar / säsong
              </div>
            </div>

            <div className="card" style={{ padding: "10px 12px", marginBottom: 0 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-brand)" }}>
                TROGNA STAMMISAR
              </div>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--color-text-main)", marginTop: "2px" }}>
                {report.regularCount} st
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                handlat under ≥ 2 år
              </div>
            </div>

            <div className="card" style={{ padding: "10px 12px", marginBottom: 0 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-danger)" }}>
                VILANDE STAMMISAR
              </div>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--color-danger)", marginTop: "2px" }}>
                {report.lapsedCount} st
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                kontakta vid skörd
              </div>
            </div>

            {report.channelCount > 0 && (
              <div className="card" style={{ padding: "10px 12px", marginBottom: 0 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#7c3aed" }}>
                  FÖRSÄLJNINGSKANALER
                </div>
                <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--color-text-main)", marginTop: "2px" }}>
                  {report.channelCount} st
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                  {report.channelTotalJars} burkar ({formatOreToSEK(report.channelTotalSpentOre)})
                </div>
              </div>
            )}

            <div className="card" style={{ padding: "10px 12px", marginBottom: 0 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)" }}>
                TOTAL KUNDBAS
              </div>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--color-text-main)", marginTop: "2px" }}>
                {report.totalCustomers} st
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                {report.totalJarsSold} burkar sålda totalt
              </div>
            </div>
          </div>

          {/* Educational / Methodology Disclosure */}
          <div
            className="card"
            style={{
              padding: "10px 12px",
              marginBottom: "14px",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              cursor: "pointer",
            }}
            onClick={() => setShowMethodology(!showMethodology)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowMethodology(!showMethodology);
              }
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Info size={16} color="var(--color-primary, #d97706)" />
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-main)" }}>
                  Hur beräknas estimat och stamkunder?
                </span>
              </div>
              {showMethodology ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>

            {showMethodology && (
              <div
                style={{
                  marginTop: "10px",
                  paddingTop: "10px",
                  borderTop: "1px solid var(--color-border)",
                  fontSize: "0.8rem",
                  color: "var(--color-text-muted)",
                  lineHeight: "1.45",
                }}
              >
                <p style={{ margin: "0 0 6px 0" }}>
                  <strong>1. Burkantal per transaktion:</strong> Läses i första hand från beskrivningen (t.ex. <em>"3 st burkar"</em>). Om text saknas beräknas det utifrån beloppet delat med standardpriset (95 kr).
                </p>
                <p style={{ margin: "0 0 6px 0" }}>
                  <strong>2. Estimerat årsbehov per kund:</strong> För varje kund räknas totalt köpta burkar delat med antalet unika säsonger/år kunden handlat:
                  <br />
                  <code style={{ fontSize: "0.75rem", background: "var(--color-surface-hover)", padding: "2px 4px", borderRadius: "4px" }}>
                    Årsbehov = Totalt köpta burkar / Antal aktiva säsonger
                  </code>
                </p>
                <p style={{ margin: "0 0 6px 0" }}>
                  <strong>3. Trogen stamkund:</strong> Kund som köpt honung under minst 2 olika kalenderår och handlat under den senaste säsongen ({report.latestYear}).
                </p>
                <p style={{ margin: "0 0 6px 0" }}>
                  <strong>4. Vilande stamkund:</strong> Kund med flerårig stamkundshistorik som <em>inte</em> köpt under den senaste säsongen. Dessa är bigårdens mest värdefulla kontaktlista inför årets slungning!
                </p>
                <p style={{ margin: "0 0 6px 0" }}>
                  <strong>5. Bigårdens stamkundsbehov:</strong> Summan av alla aktiva stammisars årsbehov ({report.regularEstimatedAnnualJars} burkar). Detta är minimimängden burkar du bör hålla reserverad innan överskott säljs till nya köpare.
                </p>
                <p style={{ margin: 0 }}>
                  <strong>6. Försäljningskanaler:</strong> Marknader, mässor, Reko-ringar, butiker och återförsäljare identifieras automatiskt och separeras från privata stamkunder så att deras storköp inte snedvrider den privata konsumentefterfrågan.
                </p>
              </div>
            )}
          </div>

          {/* Controls: Search, Filters, Sorting */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
            {/* Search Input */}
                <div style={{ position: "relative" }}>
                  <Search
                    size={16}
                    style={{
                      position: "absolute",
                      left: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--color-text-muted)",
                    }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Sök kund eller kanal..."
                    style={{ paddingLeft: "34px", fontSize: "0.85rem" }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-text-muted)",
                      }}
                      aria-label="Rensa sökning"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Filter Tabs & Sort Selector */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                  {/* Filter Chips */}
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {[
                      { id: "all" as const, label: `Alla (${report.totalCustomers})` },
                      { id: "regular" as const, label: `Stammisar (${report.regularCount})` },
                      { id: "lapsed" as const, label: `Vilande (${report.lapsedCount})` },
                      { id: "new" as const, label: `Nya (${report.newCount})` },
                      { id: "channel" as const, label: `Kanaler (${report.channelCount})` },
                    ].map((tab) => {
                      const isSelected = activeFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          className={`badge ${isSelected ? "badge-primary" : "badge-inactive"}`}
                          style={{
                            padding: "6px 10px",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            fontWeight: isSelected ? 700 : 500,
                            border: isSelected ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                            background: isSelected ? "var(--color-honey-surface)" : "var(--color-surface)",
                            color: isSelected ? "var(--color-honey-text)" : "var(--color-text-muted)",
                          }}
                          onClick={() => setActiveFilter(tab.id)}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sort Selector */}
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <ArrowUpDown size={14} color="var(--color-text-muted)" />
                    <select
                      className="form-input"
                      style={{ padding: "4px 8px", fontSize: "0.75rem", width: "auto" }}
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                    >
                      <option value="annual_demand">Högst årsbehov</option>
                      <option value="total_jars">Flest burkar totalt</option>
                      <option value="total_spent">Störst köpesumma</option>
                      <option value="years">Flest aktiva år</option>
                      <option value="latest_date">Senaste köp</option>
                      <option value="name">Namn (A-Ö)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Customer List */}
              {filteredCustomers.length === 0 ? (
                <div className="card empty-state" style={{ padding: "2rem" }}>
                  <Users size={32} className="empty-state-icon" />
                  <h4 className="empty-state-title" style={{ fontSize: "1rem" }}>
                    Inga kunder matchade filtret
                  </h4>
                  <p className="empty-state-desc" style={{ fontSize: "0.8rem" }}>
                    {searchQuery ? `Ingen kund hittades för "${searchQuery}"` : "Inga transaktioner registrerade ännu."}
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {filteredCustomers.map((c) => {
                    const badge = getStatusBadgeStyle(c.status);

                    return (
                      <div
                        key={c.name}
                        className="card"
                        style={{
                          padding: "10px 14px",
                          marginBottom: 0,
                          cursor: "pointer",
                          border: "1px solid var(--color-border)",
                          transition: "background 0.15s ease",
                        }}
                        onClick={() => setSelectedCustomerName(c.name)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedCustomerName(c.name);
                          }
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                          {/* Left: Customer Info & Timeline */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                                {c.name}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: "10px",
                                  background: badge.bg,
                                  border: `1px solid ${badge.border}`,
                                  color: badge.text,
                                }}
                              >
                                {c.statusLabel}
                              </span>
                            </div>

                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                              {c.totalJars} burkar totalt ({formatOreToSEK(c.totalSpentOre)}) • {c.orderCount} köp
                            </div>

                            {/* Year tags timeline */}
                            <div style={{ display: "flex", gap: "4px", marginTop: "6px", flexWrap: "wrap" }}>
                              {report.allYears.map((yr) => {
                                const didBuy = c.activeYears.includes(yr);
                                const yrStat = c.yearlyBreakdown.find((y) => y.year === yr);
                                return (
                                  <span
                                    key={yr}
                                    style={{
                                      fontSize: "0.65rem",
                                      fontWeight: didBuy ? 700 : 400,
                                      padding: "1px 5px",
                                      borderRadius: "4px",
                                      background: didBuy ? "var(--color-honey-surface)" : "var(--color-surface-hover)",
                                      border: didBuy ? "1px solid var(--color-honey-border)" : "1px solid transparent",
                                      color: didBuy ? "var(--color-honey-text)" : "var(--color-text-light)",
                                    }}
                                    title={yrStat ? `${yr}: ${yrStat.jars} burkar (${formatOreToSEK(yrStat.spentOre)})` : `${yr}: Inget köp`}
                                  >
                                    '{yr.substring(2)} {didBuy && `(${yrStat?.jars}st)`}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          {/* Right: Estimated Annual Demand */}
                          <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: "10px" }}>
                            <div>
                              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                                Årsbehov
                              </div>
                              <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--color-honey-text)" }}>
                                ~{c.estimatedAnnualJars} st
                              </div>
                              <div style={{ fontSize: "0.65rem", color: "var(--color-text-light)" }}>
                                Senast: {c.latestDate}
                              </div>
                            </div>
                            <ChevronRight size={18} color="var(--color-text-muted)" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ borderTop: "1px solid var(--color-border)", paddingTop: "10px" }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ width: "100%" }}>
            Stäng
          </button>
        </div>
      </div>

      {/* Stacked Customer Drilldown Sub-Modal */}
      {selectedCustomer && (
        <CustomerDrilldownSubModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomerName(null)}
          onToggleChannelOverride={handleToggleCustomerChannel}
        />
      )}
    </div>
  );
};
