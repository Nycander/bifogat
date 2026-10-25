import React, { useState, useMemo } from "react";
import { Transaction } from "../../domain/types";
import { formatDate, parseSwedishCurrencyToOre } from "../../domain/validation";
import { extractUniqueCustomers } from "../../domain/customers";
import { X, Check } from "lucide-react";

interface TransactionFormModalProps {
  transaction?: Transaction;
  transactions?: Transaction[];
  onClose: () => void;
  onSave: (data: {
    date: string;
    description: string;
    amountOre: number;
    counterparty?: string;
    category?: string;
  }) => Promise<void>;
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  transaction,
  transactions = [],
  onClose,
  onSave,
}) => {
  const [date, setDate] = useState(transaction?.date || formatDate(new Date()));
  const [description, setDescription] = useState(transaction?.description || "");
  // Form supports type: income (+) vs expense (-)
  const initialIsExpense = transaction ? transaction.amountOre < 0 : false;
  const [isExpense, setIsExpense] = useState(initialIsExpense);
  const initialAmountStr = transaction
    ? (Math.abs(transaction.amountOre) / 100).toFixed(2).replace(".", ",")
    : "";
  const [amountInput, setAmountInput] = useState(initialAmountStr);
  const [counterparty, setCounterparty] = useState(transaction?.counterparty || "");
  const [category, setCategory] = useState(transaction?.category || "Utrustning");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uniqueCounterparties = useMemo(() => extractUniqueCustomers(transactions), [transactions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Beskrivning måste anges");
      return;
    }

    const parsedOre = parseSwedishCurrencyToOre(amountInput);
    if (parsedOre === null || parsedOre === 0) {
      setError("Ange ett giltigt belopp (större än 0)");
      return;
    }

    const finalAmountOre = isExpense ? -Math.abs(parsedOre) : Math.abs(parsedOre);

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        date,
        description: description.trim(),
        amountOre: finalAmountOre,
        counterparty: counterparty.trim() || undefined,
        category: category || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Kunde inte spara transaktionen");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {transaction ? "Redigera transaktion" : "Ny ekonomisk post"}
          </h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Stäng">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="form-error" style={{ marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <button
              type="button"
              className={`btn ${!isExpense ? "btn-primary" : "btn-secondary"}`}
              style={{ flex: 1 }}
              onClick={() => setIsExpense(false)}
            >
              + Inkomst (Försäljning)
            </button>
            <button
              type="button"
              className={`btn ${isExpense ? "btn-danger" : "btn-secondary"}`}
              style={{ flex: 1 }}
              onClick={() => setIsExpense(true)}
            >
              − Utgift (Kostnad)
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="tx-date">
                Datum *
              </label>
              <input
                id="tx-date"
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tx-amount">
                Belopp (kr) *
              </label>
              <input
                id="tx-amount"
                type="text"
                className="form-input"
                placeholder="t.ex. 350,00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tx-desc">
              Beskrivning *
            </label>
            <input
              id="tx-desc"
              type="text"
              className="form-input"
              placeholder="t.ex. Försäljning 5 burkar honung, Inköp sockerlösning"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="tx-counterparty">
                Motpart / Kund / Leverantör
              </label>
              <input
                id="tx-counterparty"
                type="text"
                list="tx-counterparty-datalist"
                className="form-input"
                placeholder="t.ex. Granngården, Grannen Lisa"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
              />
              <datalist id="tx-counterparty-datalist">
                {uniqueCounterparties.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tx-category">
                Kategori
              </label>
              <select
                id="tx-category"
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Honungsförsäljning">Honungsförsäljning</option>
                <option value="Utrustning & Material">Utrustning & Material</option>
                <option value="Foder & Invintring">Foder & Invintring</option>
                <option value="Drottningar & Samhällen">Drottningar & Samhällen</option>
                <option value="Behandling & Hälsa">Behandling & Hälsa</option>
                <option value="Föreningsavgift">Föreningsavgift</option>
                <option value="Övrigt">Övrigt</option>
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Avbryt
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <Check size={16} />
              <span>{isSubmitting ? "Sparar..." : "Spara transaktion"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
