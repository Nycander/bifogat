import React from "react";
import { Transaction } from "../../domain/types";
import { CostCategoryDetail, BEEKEEPING_CATEGORIES } from "../../domain/honeyCostBreakdown";
import { formatOreToSEK } from "../../domain/validation";
import { useBottomSheet } from "../../hooks/useBottomSheet";
import { BottomSheetDragHandle } from "../../components/ui/BottomSheetDragHandle";
import { X, ArrowLeft, Receipt } from "lucide-react";

interface CategoryDrilldownModalProps {
  category: CostCategoryDetail;
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

export const CategoryDrilldownModal: React.FC<CategoryDrilldownModalProps> = ({
  category,
  transactions,
  onClose,
  onSaveTransaction,
}) => {
  const { contentRef, backdropRef, bottomSheetHandlers } = useBottomSheet({ onClose });

  return (
    <div
      ref={backdropRef}
      className="modal-backdrop modal-backdrop-stacked"
      onClick={onClose}
    >
      <div
        ref={contentRef}
        className="modal-content"
        style={{ maxWidth: "580px" }}
        onClick={(e) => e.stopPropagation()}
        {...bottomSheetHandlers}
      >
        <BottomSheetDragHandle />

        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <button
              type="button"
              className="btn-icon-subtle"
              onClick={onClose}
              title="Tillbaka till honungsburken"
              aria-label="Tillbaka"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4px" }}
            >
              <ArrowLeft size={18} />
            </button>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: category.color,
                border: "1px solid rgba(0,0,0,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                flexShrink: 0,
              }}
            >
              <Receipt size={14} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: "1.05rem", margin: 0, lineHeight: 1.2 }}>
                {category.name}
              </h2>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                {category.honeyShadeName} • {formatOreToSEK(category.totalExpenseOre)} totalt ({Math.round(category.percentage)}%)
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Stäng">
            <X size={20} />
          </button>
        </div>

        {/* Body content */}
        <div className="modal-scroll-body" style={{ paddingRight: "4px" }}>
          {/* Category Metrics Banner */}
          <div
            className="honey-jar-detail-metrics"
            style={{ marginBottom: "1rem" }}
          >
            <div className="box-card" style={{ padding: "8px 12px", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                Andel av burkpriset
              </div>
              <strong style={{ fontSize: "0.95rem" }}>
                {Math.round(category.costPerJarOre / 100)} kr ({Math.round(category.percentage)}%)
              </strong>
            </div>
            <div className="box-card" style={{ padding: "8px 12px", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                Bokförda utlägg
              </div>
              <strong style={{ fontSize: "0.95rem" }}>
                {category.totalExpenseOre > 0 ? formatOreToSEK(category.totalExpenseOre) : "Schablon"}
              </strong>
            </div>
            <div className="box-card" style={{ padding: "8px 12px", borderRadius: "8px" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                Antal poster
              </div>
              <strong style={{ fontSize: "0.95rem" }}>
                {transactions.length > 0 ? `${transactions.length} st` : "Branschsnitt"}
              </strong>
            </div>
          </div>

          <p style={{ fontSize: "0.825rem", color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
            {category.description}
          </p>

          {/* Transactions List */}
          <div style={{ marginBottom: "1rem" }}>
            <div
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "var(--color-text-secondary)",
                marginBottom: "0.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>TRANSAKTIONER I {category.name.toUpperCase()} ({transactions.length})</span>
              <span style={{ fontSize: "0.725rem", fontWeight: 400, color: "var(--color-text-muted)" }}>
                Ändra kategori för att omfördela
              </span>
            </div>

            {transactions.length === 0 ? (
              <div
                className="box-inset"
                style={{
                  padding: "1.25rem",
                  textAlign: "center",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  color: "var(--color-text-muted)",
                }}
              >
                Inga enskilda transaktioner har bokförts under denna kategori ännu. Du kan kategorisera om transaktioner från "Övrigt" eller andra kategorier så hamnar de här automatiskt.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      backgroundColor: "var(--color-surface)",
                      border: "1px solid var(--color-border-subtle)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          color: "var(--color-text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {tx.description}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--color-text-muted)",
                          display: "flex",
                          gap: "8px",
                          marginTop: "2px",
                        }}
                      >
                        <span>{tx.date}</span>
                        {tx.counterparty && <span>• {tx.counterparty}</span>}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-danger)" }}>
                        {formatOreToSEK(Math.abs(tx.amountOre))}
                      </span>
                      {onSaveTransaction && (
                        <select
                          className="form-select"
                          style={{
                            fontSize: "0.75rem",
                            padding: "3px 6px",
                            height: "28px",
                            borderRadius: "6px",
                            borderColor: "var(--color-border-strong)",
                          }}
                          value={tx.category || category.name}
                          onChange={(e) => {
                            const newCat = e.target.value;
                            onSaveTransaction({
                              id: tx.id,
                              date: tx.date,
                              description: tx.description,
                              amountOre: tx.amountOre,
                              counterparty: tx.counterparty,
                              category: newCat,
                            });
                          }}
                          title="Flytta till en annan kategori"
                        >
                          {BEEKEEPING_CATEGORIES.map((catName) => (
                            <option key={catName} value={catName}>
                              {catName}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div
          className="modal-actions"
          style={{
            marginTop: "0.75rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid var(--color-border-subtle)",
          }}
        >
          <button className="btn btn-secondary" onClick={onClose}>
            <ArrowLeft size={16} />
            <span>Tillbaka till honungsburken</span>
          </button>
        </div>
      </div>
    </div>
  );
};
