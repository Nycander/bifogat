import React, { useState } from "react";
import { Harvest } from "../../domain/types";
import { formatDate } from "../../domain/validation";
import { X, Check, Droplet, Plus, Minus, CreditCard, Banknote, FileText, Smartphone } from "lucide-react";

interface HoneySaleModalProps {
  harvests: Harvest[];
  onClose: () => void;
  onSaveSale: (data: {
    date: string;
    description: string;
    amountOre: number;
    counterparty?: string;
    category: string;
    jarCount: number;
    jarSizeGrams: number;
    harvestId?: string;
  }) => Promise<void>;
}

export const HoneySaleModal: React.FC<HoneySaleModalProps> = ({
  harvests,
  onClose,
  onSaveSale,
}) => {
  // Load remembered standard price per jar from localStorage (default 95 kr)
  const savedPrice = typeof window !== "undefined" ? localStorage.getItem("bifogat_honey_price_per_jar") : null;
  const initialPrice = savedPrice ? parseInt(savedPrice, 10) || 95 : 95;

  const [jarCount, setJarCount] = useState<number>(1);
  const [jarSizeGrams, setJarSizeGrams] = useState<number>(500);
  const [pricePerJar, setPricePerJar] = useState<number>(initialPrice);
  const [isCustomTotal, setIsCustomTotal] = useState(false);
  const [customTotalSek, setCustomTotalSek] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"Swish" | "Kontant" | "Faktura" | "Övrigt">("Swish");
  const [counterparty, setCounterparty] = useState<string>("");
  const [selectedHarvestId, setSelectedHarvestId] = useState<string>("");
  const [date, setDate] = useState<string>(formatDate(new Date()));
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate total amount
  const calculatedTotalSek = jarCount * pricePerJar;
  const totalSek = isCustomTotal && customTotalSek !== "" ? parseFloat(customTotalSek) || 0 : calculatedTotalSek;
  const totalWeightKg = (jarCount * jarSizeGrams) / 1000;

  const handlePriceChange = (val: number) => {
    setPricePerJar(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("bifogat_honey_price_per_jar", val.toString());
    }
  };

  const handleCountPreset = (count: number) => {
    setJarCount(count);
    if (isCustomTotal) {
      setIsCustomTotal(false);
      setCustomTotalSek("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jarCount <= 0) {
      setError("Antal burkar måste vara minst 1");
      return;
    }
    if (totalSek <= 0) {
      setError("Beloppet måste vara större än 0 kr");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Auto-construct a clear description
      const selectedHarvest = harvests.find((h) => h.id === selectedHarvestId);
      const batchPart = selectedHarvest?.batchName
        ? ` (${selectedHarvest.batchName})`
        : selectedHarvest?.date
          ? ` (Slungad ${selectedHarvest.date})`
          : "";
      const notesPart = notes.trim() ? ` - ${notes.trim()}` : "";
      const description = `Försäljning: ${jarCount} st ${jarSizeGrams}g burkar${batchPart} [${paymentMethod}]${notesPart}`;

      const amountOre = Math.round(totalSek * 100);

      await onSaveSale({
        date,
        description,
        amountOre,
        counterparty: counterparty.trim() || undefined,
        category: "Honungsförsäljning",
        jarCount,
        jarSizeGrams,
        harvestId: selectedHarvestId || undefined,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || "Kunde inte bokföra försäljningen");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: "540px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "var(--color-honey-surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-honey-base)",
              }}
            >
              <Droplet size={18} />
            </div>
            <div>
              <h2 className="modal-title" style={{ margin: 0, fontSize: "1.15rem" }}>
                Bokför honungsförsäljning
              </h2>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                Snabbokföring av sålda burkar direkt till kassan
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Stäng">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
          <div className="modal-scroll-body">
            {error && (
              <div className="form-error" style={{ marginBottom: "1rem" }}>
                {error}
              </div>
            )}

          {/* Quantity Section with Quick Selectors */}
          <div
            style={{
              background: "var(--color-surface-inset)",
              border: "1px solid var(--color-border-subtle)",
              borderRadius: "10px",
              padding: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                Antal burkar
              </label>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                {totalWeightKg.toFixed(1)} kg honung totalt
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: "42px", height: "42px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                onClick={() => setJarCount((prev) => Math.max(1, prev - 1))}
                aria-label="Minska antal"
              >
                <Minus size={18} />
              </button>

              <input
                type="number"
                min="1"
                step="1"
                className="form-input"
                style={{
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  textAlign: "center",
                  padding: "0.4rem",
                  maxWidth: "100px",
                  color: "var(--color-accent-dark)",
                }}
                value={jarCount}
                onChange={(e) => setJarCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                required
              />

              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: "42px", height: "42px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                onClick={() => setJarCount((prev) => prev + 1)}
                aria-label="Öka antal"
              >
                <Plus size={18} />
              </button>

              {/* Quick Presets */}
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", flex: 1, justifyContent: "flex-end" }}>
                {[1, 2, 3, 5, 6, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`btn btn-sm ${jarCount === num ? "btn-primary" : "btn-secondary"}`}
                    style={{ minWidth: "36px", padding: "4px 8px" }}
                    onClick={() => handleCountPreset(num)}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Jar Size Selector */}
            <div style={{ marginTop: "0.5rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: "0.35rem" }}>
                Burkstorlek:
              </label>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {[
                  { grams: 500, label: "500g (Standard)" },
                  { grams: 350, label: "350g" },
                  { grams: 250, label: "250g (Liten)" },
                  { grams: 700, label: "700g" },
                  { grams: 1000, label: "1 kg" },
                ].map((size) => (
                  <button
                    key={size.grams}
                    type="button"
                    className={`btn btn-sm ${jarSizeGrams === size.grams ? "btn-primary" : "btn-outline"}`}
                    style={{ fontSize: "0.75rem", padding: "4px 9px" }}
                    onClick={() => setJarSizeGrams(size.grams)}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing & Total calculation */}
          <div
            style={{
              background: "var(--color-honey-gradient)",
              border: "1px solid var(--color-honey-border)",
              borderRadius: "10px",
              padding: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", alignItems: "center" }}>
              <div>
                <label className="form-label" style={{ fontSize: "0.8rem", color: "var(--color-honey-text)", marginBottom: "0.2rem" }}>
                  Pris per burk (kr)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    style={{
                      background: "var(--color-surface-bg)",
                      fontSize: "1.05rem",
                      fontWeight: 700,
                      padding: "0.45rem 0.65rem",
                      color: "var(--color-text-primary)",
                    }}
                    value={pricePerJar}
                    onChange={(e) => handlePriceChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  />
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-honey-text)" }}>kr</span>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--color-honey-text)", display: "block" }}>
                  Totalsumma att bokföra
                </span>
                <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-honey-text)" }}>
                  {totalSek.toFixed(0)} kr
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--color-honey-text)", opacity: 0.85, display: "block" }}>
                  {jarCount} st à {pricePerJar} kr
                </span>
              </div>
            </div>

            {/* Custom discount total link */}
            <div style={{ marginTop: "0.6rem", textAlign: "right" }}>
              {!isCustomTotal ? (
                <button
                  type="button"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--color-honey-text)",
                    fontSize: "0.75rem",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setIsCustomTotal(true);
                    setCustomTotalSek(calculatedTotalSek.toString());
                  }}
                >
                  Justera totalsumma (t.ex. mängdrabatt 3 för 250 kr)
                </button>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-honey-text)" }}>Eget totalbelopp:</span>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    style={{ width: "90px", padding: "0.25rem 0.5rem", fontSize: "0.85rem", background: "var(--color-surface-bg)" }}
                    value={customTotalSek}
                    onChange={(e) => setCustomTotalSek(e.target.value)}
                    placeholder={calculatedTotalSek.toString()}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: "0.75rem", padding: "2px 6px" }}
                    onClick={() => {
                      setIsCustomTotal(false);
                      setCustomTotalSek("");
                    }}
                  >
                    Återställ
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="form-group" style={{ marginBottom: "0.85rem" }}>
            <label className="form-label">Betalsätt *</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.4rem" }}>
              {[
                { id: "Swish" as const, label: "Swish", icon: Smartphone, color: "var(--color-success-base)" },
                { id: "Kontant" as const, label: "Kontant", icon: Banknote, color: "var(--color-info-base)" },
                { id: "Faktura" as const, label: "Faktura", icon: FileText, color: "var(--color-honey-base)" },
                { id: "Övrigt" as const, label: "Annat", icon: CreditCard, color: "var(--color-text-muted)" },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`btn ${isSelected ? "btn-primary" : "btn-secondary"}`}
                    style={{
                      flexDirection: "column",
                      padding: "0.5rem 0.35rem",
                      gap: "0.25rem",
                      borderWidth: isSelected ? "2px" : "1px",
                    }}
                    onClick={() => setPaymentMethod(m.id)}
                  >
                    <Icon size={16} color={isSelected ? "currentColor" : m.color} />
                    <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Buyer Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.85rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="sale-date">
                Försäljningsdatum
              </label>
              <input
                id="sale-date"
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="sale-counterparty">
                Köpare / Kund (valfritt)
              </label>
              <input
                id="sale-counterparty"
                type="text"
                className="form-input"
                placeholder="t.ex. Anna Svensson, Grannen"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
              />
            </div>
          </div>

          {/* Optional Harvest Batch Connection */}
          {harvests.length > 0 && (
            <div className="form-group" style={{ marginBottom: "0.85rem" }}>
              <label className="form-label" htmlFor="sale-harvest">
                Koppla till skördepartí (valfritt)
              </label>
              <select
                id="sale-harvest"
                className="form-select"
                value={selectedHarvestId}
                onChange={(e) => setSelectedHarvestId(e.target.value)}
              >
                <option value="">Inget specifikt parti valt</option>
                {harvests.map((h) => {
                  const label = h.batchName || `Skörd ${h.date}`;
                  const gramsStr = h.honeyWeightGrams ? ` (${(h.honeyWeightGrams / 1000).toFixed(1)} kg)` : "";
                  return (
                    <option key={h.id} value={h.id}>
                      {label}{gramsStr}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: "0.85rem" }}>
            <label className="form-label" htmlFor="sale-notes">
              Anteckning (valfritt)
            </label>
            <input
              id="sale-notes"
              type="text"
              className="form-input"
              placeholder="t.ex. Levereras fredag, swishat i förskott"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          </div>

          <div
            className="modal-actions"
            style={{
              marginTop: "0.75rem",
              paddingTop: "0.75rem",
              borderTop: "1px solid var(--color-border-subtle)",
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="btn btn-honey btn-lg"
              style={{ flex: 1, justifyContent: "center" }}
              disabled={isSubmitting}
            >
              <Check size={18} />
              <span>
                {isSubmitting
                  ? "Bokför..."
                  : `Bokför försäljning (${totalSek.toFixed(0)} kr)`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
