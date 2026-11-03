import React from "react";
import { Transaction } from "../../domain/types";
import { formatOreToSEK } from "../../domain/validation";
import {
  Plus,
  Wallet,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  Edit2,
  AlertCircle,
  ScanText,
  Droplet,
  ChevronRight,
} from "lucide-react";

interface EconomyViewProps {
  transactions: Transaction[];
  importedHistoricalBalanceOre?: number;
  onOpenCreateTransaction: () => void;
  onOpenHoneySale: () => void;
  onOpenSwishInbox?: () => void;
  onOpenHoneyJarCost?: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => Promise<void>;
}

export const EconomyView: React.FC<EconomyViewProps> = ({
  transactions,
  importedHistoricalBalanceOre,
  onOpenCreateTransaction,
  onOpenSwishInbox,
  onOpenHoneyJarCost,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const totalBalanceOre = transactions.reduce((sum, t) => sum + (t.amountOre || 0), 0);

  // Group by year
  const summaryByYear: Record<
    string,
    { incomeOre: number; expenseOre: number; netOre: number; count: number }
  > = {};
  for (const t of transactions) {
    const yr = t.date.substring(0, 4) || "Okänt år";
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

  // Running balance calculation: oldest to newest, then displayed in current order
  const sortedOldestFirst = [...transactions].sort((a, b) => {
    const cmp = a.date.localeCompare(b.date);
    if (cmp !== 0) return cmp;
    return a.createdAt.localeCompare(b.createdAt);
  });

  const runningBalanceMap = new Map<string, number>();
  let currentRunning = 0;
  for (const t of sortedOldestFirst) {
    currentRunning += t.amountOre || 0;
    runningBalanceMap.set(t.id, currentRunning);
  }

  return (
    <div>
      {/* Header */}
      <div className="view-header">
        <div className="view-header-title">
          <h1>Ekonomi & kassa</h1>
          <p className="view-header-subtitle">
            Följ honungsförsäljning, materialinköp och ditt saldo
          </p>
        </div>
        <div className="view-header-actions">
          {onOpenSwishInbox && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onOpenSwishInbox}
            >
              <ScanText size={16} />
              <span>Swish-inkorg</span>
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={onOpenCreateTransaction}>
            <Plus size={16} />
            <span>Ny transaktion</span>
          </button>
        </div>
      </div>

      {/* Main Balance Banner */}
      <div
        className="card"
        style={{
          background: "var(--color-honey-gradient)",
          borderColor: "var(--color-honey-border)",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "var(--color-honey-text)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              BERÄKNAT TOTALSALDO
            </div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                color: totalBalanceOre >= 0 ? "var(--color-success-base)" : "var(--color-danger-base)",
              }}
            >
              {formatOreToSEK(totalBalanceOre)}
            </div>
          </div>
          {importedHistoricalBalanceOre !== undefined && (
            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--color-text-muted)",
                background: "var(--color-surface-bg)",
                padding: "0.5rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
              }}
            >
              <div>Historiskt kalkylarksaldo:</div>
              <strong style={{ color: "var(--color-text-main)" }}>
                {formatOreToSEK(importedHistoricalBalanceOre)}
              </strong>
              {importedHistoricalBalanceOre !== totalBalanceOre && (
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-warning)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.2rem",
                    marginTop: "0.2rem",
                  }}
                >
                  <AlertCircle size={12} />
                  Diff: {formatOreToSEK(totalBalanceOre - importedHistoricalBalanceOre)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Annual Summary */}
      {years.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "0.75rem",
            marginBottom: "1.25rem",
          }}
        >
          {years.map((yr) => {
            const data = summaryByYear[yr];
            return (
              <div key={yr} className="card" style={{ padding: "0.85rem", marginBottom: 0 }}>
                <div
                  style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-text-brand)" }}
                >
                  {yr}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--color-success-base)", marginTop: "0.3rem" }}>
                  In: +{formatOreToSEK(data.incomeOre)}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--color-danger-base)" }}>
                  Ut: -{formatOreToSEK(data.expenseOre)}
                </div>
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    color: data.netOre >= 0 ? "var(--color-success-base)" : "var(--color-danger-base)",
                    marginTop: "0.2rem",
                    borderTop: "1px solid var(--color-border)",
                    paddingTop: "0.2rem",
                  }}
                >
                  Netto: {formatOreToSEK(data.netOre)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pedagogical Cost Breakdown Entry Card */}
      {onOpenHoneyJarCost && (
        <div
          className="card"
          style={{
            cursor: "pointer",
            marginBottom: "1.25rem",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            background: "var(--color-surface)",
            border: "1px solid var(--color-honey-border)",
            borderRadius: "var(--radius-lg)",
            transition: "all 0.15s ease",
          }}
          onClick={onOpenHoneyJarCost}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpenHoneyJarCost();
            }
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "var(--color-honey-surface)",
                border: "1px solid var(--color-honey-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-honey-text)",
                flexShrink: 0,
              }}
            >
              <Droplet size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                Vad kostar en burk honung?
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                Pedagogisk kostnadsuppdelning och visualisering för kunden
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-honey-text)", flexShrink: 0 }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Öppna burken</span>
            <ChevronRight size={18} />
          </div>
        </div>
      )}

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="card empty-state">
          <Wallet size={40} className="empty-state-icon" />
          <h3 className="empty-state-title">Inga transaktioner registrerade ännu</h3>
          <p className="empty-state-desc">
            Bokför intäkter från honungsförsäljning eller utlägg för ramar, foder och utrustning.
          </p>
          <button className="btn btn-primary" onClick={onOpenCreateTransaction}>
            <Plus size={16} />
            <span>Lägg till första transaktionen</span>
          </button>
        </div>
      ) : (
        <div className="item-list">
          {transactions.map((tx) => {
            const isIncome = tx.amountOre > 0;
            const runningBal = runningBalanceMap.get(tx.id);

            return (
              <div key={tx.id} className="list-item">
                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isIncome
                        ? "var(--color-success-bg)"
                        : "var(--color-danger-bg)",
                      color: isIncome ? "var(--color-success)" : "var(--color-danger)",
                      flexShrink: 0,
                    }}
                  >
                    {isIncome ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                  </div>

                  <div className="list-item-main">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--color-text-muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                        }}
                      >
                        <Calendar size={12} />
                        {tx.date}
                      </span>
                      {tx.counterparty && (
                        <span
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: "var(--color-text-main)",
                          }}
                        >
                          • {tx.counterparty}
                        </span>
                      )}
                      {tx.category && (
                        <span className="badge badge-inactive" style={{ fontSize: "0.7rem" }}>
                          {tx.category}
                        </span>
                      )}
                    </div>

                    <div className="list-item-title" style={{ marginTop: "0.15rem" }}>
                      {tx.description}
                    </div>

                    {runningBal !== undefined && (
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-light)" }}>
                        Löpande saldo: {formatOreToSEK(runningBal)}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    textAlign: "right",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "0.25rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: 800,
                      color: isIncome ? "var(--color-success)" : "var(--color-danger)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isIncome ? "+" : ""}
                    {formatOreToSEK(tx.amountOre)}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <button
                      className="btn btn-secondary btn-sm btn-icon-only"
                      onClick={() => onEditTransaction(tx)}
                      title="Redigera transaktion"
                      aria-label="Redigera transaktion"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="btn btn-secondary btn-sm btn-icon-only"
                      onClick={() => {
                        if (window.confirm(`Vill du ta bort transaktionen "${tx.description}"?`)) {
                          onDeleteTransaction(tx.id);
                        }
                      }}
                      title="Ta bort transaktion"
                      aria-label="Ta bort transaktion"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
