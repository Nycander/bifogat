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
  Droplet,
} from "lucide-react";

interface EconomyViewProps {
  transactions: Transaction[];
  importedHistoricalBalanceOre?: number;
  onOpenCreateTransaction: () => void;
  onOpenHoneySale: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => Promise<void>;
}

export const EconomyView: React.FC<EconomyViewProps> = ({
  transactions,
  importedHistoricalBalanceOre,
  onOpenCreateTransaction,
  onOpenHoneySale,
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <div>
          <h1>Ekonomi & kassa</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
            Försäljning av honung, materialinköp och löpande saldo
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={onOpenHoneySale}
            style={{
              background: "#d97706",
              borderColor: "#b45309",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontWeight: 700,
            }}
          >
            <Droplet size={16} />
            <span>Sälj honung</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onOpenCreateTransaction}>
            <Plus size={16} />
            <span>Ny transaktion</span>
          </button>
        </div>
      </div>

      {/* Main Balance Banner */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
          borderColor: "#fde68a",
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
                color: "var(--color-accent-dark)",
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
                color: totalBalanceOre >= 0 ? "#15803d" : "#b91c1c",
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
                background: "#fff",
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
                  style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-accent-dark)" }}
                >
                  {yr}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#15803d", marginTop: "0.3rem" }}>
                  In: +{formatOreToSEK(data.incomeOre)}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#b91c1c" }}>
                  Ut: -{formatOreToSEK(data.expenseOre)}
                </div>
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    color: data.netOre >= 0 ? "#15803d" : "#b91c1c",
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

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="card empty-state">
          <Wallet size={40} className="empty-state-icon" />
          <h3 className="empty-state-title">Inga ekonomiska poster registrerade</h3>
          <p className="empty-state-desc">
            Bokför intäkter från honung eller utlägg för vax, burkar och utrustning.
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
