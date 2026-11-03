import React from "react";
import { CustomerAnalytics } from "../../domain/customerAnalytics";
import { formatOreToSEK } from "../../domain/validation";
import { useBottomSheet } from "../../hooks/useBottomSheet";
import { BottomSheetDragHandle } from "../../components/ui/BottomSheetDragHandle";
import { ArrowLeft, X, Calendar, Receipt } from "lucide-react";

interface CustomerDrilldownSubModalProps {
  customer: CustomerAnalytics;
  onClose: () => void;
}

export const CustomerDrilldownSubModal: React.FC<CustomerDrilldownSubModalProps> = ({
  customer,
  onClose,
}) => {
  const { contentRef, backdropRef, bottomSheetHandlers } = useBottomSheet({ onClose });

  const getStatusBadgeStyle = (status: CustomerAnalytics["status"]) => {
    switch (status) {
      case "regular":
        return {
          bg: "rgba(34, 197, 94, 0.12)",
          border: "rgba(34, 197, 94, 0.3)",
          text: "var(--color-success, #15803d)",
        };
      case "lapsed":
        return {
          bg: "rgba(234, 179, 8, 0.12)",
          border: "rgba(234, 179, 8, 0.3)",
          text: "#b45309",
        };
      case "new":
        return {
          bg: "rgba(59, 130, 246, 0.12)",
          border: "rgba(59, 130, 246, 0.3)",
          text: "#1d4ed8",
        };
      default:
        return {
          bg: "var(--color-surface-hover)",
          border: "var(--color-border)",
          text: "var(--color-text-muted)",
        };
    }
  };

  const badge = getStatusBadgeStyle(customer.status);

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
        <div className="modal-header" style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <button
              type="button"
              className="btn-icon-subtle"
              onClick={onClose}
              title="Tillbaka till kundöversikt"
              aria-label="Tillbaka"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4px" }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 className="modal-title" style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>
                  {customer.name}
                </h2>
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "10px",
                    background: badge.bg,
                    border: `1px solid ${badge.border}`,
                    color: badge.text,
                  }}
                >
                  {customer.statusLabel}
                </span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                Aktiv {customer.activeYears.join(", ")} ({customer.activeYearCount} säsonger)
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Stäng">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ overflowY: "auto", paddingRight: "4px" }}>
          {/* Estimated annual demand banner */}
          <div
            style={{
              background: "var(--color-honey-surface)",
              border: "1px solid var(--color-honey-border)",
              padding: "12px 16px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "14px",
            }}
          >
            <div>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-honey-text)", textTransform: "uppercase" }}>
                ESTIMERAT ÅRSBEHOV
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--color-honey-text)" }}>
                {customer.estimatedAnnualJars} burkar / år
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
              <div>Totalt {customer.totalJars} burkar</div>
              <div style={{ fontWeight: 700, color: "var(--color-text-main)" }}>{formatOreToSEK(customer.totalSpentOre)}</div>
            </div>
          </div>

          {/* Calculation Summary Box */}
          <div
            style={{
              background: "var(--color-surface-hover)",
              padding: "10px 12px",
              borderRadius: "8px",
              fontSize: "0.8rem",
              color: "var(--color-text-main)",
              marginBottom: "14px",
              lineHeight: "1.45",
            }}
          >
            <strong>Exakt beräkning:</strong> {customer.name} har köpt totalt <strong>{customer.totalJars} burkar</strong> ({formatOreToSEK(customer.totalSpentOre)}) fördelat på <strong>{customer.orderCount} köptillfällen</strong> över <strong>{customer.activeYearCount} aktiva år</strong>.
            <br />
            Snitt per säsong: {customer.totalJars} burkar / {customer.activeYearCount} år = <strong>{customer.estimatedAnnualJars} burkar/år</strong>. Snitt per order: <strong>{customer.averageJarsPerOrder} burkar</strong>.
          </div>

          {/* Year-by-year breakdown table */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Calendar size={15} color="var(--color-honey-text)" />
              <span>Historik år för år</span>
            </div>
            <div style={{ border: "1px solid var(--color-border)", borderRadius: "8px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ background: "var(--color-surface-hover)", borderBottom: "1px solid var(--color-border)" }}>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>År</th>
                    <th style={{ padding: "6px 10px", textAlign: "right" }}>Burkar</th>
                    <th style={{ padding: "6px 10px", textAlign: "right" }}>Köptillfällen</th>
                    <th style={{ padding: "6px 10px", textAlign: "right" }}>Summa (SEK)</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.yearlyBreakdown.map((row) => (
                    <tr key={row.year} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "6px 10px", fontWeight: 600 }}>{row.year}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, color: "var(--color-honey-text)" }}>
                        {row.jars} st
                      </td>
                      <td style={{ padding: "6px 10px", textAlign: "right", color: "var(--color-text-muted)" }}>
                        {row.orderCount} st
                      </td>
                      <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600 }}>
                        {formatOreToSEK(row.spentOre)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transaction list for customer */}
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Receipt size={15} color="var(--color-honey-text)" />
              <span>Alla transaktioner ({customer.transactions.length})</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "240px", overflowY: "auto" }}>
              {customer.transactions.map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    padding: "8px 10px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "0.8rem",
                    background: "var(--color-surface)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{tx.date}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{tx.description}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: "var(--color-success)" }}>
                    +{formatOreToSEK(tx.amountOre)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ borderTop: "1px solid var(--color-border)", paddingTop: "10px", marginTop: "12px" }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ width: "100%" }}>
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
};
