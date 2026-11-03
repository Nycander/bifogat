import React, { useState, useMemo } from "react";
import { Transaction } from "../../domain/types";
import { calculateHoneyCostBreakdown } from "../../domain/honeyCostBreakdown";
import { formatOreToSEK } from "../../domain/validation";
import { useBottomSheet } from "../../hooks/useBottomSheet";
import { BottomSheetDragHandle } from "../../components/ui/BottomSheetDragHandle";
import { CategoryDrilldownModal } from "./CategoryDrilldownModal";
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
  Receipt,
  ExternalLink,
} from "lucide-react";

import { classifyExpense } from "../../domain/honeyCostBreakdown";

interface HoneyJarCostModalProps {
  transactions: Transaction[];
  onClose: () => void;
  onSaveTransaction?: (txData: {
    id?: string;
    date: string;
    description: string;
    amountOre: number;
    counterparty?: string;
    category?: string;
  }) => Promise<void>;
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
  onClose,
  onSaveTransaction,
}) => {
  // Read remembered price from localStorage or 95 kr default
  const savedPrice =
    typeof window !== "undefined"
      ? localStorage.getItem("bifogat_honey_price_per_jar")
      : null;
  const initialPriceOre = savedPrice ? (parseInt(savedPrice, 10) || 95) * 100 : 9500;

  const [priceOre, setPriceOre] = useState<number>(initialPriceOre);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);

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
    return calculateHoneyCostBreakdown(transactions, priceOre);
  }, [transactions, priceOre]);

  const { contentRef, backdropRef, bottomSheetHandlers } = useBottomSheet({ onClose });

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return breakdown.categories.find((c) => c.id === selectedCategoryId) || null;
  }, [breakdown.categories, selectedCategoryId]);

  const categoryTransactions = useMemo(() => {
    if (!selectedCategoryId) return [];
    return transactions.filter(
      (tx) => (tx.amountOre || 0) < 0 && classifyExpense(tx) === selectedCategoryId,
    );
  }, [transactions, selectedCategoryId]);

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
                Pedagogisk fördelning av bigårdens alla kostnader & investeringar
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Stäng">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Container with Two-Column Desktop / Stacked Mobile Layout */}
        <div className="modal-scroll-body honey-jar-modal-body">
          {/* Top Quick Bar: Jar Price & Total Expenses KPI */}
          <div className="honey-jar-kpi-banner">
            <div className="honey-jar-kpi-item">
              <span className="honey-jar-kpi-label">Burkpris för kunden</span>
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
              <span className="honey-jar-kpi-label">Bigårdens alla utlägg</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                <span className="honey-jar-kpi-value">
                  {breakdown.totalExpenseOre > 0
                    ? formatOreToSEK(breakdown.totalExpenseOre)
                    : "100% utgifter"}
                </span>
              </div>
            </div>

            <div className="honey-jar-kpi-divider" />

            <div className="honey-jar-kpi-item">
              <span className="honey-jar-kpi-label">Kategorier</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                <span className="honey-jar-kpi-value">
                  {breakdown.categories.length}
                </span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-text-secondary)" }}>
                  st
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Visual Jar & Breakdown List */}
          <div className="honey-jar-grid">
            {/* LEFT / TOP: The Visual Realistic Honey Jar Filled 100% by Cost Categories */}
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

                  {/* Honey / Cost Layers filling 100% of the jar */}
                  <div className="jar-liquid-column">
                    {breakdown.categories.map((cat) => {
                      const isSelected = selectedCategoryId === cat.id;

                      return (
                        <div
                          key={cat.id}
                          className={`jar-layer ${isSelected ? "active" : ""}`}
                          style={{
                            height: `${Math.max(cat.percentage, 3.5)}%`,
                            backgroundColor: cat.color,
                          }}
                          onClick={() => setSelectedCategoryId(cat.id)}
                          title={`${cat.name}: ${cat.percentage}% (${Math.round(cat.costPerJarOre / 100)} kr/burk)`}
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
              {selectedCategory ? (
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
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          backgroundColor: selectedCategory.color,
                          border: "1px solid rgba(0,0,0,0.1)",
                        }}
                      />
                      <strong style={{ fontSize: "0.95rem" }}>{selectedCategory.name}</strong>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor: `${selectedCategory.color}25`,
                          color: selectedCategory.color,
                        }}
                      >
                        {selectedCategory.honeyShadeName}
                      </span>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                        onClick={() => setSelectedCategoryId(null)}
                      >
                        Visa alla
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", margin: "6px 0" }}>
                    {selectedCategory.description}
                  </p>
                  <div className="honey-jar-detail-metrics">
                    <div className="box-card" style={{ padding: "6px 10px", borderRadius: "6px" }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                        Andel av burkpriset
                      </div>
                      <strong style={{ fontSize: "0.9rem" }}>
                        {Math.round(selectedCategory.costPerJarOre / 100)} kr ({Math.round(selectedCategory.percentage)}%)
                      </strong>
                    </div>
                    <div className="box-card" style={{ padding: "6px 10px", borderRadius: "6px" }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                        Bokförda utlägg
                      </div>
                      <strong style={{ fontSize: "0.9rem" }}>
                        {selectedCategory.totalExpenseOre > 0
                          ? formatOreToSEK(selectedCategory.totalExpenseOre)
                          : "Schablon"}
                      </strong>
                    </div>
                    <div className="box-card" style={{ padding: "6px 10px", borderRadius: "6px" }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                        Antal poster
                      </div>
                      <strong style={{ fontSize: "0.9rem" }}>
                        {selectedCategory.itemCount > 0 ? `${selectedCategory.itemCount} st` : "Branschsnitt"}
                      </strong>
                    </div>
                  </div>

                  {/* Clean Trigger Button for Stacked Modal Drilldown */}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: "10px", width: "100%", justifyContent: "center" }}
                    onClick={() => setIsDrilldownOpen(true)}
                  >
                    <ExternalLink size={14} />
                    <span>Granska & omfördela transaktioner ({categoryTransactions.length} st)</span>
                  </button>
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
                    KOSTNADSANDELAR ({breakdown.categories.length} KATEGORIER)
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                    Totalt 100% av burken
                  </span>
                </div>

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
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{cat.name}</span>
                            <span style={{ fontSize: "0.7rem", color: cat.color, fontWeight: 500 }}>
                              • {cat.honeyShadeName}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                            {cat.itemCount > 0
                              ? `${formatOreToSEK(cat.totalExpenseOre)} (${cat.itemCount} poster)`
                              : "Branschsnitt"}
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
                <Receipt size={16} color="var(--color-primary-base)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                  <strong>Pedagogiskt för kunden:</strong> All inkomst från honungsburken går
                  direkt tillbaka till bigårdens kostnader och återinvesteringar – kupor, ramar,
                  vax, vinterfoder och bihälsa. Ingen nettovinst plockas ut; varje krona bär
                  biodlingen och den lokala pollineringen.
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

      {/* Stacked Sub-Modal for Category Drilldown */}
      {selectedCategory && isDrilldownOpen && (
        <CategoryDrilldownModal
          category={selectedCategory}
          transactions={categoryTransactions}
          onClose={() => setIsDrilldownOpen(false)}
          onSaveTransaction={onSaveTransaction}
        />
      )}
    </div>
  );
};
