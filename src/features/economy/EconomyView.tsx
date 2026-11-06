import React from "react";
import { Transaction } from "../../domain/types";
import { formatOreToSEK } from "../../domain/validation";
import {
  Plus,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  Edit2,
  ScanText,
  Droplet,
  Users,
  BarChart2,
} from "lucide-react";

interface EconomyViewProps {
  transactions: Transaction[];
  importedHistoricalBalanceOre?: number;
  onOpenCreateTransaction: () => void;
  onOpenHoneySale: () => void;
  onOpenSwishInbox?: () => void;
  onOpenHoneyJarCost?: () => void;
  onOpenCustomerDemand?: () => void;
  onOpenAnnualSummary?: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => Promise<void>;
}

export const EconomyView: React.FC<EconomyViewProps> = ({
  transactions,
  onOpenCreateTransaction,
  onOpenSwishInbox,
  onOpenHoneyJarCost,
  onOpenCustomerDemand,
  onOpenAnnualSummary,
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
          <h1>Ekonomi</h1>
          <p className="view-header-subtitle">
            Intäkter, utgifter och saldo
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

      {/* Analytics & Tools Hub Ribbon */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.5rem",
          marginBottom: "0.85rem",
        }}
      >
        {years.length > 0 && (
          <div
            style={{
              cursor: "pointer",
              padding: "0.65rem 0.4rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border-default)",
              borderRadius: "var(--radius-lg)",
              transition: "all 0.15s ease",
            }}
            onClick={onOpenAnnualSummary}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenAnnualSummary?.();
              }
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "var(--color-primary-surface)",
                border: "1px solid var(--color-primary-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-primary-base)",
                marginBottom: "0.25rem",
              }}
            >
              <BarChart2 size={16} />
            </div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1.2 }}>
              Årsöversikt
            </div>
            <div style={{ fontSize: "0.675rem", color: "var(--color-text-muted)", marginTop: "2px", whiteSpace: "nowrap" }}>
              {years[0]}: {formatOreToSEK(summaryByYear[years[0]].netOre)}
            </div>
          </div>
        )}

        {onOpenCustomerDemand && (
          <div
            style={{
              cursor: "pointer",
              padding: "0.65rem 0.4rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border-default)",
              borderRadius: "var(--radius-lg)",
              transition: "all 0.15s ease",
            }}
            onClick={onOpenCustomerDemand}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenCustomerDemand();
              }
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "var(--color-primary-surface)",
                border: "1px solid var(--color-primary-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-primary-base)",
                marginBottom: "0.25rem",
              }}
            >
              <Users size={16} />
            </div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1.2 }}>
              Stamkunder
            </div>
            <div style={{ fontSize: "0.675rem", color: "var(--color-text-muted)", marginTop: "2px", whiteSpace: "nowrap" }}>
              Analys & behov
            </div>
          </div>
        )}

        {onOpenHoneyJarCost && (
          <div
            style={{
              cursor: "pointer",
              padding: "0.65rem 0.4rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border-default)",
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
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "var(--color-primary-surface)",
                border: "1px solid var(--color-primary-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-primary-base)",
                marginBottom: "0.25rem",
              }}
            >
              <Droplet size={16} />
            </div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1.2 }}>
              Burkkostnad
            </div>
            <div style={{ fontSize: "0.675rem", color: "var(--color-text-muted)", marginTop: "2px", whiteSpace: "nowrap" }}>
              Kalkylator
            </div>
          </div>
        )}
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
              TOTALSALDO
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
        </div>
      </div>

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="card empty-state">
          <Wallet size={40} className="empty-state-icon" />
          <h3 className="empty-state-title">Inga transaktioner</h3>
          <p className="empty-state-desc">
            Bokför intäkter eller utlägg för din bigård.
          </p>
          <button className="btn btn-primary" onClick={onOpenCreateTransaction}>
            <Plus size={16} />
            <span>Ny transaktion</span>
          </button>
        </div>
      ) : (
        <div className="item-list">
          {transactions.map((tx) => {
            const isIncome = tx.amountOre > 0;
            const runningBal = runningBalanceMap.get(tx.id);

            return (
              <div
                key={tx.id}
                className="list-item"
                style={{
                  padding: "0.45rem 0.65rem",
                  gap: "0.55rem",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
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
                  {isIncome ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                </div>

                <div className="list-item-main" style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 700,
                        color: "var(--color-text-main)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {tx.description}
                      {tx.counterparty && (
                        <span style={{ fontWeight: 400, color: "var(--color-text-muted)", marginLeft: "0.35rem" }}>
                          · {tx.counterparty}
                        </span>
                      )}
                    </span>

                    <span
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 800,
                        color: isIncome ? "var(--color-success)" : "var(--color-danger)",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {isIncome ? "+" : ""}
                      {formatOreToSEK(tx.amountOre)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "0.75rem",
                      color: "var(--color-text-muted)",
                      marginTop: "0.1rem",
                      gap: "0.4rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                      }}
                    >
                      <span>{tx.date}</span>
                      {tx.category && (
                        <span className="badge badge-inactive" style={{ fontSize: "0.65rem", padding: "1px 5px" }}>
                          {tx.category}
                        </span>
                      )}
                      {runningBal !== undefined && (
                        <span style={{ color: "var(--color-text-light)" }}>
                          · Saldo: {formatOreToSEK(runningBal)}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", flexShrink: 0 }}>
                      <button
                        className="btn btn-secondary btn-sm btn-icon-only"
                        onClick={() => onEditTransaction(tx)}
                        title="Redigera"
                        aria-label="Redigera transaktion"
                        style={{ padding: "0.15rem 0.35rem", height: "24px", width: "24px" }}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        className="btn btn-secondary btn-sm btn-icon-only"
                        onClick={() => {
                          if (window.confirm(`Vill du ta bort transaktionen "${tx.description}"?`)) {
                            onDeleteTransaction(tx.id);
                          }
                        }}
                        title="Ta bort"
                        aria-label="Ta bort transaktion"
                        style={{ padding: "0.15rem 0.35rem", height: "24px", width: "24px" }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
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
