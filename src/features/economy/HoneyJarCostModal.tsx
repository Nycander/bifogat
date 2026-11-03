import React, { useState, useMemo } from "react";
import { Transaction, Harvest } from "../../domain/types";
import { calculateHoneyCostBreakdown } from "../../domain/honeyCostBreakdown";
import { formatOreToSEK } from "../../domain/validation";
import { useBottomSheet } from "../../hooks/useBottomSheet";
import { BottomSheetDragHandle } from "../../components/ui/BottomSheetDragHandle";
import {
  X,
  Droplet,
  Package,
  Wheat,
  Layers,
  ShieldAlert,
  Crown,
  Boxes,
  Sparkles,
  Shield,
  ScrollText,
  Truck,
  HelpCircle,
  TrendingUp,
  Info,
} from "lucide-react";

interface HoneyJarCostModalProps {
  transactions: Transaction[];
  harvests: Harvest[];
  onClose: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Package,
  Wheat,
  Layers,
  ShieldAlert,
  Crown,
  Boxes,
  Sparkles,
  Shield,
  ScrollText,
  Truck,
  HelpCircle,
};

export const HoneyJarCostModal: React.FC<HoneyJarCostModalProps> = ({
  transactions,
  harvests,
  onClose,
}) => {
  // Compute total harvested jars from harvests if available
  const totalHarvestedJars = useMemo(() => {
    let count = 0;
    for (const h of harvests) {
      if (h.fillings && h.fillings.length > 0) {
        for (const f of h.fillings) {
          count += f.jarCount || 0;
        }
      } else if (h.jarCount) {
        count += h.jarCount;
      } else if (h.honeyWeightGrams) {
        // approximate 500g jars
        count += Math.round(h.honeyWeightGrams / 500);
      }
    }
    return count > 0 ? count : undefined;
  }, [harvests]);

  // Read saved default price from localStorage or 95 kr
  const savedPrice =
    typeof window !== "undefined"
      ? localStorage.getItem("bifogat_honey_price_per_jar")
      : null;
  const initialPriceOre = savedPrice ? (parseInt(savedPrice, 10) || 95) * 100 : 9500;

  const [priceOre, setPriceOre] = useState<number>(initialPriceOre);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const handlePriceChange = (newPriceKr: number) => {
    const validKr = Math.max(10, Math.min(500, newPriceKr));
    const newOre = validKr * 100;
    setPriceOre(newOre);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("bifogat_honey_price_per_jar", validKr.toString());
      } catch {
        // ignore
      }
    }
  };

  const breakdown = useMemo(() => {
    return calculateHoneyCostBreakdown(transactions, priceOre, totalHarvestedJars);
  }, [transactions, priceOre, totalHarvestedJars]);

  const { contentRef, backdropRef, bottomSheetHandlers } = useBottomSheet({ onClose });

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return breakdown.categories.find((c) => c.id === selectedCategoryId) || null;
  }, [breakdown.categories, selectedCategoryId]);

  // Calculate visual heights for the jar layers
  // Total height of the jar inner liquid column in px or %
  // Total price = 100% of the jar filling.
  // Each category gets height proportional to its costPerJarOre / priceOre
  const totalCostPerJarOre = breakdown.categories.reduce(
    (sum, c) => sum + c.costPerJarOre,
    0,
  );
  const jarFillCapacityOre = Math.max(priceOre, totalCostPerJarOre);

  const profitOre = Math.max(0, priceOre - totalCostPerJarOre);
  const profitPercentage =
    jarFillCapacityOre > 0 ? (profitOre / jarFillCapacityOre) * 100 : 0;

  return (
    <div ref={backdropRef} className="modal-backdrop" onClick={onClose}>
      <div
        ref={contentRef}
        className="modal-content honey-jar-modal-content"
        onClick={(e) => e.stopPropagation()}
        {...bottomSheetHandlers}
      >
        <BottomSheetDragHandle />

        {/* Modal Header */}
        <div className="modal-header" style={{ marginBottom: "8px", paddingBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "var(--color-honey-surface)",
                border: "1px solid var(--color-honey-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-honey-text)",
              }}
            >
              <Droplet size={20} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: "1.15rem", margin: 0, lineHeight: 1.2 }}>
                Vad kostar en burk honung?
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", margin: 0 }}>
                Pedagogisk kostnadsuppdelning per 500g burk
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Stäng">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Container with Two-Column Desktop / Stacked Mobile Layout */}
        <div className="modal-scroll-body honey-jar-modal-body">
          {/* Top Quick Bar: Price & Margin KPI */}
          <div className="honey-jar-kpi-banner">
            <div className="honey-jar-kpi-item">
              <span className="honey-jar-kpi-label">Försäljningspris</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm btn-icon-only"
                  style={{ width: "24px", height: "24px", padding: 0 }}
                  onClick={() => handlePriceChange(Math.round(priceOre / 100) - 5)}
                  title="Sänk pris med 5 kr"
                  aria-label="Sänk pris"
                >
                  -
                </button>
                <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                  <span className="honey-jar-kpi-value">
                    {Math.round(priceOre / 100)}
                  </span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-text-secondary)" }}>
                    kr
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm btn-icon-only"
                  style={{ width: "24px", height: "24px", padding: 0 }}
                  onClick={() => handlePriceChange(Math.round(priceOre / 100) + 5)}
                  title="Höj pris med 5 kr"
                  aria-label="Höj pris"
                >
                  +
                </button>
              </div>
            </div>

            <div className="honey-jar-kpi-divider" />

            <div className="honey-jar-kpi-item">
              <span className="honey-jar-kpi-label">Samlade kostnader</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                <span className="honey-jar-kpi-value" style={{ color: "var(--color-danger-base)" }}>
                  {Math.round(totalCostPerJarOre / 100)}
                </span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-danger-base)" }}>
                  kr
                </span>
              </div>
            </div>

            <div className="honey-jar-kpi-divider" />

            <div className="honey-jar-kpi-item">
              <span className="honey-jar-kpi-label">Biodlarens netto</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                <span
                  className="honey-jar-kpi-value"
                  style={{
                    color: profitOre >= 0 ? "var(--color-success-base)" : "var(--color-danger-base)",
                  }}
                >
                  {profitOre >= 0 ? `+${Math.round(profitOre / 100)}` : `${Math.round(profitOre / 100)}`}
                </span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-success-base)" }}>
                  kr ({Math.round(profitPercentage)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Visual Jar & Breakdown List */}
          <div className="honey-jar-grid">
            {/* LEFT / TOP: The Visual Realistic Honey Jar */}
            <div className="honey-jar-visual-container">
              <div className="honey-jar-graphic">
                {/* Jar Lid / Cap */}
                <div className="jar-lid">
                  <div className="jar-lid-ribs" />
                  <span className="jar-lid-brand">BIFOGAT 100% REN SVENSK HONUNG</span>
                </div>

                {/* Jar Neck Ring */}
                <div className="jar-neck" />

                {/* Glass Body with Layers */}
                <div className="jar-glass-body">
                  {/* Subtle glass reflection gradient */}
                  <div className="jar-glass-highlight" />

                  {/* Honey / Cost Layers from Bottom to Top */}
                  <div className="jar-liquid-column">
                    {/* Optional Top Layer: Net Profit / Biodlarlön */}
                    {profitOre > 0 && (
                      <div
                        className={`jar-layer jar-layer-profit ${selectedCategoryId === "profit" ? "active" : ""}`}
                        style={{ height: `${profitPercentage}%` }}
                        onClick={() => setSelectedCategoryId("profit")}
                        title={`Biodlarens netto: ${Math.round(profitOre / 100)} kr (${Math.round(profitPercentage)}%)`}
                      >
                        <div className="jar-layer-content">
                          <span className="jar-layer-name">Biodlarens netto</span>
                          <span className="jar-layer-amount">{Math.round(profitOre / 100)} kr</span>
                        </div>
                      </div>
                    )}

                    {/* Cost Layers */}
                    {breakdown.categories.map((cat) => {
                      const heightPercent =
                        jarFillCapacityOre > 0
                          ? (cat.costPerJarOre / jarFillCapacityOre) * 100
                          : 0;
                      const isSelected = selectedCategoryId === cat.id;

                      return (
                        <div
                          key={cat.id}
                          className={`jar-layer ${isSelected ? "active" : ""}`}
                          style={{
                            height: `${Math.max(heightPercent, 2.5)}%`,
                            backgroundColor: cat.color,
                          }}
                          onClick={() => setSelectedCategoryId(cat.id)}
                          title={`${cat.name}: ${Math.round(cat.costPerJarOre / 100)} kr (${Math.round(cat.percentage)}%)`}
                        >
                          <div className="jar-layer-content">
                            <span className="jar-layer-name">{cat.name}</span>
                            <span className="jar-layer-amount">
                              {Math.round(cat.costPerJarOre / 100)} kr
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Jar Glass Base */}
                <div className="jar-bottom-rim" />
              </div>

              {/* Jar Footnote Hint */}
              <div style={{ textAlign: "center", marginTop: "8px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  Klicka på ett skikt i burken eller i listan för att inspektera
                </span>
              </div>
            </div>

            {/* RIGHT / BOTTOM: Category Breakdown Details */}
            <div className="honey-jar-categories-container">
              {/* Active selection inspector card if tapped */}
              {selectedCategoryId === "profit" ? (
                <div className="box-success honey-jar-detail-card">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <TrendingUp size={18} color="var(--color-success-base)" />
                    <strong style={{ fontSize: "0.95rem" }}>Biodlarens netto & arbete</strong>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--color-text-primary)", margin: "4px 0" }}>
                    Återstoden efter att alla fasta och rörliga utlägg är betalda. Detta ska täcka
                    biodlarens hundratals arbetstimmar i bigården, slungrummet och marknaden.
                  </p>
                  <div style={{ display: "flex", gap: "12px", marginTop: "6px", fontSize: "0.8rem" }}>
                    <span>
                      Andel: <strong>{Math.round(profitPercentage)}%</strong>
                    </span>
                    <span>
                      Belopp: <strong>{Math.round(profitOre / 100)} kr/burk</strong>
                    </span>
                  </div>
                </div>
              ) : selectedCategory ? (
                <div
                  className="honey-jar-detail-card"
                  style={{
                    backgroundColor: "var(--color-surface-inset)",
                    borderColor: selectedCategory.color,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: selectedCategory.color,
                        }}
                      />
                      <strong style={{ fontSize: "0.95rem" }}>{selectedCategory.name}</strong>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                      onClick={() => setSelectedCategoryId(null)}
                    >
                      Visa alla
                    </button>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", margin: "6px 0" }}>
                    {selectedCategory.description}
                  </p>
                  <div className="honey-jar-detail-metrics">
                    <div className="box-card" style={{ padding: "6px 10px", borderRadius: "6px" }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                        Per burk
                      </div>
                      <strong style={{ fontSize: "0.9rem" }}>
                        {formatOreToSEK(selectedCategory.costPerJarOre)}
                      </strong>
                    </div>
                    <div className="box-card" style={{ padding: "6px 10px", borderRadius: "6px" }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                        Andel av pris
                      </div>
                      <strong style={{ fontSize: "0.9rem" }}>
                        {Math.round(selectedCategory.percentage)}%
                      </strong>
                    </div>
                    <div className="box-card" style={{ padding: "6px 10px", borderRadius: "6px" }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                        Totala utlägg
                      </div>
                      <strong style={{ fontSize: "0.9rem" }}>
                        {formatOreToSEK(selectedCategory.totalExpenseOre)}
                      </strong>
                    </div>
                  </div>

                  {selectedCategory.sampleItems.length > 0 && (
                    <div style={{ marginTop: "6px", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      <strong>Exempel: </strong>
                      {selectedCategory.sampleItems.join(", ")}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Category Breakdown Rows */}
              <div className="honey-jar-cat-list">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 0",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-text-secondary)" }}>
                    KOSTNADSPOSTER (SPECIFIKA ANDELAR)
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                    Baserat på {breakdown.totalHarvestedJarsEstimate} burkar
                  </span>
                </div>

                {/* Net Profit Row */}
                {profitOre > 0 && (
                  <div
                    className={`honey-jar-cat-row ${selectedCategoryId === "profit" ? "selected" : ""}`}
                    onClick={() => setSelectedCategoryId("profit")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "6px",
                          backgroundColor: "var(--color-success-surface)",
                          color: "var(--color-success-base)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <TrendingUp size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                          Biodlarens netto & vinst
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                          Arvode och ersättning för skötsel
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--color-success-base)" }}>
                        +{Math.round(profitOre / 100)} kr
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                        {Math.round(profitPercentage)}%
                      </div>
                    </div>
                  </div>
                )}

                {/* All Expense Categories */}
                {breakdown.categories.map((cat) => {
                  const Icon = ICON_MAP[cat.iconName] || HelpCircle;
                  const isSelected = selectedCategoryId === cat.id;

                  return (
                    <div
                      key={cat.id}
                      className={`honey-jar-cat-row ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedCategoryId(cat.id)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "6px",
                            backgroundColor: `${cat.color}20`,
                            color: cat.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{cat.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                            {cat.itemCount > 0 ? `${cat.itemCount} poster bokförda` : "Uppskattad andel"}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                          {Math.round(cat.costPerJarOre / 100)} kr
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                          {Math.round(cat.percentage)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Informational Callout for customers */}
              <div
                className="box-inset"
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  marginTop: "12px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <Info size={16} color="var(--color-primary-base)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                  <strong>Pedagogiskt tips till kunden:</strong> Visa hur biodling bär sina egna
                  kostnader. Att köpa lokal honung stödjer pollineringen i närområdet och täcker
                  direkta investeringar i bihälsa, virke och svenskt hantverk.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-actions" style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid var(--color-border-subtle)" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
};
