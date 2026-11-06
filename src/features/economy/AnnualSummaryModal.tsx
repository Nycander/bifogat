import React from "react";
import { Transaction } from "../../domain/types";
import { formatOreToSEK } from "../../domain/validation";
import { useBottomSheet } from "../../hooks/useBottomSheet";
import { BottomSheetDragHandle } from "../../components/ui/BottomSheetDragHandle";
import { X, Calendar, TrendingUp, TrendingDown, ArrowLeft, BarChart2 } from "lucide-react";

export interface AnnualSummaryModalProps {
  transactions: Transaction[];
  onClose: () => void;
}

export const AnnualSummaryModal: React.FC<AnnualSummaryModalProps> = ({
  transactions,
  onClose,
}) => {
  const { contentRef, backdropRef, bottomSheetHandlers } = useBottomSheet({ onClose });

  // Calculate annual summary statistics
  const summaryByYear: Record<
    string,
    { incomeOre: number; expenseOre: number; netOre: number; count: number }
  > = {};

  for (const t of transactions) {
    const yr = t.date && t.date.length >= 4 ? t.date.substring(0, 4) : "Okänt år";
    if (!summaryByYear[yr]) {
      summaryByYear[yr] = { incomeOre: 0, expenseOre: 0, netOre: 0, count: 0 };
    }
    summaryByYear[yr].count += 1;
    const amount = t.amountOre || 0;
    if (amount > 0) {
      summaryByYear[yr].incomeOre += amount;
    } else {
      summaryByYear[yr].expenseOre += Math.abs(amount);
    }
    summaryByYear[yr].netOre += amount;
  }

  const years = Object.keys(summaryByYear).sort((a, b) => b.localeCompare(a));

  // Multi-year summary metrics
  const totalNetOre = years.reduce((sum, yr) => sum + summaryByYear[yr].netOre, 0);
  const bestYear = years.reduce(
    (best, yr) =>
      !best || summaryByYear[yr].incomeOre > summaryByYear[best].incomeOre ? yr : best,
    ""
  );

  return (
    <div ref={backdropRef} className="modal-backdrop" onClick={onClose}>
      <div
        ref={contentRef}
        className="modal-content zero-scroll-modal"
        style={{ maxWidth: "580px", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
        {...bottomSheetHandlers}
      >
        <BottomSheetDragHandle />

        {/* Modal Header */}
        <div className="modal-header wizard-header" style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div className="wizard-icon-badge" style={{ backgroundColor: "var(--color-honey-surface)", color: "var(--color-honey-text)", border: "1px solid var(--color-honey-border)" }}>
              <BarChart2 size={18} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: "1.1rem", margin: 0 }}>
                Årsöversikt
              </h2>
              <span className="wizard-subtitle">
                {years.length > 0 ? `${years[years.length - 1]}–${years[0]}` : "Inga transaktioner"}
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Stäng">
            <X size={20} />
          </button>
        </div>

        {/* Body content */}
        <div className="modal-scroll-body" style={{ padding: "4px 0 12px 0" }}>
          {years.length === 0 ? (
            <div
              className="box-inset"
              style={{
                padding: "1.5rem",
                textAlign: "center",
                borderRadius: "12px",
                color: "var(--color-text-muted)",
                fontSize: "0.875rem",
              }}
            >
              Inga transaktioner finns bokförda ännu för att visa årsstatistik.
            </div>
          ) : (
            <>
              {/* Overall Multi-Year Summary Banner */}
              <div
                className="honey-jar-detail-metrics"
                style={{ marginBottom: "1rem" }}
              >
                <div className="box-card" style={{ padding: "8px 12px", borderRadius: "10px" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", fontWeight: 600 }}>
                    Totalt netto
                  </div>
                  <strong style={{ fontSize: "1rem", color: totalNetOre >= 0 ? "var(--color-success-base)" : "var(--color-danger-base)" }}>
                    {formatOreToSEK(totalNetOre)}
                  </strong>
                </div>

                {bestYear && (
                  <div className="box-card" style={{ padding: "8px 12px", borderRadius: "10px" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", fontWeight: 600 }}>
                      Bästa intäktsår
                    </div>
                    <strong style={{ fontSize: "1rem", color: "var(--color-text-primary)" }}>
                      {bestYear}
                    </strong>
                  </div>
                )}

                <div className="box-card" style={{ padding: "8px 12px", borderRadius: "10px" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", fontWeight: 600 }}>
                    Snitt netto/år
                  </div>
                  <strong style={{ fontSize: "1rem", color: "var(--color-text-primary)" }}>
                    {formatOreToSEK(Math.round(totalNetOre / years.length))}
                  </strong>
                </div>
              </div>

              {/* Year Cards Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                {years.map((yr) => {
                  const data = summaryByYear[yr];
                  const isPositiveNet = data.netOre >= 0;

                  return (
                    <div
                      key={yr}
                      className="card"
                      style={{
                        padding: "12px",
                        marginBottom: 0,
                        borderRadius: "12px",
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-border-default)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "6px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <Calendar size={14} color="var(--color-primary-base)" />
                          <strong style={{ fontSize: "0.95rem", color: "var(--color-text-main)" }}>
                            {yr}
                          </strong>
                        </div>
                        <span style={{ fontSize: "0.725rem", color: "var(--color-text-muted)" }}>
                          {data.count} st
                        </span>
                      </div>

                      <div style={{ fontSize: "0.8rem", color: "var(--color-success-base)", marginBottom: "2px", display: "flex", alignItems: "center", gap: "3px" }}>
                        <TrendingUp size={12} />
                        <span>In: +{formatOreToSEK(data.incomeOre)}</span>
                      </div>

                      <div style={{ fontSize: "0.8rem", color: "var(--color-danger-base)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "3px" }}>
                        <TrendingDown size={12} />
                        <span>Ut: -{formatOreToSEK(data.expenseOre)}</span>
                      </div>

                      <div
                        style={{
                          fontSize: "0.925rem",
                          fontWeight: 800,
                          color: isPositiveNet ? "var(--color-success-base)" : "var(--color-danger-base)",
                          borderTop: "1px solid var(--color-border-subtle)",
                          paddingTop: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600 }}>
                          Netto:
                        </span>
                        <span>{formatOreToSEK(data.netOre)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div
          className="wizard-actions"
          style={{ marginTop: "auto", paddingTop: "8px", borderTop: "1px solid var(--color-border-default)" }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ width: "100%" }}>
            <ArrowLeft size={16} />
            <span>Tillbaka till ekonomin</span>
          </button>
        </div>
      </div>
    </div>
  );
};
