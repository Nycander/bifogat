import React, { useState, useMemo } from "react";
import { Harvest, Transaction } from "../../domain/types";
import { formatDate } from "../../domain/validation";
import { extractUniqueCustomers } from "../../domain/customers";
import { useBottomSheet } from "../../hooks/useBottomSheet";
import { BottomSheetDragHandle } from "../../components/ui/BottomSheetDragHandle";
import {
  X,
  Check,
  Droplet,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  FileText,
  Smartphone,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

interface HoneySaleModalProps {
  harvests: Harvest[];
  transactions?: Transaction[];
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
  transactions = [],
  onClose,
  onSaveSale,
}) => {
  const [step, setStep] = useState<1 | 2>(1);

  // Load remembered standard price per jar from localStorage (default 95 kr)
  const savedPrice = typeof window !== "undefined" ? localStorage.getItem("bifogat_honey_price_per_jar") : null;
  const initialPrice = savedPrice ? parseInt(savedPrice, 10) || 95 : 95;

  const [jarCount, setJarCount] = useState<number>(1);
  const [jarSizeGrams, setJarSizeGrams] = useState<number>(500);
  const [pricePerJar, setPricePerJar] = useState<number>(initialPrice);
  const [paymentMethod, setPaymentMethod] = useState<"Swish" | "Kontant" | "Faktura" | "Övrigt">("Swish");
  const [counterparty, setCounterparty] = useState<string>("");
  const [date, setDate] = useState(formatDate(new Date()));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract past unique customers
  const allCustomers = useMemo(() => extractUniqueCustomers(transactions), [transactions]);
  const recentCustomers = useMemo(() => allCustomers.slice(0, 4), [allCustomers]);

  const totalSek = jarCount * pricePerJar;
  const totalWeightKg = (jarCount * jarSizeGrams) / 1000;

  const handlePriceChange = (val: number) => {
    setPricePerJar(val);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("bifogat_honey_price_per_jar", val.toString());
      } catch {
        // ignore storage errors
      }
    }
  };

  const handleNextStep = () => {
    if (jarCount < 1) {
      setError("Minst 1 burk måste väljas");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    if (totalSek < 0) {
      setError("Totalsumman kan inte vara negativ");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const amountOre = Math.round(totalSek * 100);
      const counterpartyClean = counterparty.trim() || undefined;

      let description = `Honungsförsäljning: ${jarCount} st burkar (${jarSizeGrams}g) [${paymentMethod}]`;
      if (counterpartyClean) {
        description += ` till ${counterpartyClean}`;
      }

      await onSaveSale({
        date,
        description,
        amountOre,
        counterparty: counterpartyClean,
        category: "Honungsförsäljning",
        jarCount,
        jarSizeGrams,
        harvestId: harvests[0]?.id || undefined,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || "Kunde inte spara försäljningen");
      setIsSubmitting(false);
    }
  };

  const { contentRef, backdropRef, bottomSheetHandlers } = useBottomSheet({ onClose });

  const jarPresets = [1, 2, 3, 4, 5, 10];
  const jarSizes = [
    { size: 500, label: "500 g" },
    { size: 350, label: "350 g" },
    { size: 250, label: "250 g" },
    { size: 700, label: "700 g" },
  ];

  return (
    <div ref={backdropRef} className="modal-backdrop" onClick={onClose}>
      <div
        ref={contentRef}
        className="modal-content zero-scroll-modal"
        style={{ maxWidth: "540px" }}
        onClick={(e) => e.stopPropagation()}
        {...bottomSheetHandlers}
      >
        <BottomSheetDragHandle />

        {/* Modal Header */}
        <div className="modal-header wizard-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div className="wizard-icon-badge honey-badge">
              <Droplet size={18} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: "1.1rem", margin: 0 }}>
                Bokför honungssälj
              </h2>
              <span className="wizard-subtitle">
                Steg {step} av 2: {step === 1 ? "Antal & Pris" : "Betalsätt & Köpare"}
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Stäng">
            <X size={20} />
          </button>
        </div>

        {/* Step Progress Dots */}
        <div className="wizard-progress-track">
          <div className={`wizard-step-dot ${step >= 1 ? "active" : ""}`}>1</div>
          <div className={`wizard-step-line ${step >= 2 ? "active" : ""}`} />
          <div className={`wizard-step-dot ${step >= 2 ? "active" : ""}`}>2</div>
        </div>

        {error && <div className="form-error wizard-error-alert">{error}</div>}

        {/* STEP 1: Antal burkar & Pris */}
        {step === 1 && (
          <div className="wizard-step-content">
            {/* Big Stepper */}
            <div className="honey-stepper-card">
              <span className="honey-stepper-title">Antal sålda burkar</span>
              <div className="honey-stepper-controls">
                <button
                  type="button"
                  className="honey-stepper-btn"
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
                    setJarCount((prev) => Math.max(1, prev - 1));
                  }}
                  aria-label="Minska antal"
                >
                  <Minus size={22} />
                </button>
                <div className="honey-stepper-display">
                  <span className="honey-stepper-num">{jarCount}</span>
                  <span className="honey-stepper-unit">st</span>
                </div>
                <button
                  type="button"
                  className="honey-stepper-btn"
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
                    setJarCount((prev) => prev + 1);
                  }}
                  aria-label="Öka antal"
                >
                  <Plus size={22} />
                </button>
              </div>

              {/* Quick jar chips */}
              <div className="honey-preset-chips">
                {jarPresets.map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`honey-preset-chip ${jarCount === count ? "selected" : ""}`}
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
                      setJarCount(count);
                    }}
                  >
                    {count} st
                  </button>
                ))}
              </div>
            </div>

            {/* Jar Size Pills & Price Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "0.65rem", marginBottom: "0.85rem" }}>
              <div>
                <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "4px" }}>Burkstorlek</label>
                <div className="jar-size-selector">
                  {jarSizes.map((js) => (
                    <button
                      key={js.size}
                      type="button"
                      className={`jar-size-chip ${jarSizeGrams === js.size ? "selected" : ""}`}
                      onClick={() => setJarSizeGrams(js.size)}
                    >
                      {js.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "4px" }}>Pris/burk (kr)</label>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    style={{ fontSize: "1rem", fontWeight: 700, padding: "7px 10px", textAlign: "center" }}
                    value={pricePerJar}
                    onChange={(e) => handlePriceChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  />
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-muted)" }}>kr</span>
                </div>
              </div>
            </div>

            {/* Total Banner */}
            <div className="honey-total-banner">
              <div>
                <span className="honey-total-label">Totalsumma att bokföra</span>
                <span className="honey-total-sub">{jarCount} st à {pricePerJar} kr ({totalWeightKg.toFixed(1)} kg)</span>
              </div>
              <div className="honey-total-amount">
                {totalSek.toFixed(0)} kr
              </div>
            </div>

            <div className="wizard-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Avbryt
              </button>
              <button type="button" className="btn btn-primary" onClick={handleNextStep}>
                <span>Fortsätt till betalning</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Betalsätt & Köpare */}
        {step === 2 && (
          <div className="wizard-step-content">
            <div className="wizard-context-banner">
              <span className="wizard-context-pill">🍯 {jarCount} st ({jarSizeGrams}g)</span>
              <span className="wizard-context-pill font-bold" style={{ color: "#d97706" }}>💰 {totalSek.toFixed(0)} kr</span>
            </div>

            {/* Payment Method 4-Grid */}
            <div className="form-group" style={{ marginBottom: "0.85rem" }}>
              <label className="form-label">Hur betalar kunden? *</label>
              <div className="payment-method-grid">
                {[
                  { id: "Swish" as const, label: "Swish", icon: Smartphone, color: "#16a34a" },
                  { id: "Kontant" as const, label: "Kontant", icon: Banknote, color: "#0284c7" },
                  { id: "Faktura" as const, label: "Faktura", icon: FileText, color: "#d97706" },
                  { id: "Övrigt" as const, label: "Annat", icon: CreditCard, color: "var(--color-text-muted)" },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`payment-method-card ${isSelected ? "selected" : ""}`}
                      onClick={() => setPaymentMethod(m.id)}
                    >
                      <Icon size={18} color={isSelected ? "var(--color-primary-text, #fff)" : m.color} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Buyer name + recent suggestion chips */}
            <div className="form-group" style={{ marginBottom: "0.85rem" }}>
              <label className="form-label" htmlFor="sale-counterparty">
                Köpare / Kund (valfritt)
              </label>
              <input
                id="sale-counterparty"
                type="text"
                className="form-input"
                placeholder="t.ex. Lisa Nilsson, Grannen, Marknad..."
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                autoFocus
              />

              {recentCustomers.length > 0 && (
                <div className="customer-chips-row">
                  <span className="customer-chips-label">Tidigare:</span>
                  {recentCustomers.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      className="customer-quick-chip"
                      onClick={() => setCounterparty(c.name)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date */}
            <div className="form-group" style={{ marginBottom: "0.5rem" }}>
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

            <div className="wizard-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
              >
                <ArrowLeft size={16} />
                <span>Tillbaka</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-save-wizard"
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
              >
                <Check size={18} />
                <span>{isSubmitting ? "Bokför..." : `Bokför försäljning (${totalSek.toFixed(0)} kr)`}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
