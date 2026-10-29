import React, { useState, useMemo } from "react";
import { Harvest, Hive } from "../../domain/types";
import { formatDate } from "../../domain/validation";
import { X, Check, Droplet, Calendar, ChevronDown } from "lucide-react";
import { useBottomSheet } from "../../hooks/useBottomSheet";
import { BottomSheetDragHandle } from "../../components/ui/BottomSheetDragHandle";

interface HarvestFormModalProps {
  harvest?: Harvest;
  hives?: Hive[];
  harvests?: Harvest[];
  onClose: () => void;
  onSave: (data: {
    batchName?: string;
    date: string;
    collectedDates?: string;
    dragPeriod?: string;
    hiveId?: string;
    honeyWeightGrams?: number;
    waterContentPercent?: number;
    notes?: string;
  }) => Promise<void>;
}

function getSwedishMonthName(monthIndex: number): string {
  const months = [
    "januari",
    "februari",
    "mars",
    "april",
    "maj",
    "juni",
    "juli",
    "augusti",
    "september",
    "oktober",
    "november",
    "december",
  ];
  return months[monthIndex] || "";
}

function formatSwedishDateNice(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10) - 1;
    return `${day} ${getSwedishMonthName(month)}`;
  }
  return dateStr;
}

export const HarvestFormModal: React.FC<HarvestFormModalProps> = ({
  harvest,
  harvests = [],
  onClose,
  onSave,
}) => {
  const currentYear = new Date().getFullYear();
  const defaultBatchName = harvest?.batchName || `Sommarskörd ${currentYear}`;

  const [batchName, setBatchName] = useState(defaultBatchName);
  const [date, setDate] = useState(harvest?.date || formatDate(new Date()));
  const [hiveId] = useState(harvest?.hiveId || "");
  const [customDragPeriod, setCustomDragPeriod] = useState(
    harvest?.dragPeriod || harvest?.collectedDates || "",
  );
  const [isEditingDragPeriod, setIsEditingDragPeriod] = useState(
    Boolean(harvest?.dragPeriod || harvest?.collectedDates),
  );
  const [weightKg, setWeightKg] = useState(
    harvest?.honeyWeightGrams !== undefined ? (harvest.honeyWeightGrams / 1000).toString() : "",
  );
  const [waterContent, setWaterContent] = useState(
    harvest?.waterContentPercent !== undefined ? harvest.waterContentPercent.toString() : "",
  );
  const [notes, setNotes] = useState(harvest?.notes || "");
  const [showNotesField, setShowNotesField] = useState(Boolean(harvest?.notes));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Automatically compute suggested drag period from previous harvest or spring start (1 maj)
  const computedDragPeriod = useMemo(() => {
    const harvestYear = date ? new Date(date).getFullYear() : currentYear;

    // Filter previous harvests (same hive if chosen, otherwise apiary-wide)
    const filtered = harvests
      .filter((h) => h.id !== harvest?.id)
      .filter((h) => !hiveId || !h.hiveId || h.hiveId === hiveId)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Find the most recent harvest strictly before current slungdatum
    const previousHarvests = filtered.filter((h) => h.date < date);
    const prevHarvest = previousHarvests.length > 0 ? previousHarvests[previousHarvests.length - 1] : null;

    let startDate: string;
    let isSpringStart = false;

    if (prevHarvest) {
      const prevDateObj = new Date(prevHarvest.date);
      if (prevDateObj.getFullYear() === harvestYear) {
        // Day after previous slungning
        const nextDay = new Date(prevDateObj);
        nextDay.setDate(nextDay.getDate() + 1);
        startDate = nextDay.toISOString().substring(0, 10);
      } else {
        // Previous harvest was a previous year -> start of season (1 maj)
        startDate = `${harvestYear}-05-01`;
        isSpringStart = true;
      }
    } else {
      // First harvest of the season -> default to 1 maj (vårens start i Sverige)
      startDate = `${harvestYear}-05-01`;
      isSpringStart = true;
    }

    const dStart = new Date(startDate);
    const dEnd = new Date(date);
    const diffDays = Math.max(1, Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24)));

    const label = `${formatSwedishDateNice(startDate)} – ${formatSwedishDateNice(date)} (${diffDays} dagar${
      isSpringStart ? ", från vårens start" : " sedan förra slungningen"
    })`;

    return {
      startDate,
      endDate: date,
      diffDays,
      label,
      isSpringStart,
      prevHarvestName: prevHarvest?.batchName || (prevHarvest ? `Slungning ${prevHarvest.date}` : null),
    };
  }, [date, hiveId, harvests, harvest?.id, currentYear]);

  const activeDragPeriodString = isEditingDragPeriod
    ? customDragPeriod.trim()
    : computedDragPeriod.label;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let honeyWeightGrams: number | undefined;
    if (weightKg.trim()) {
      const kg = parseFloat(weightKg.replace(",", "."));
      if (isNaN(kg) || kg < 0) {
        setError("Ange en giltig vikt i kg");
        return;
      }
      honeyWeightGrams = Math.round(kg * 1000);
    }

    let parsedWaterContent: number | undefined;
    if (waterContent.trim()) {
      const wc = parseFloat(waterContent.replace(",", "."));
      if (isNaN(wc) || wc < 0 || wc > 40) {
        setError("Ange en rimlig vattenhalt i procent (t.ex. 17.5%)");
        return;
      }
      parsedWaterContent = wc;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        batchName: batchName.trim() || `Skörd ${date}`,
        date,
        collectedDates: activeDragPeriodString || undefined,
        dragPeriod: activeDragPeriodString || undefined,
        hiveId: hiveId || undefined,
        honeyWeightGrams,
        waterContentPercent: parsedWaterContent,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Kunde inte spara skördepartiet");
      setIsSubmitting(false);
    }
  };

  // Water content quality indicator
  const numWater = parseFloat(waterContent.replace(",", "."));
  let waterQuality: { text: string; color: string; bg: string; border: string } | null = null;
  if (!isNaN(numWater)) {
    if (numWater < 18) {
      waterQuality = {
        text: "Utmärkt kvalitet (< 18% vattenhalt, mycket lagringsduglig)",
        color: "var(--color-success-text)",
        bg: "var(--color-success-surface)",
        border: "var(--color-success-border)",
      };
    } else if (numWater <= 20) {
      waterQuality = {
        text: "Godkänd svensk standard (18–20% vattenhalt)",
        color: "var(--color-warning-text)",
        bg: "var(--color-warning-surface)",
        border: "var(--color-warning-border)",
      };
    } else {
      waterQuality = {
        text: "Varning: Hög vattenhalt (> 20%). Risk för jäsning!",
        color: "var(--color-danger-text)",
        bg: "var(--color-danger-surface)",
        border: "var(--color-danger-border)",
      };
    }
  }

  const { contentRef, bottomSheetHandlers } = useBottomSheet({ onClose });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={contentRef}
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        {...bottomSheetHandlers}
      >
        <BottomSheetDragHandle />
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
              <h2 className="modal-title" style={{ fontSize: "1.15rem", margin: 0 }}>
                {harvest ? "Redigera skördeparti" : "Registrera skördedag & slungning"}
              </h2>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                Parti, dragperiod och slungad mängd
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Stäng">
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}
        >
          <div className="modal-scroll-body">
            {error && (
              <div className="form-error" style={{ marginBottom: "1rem" }}>
                {error}
              </div>
            )}

            {/* Batch Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="batch-name">
                Partinamn / Batch *
              </label>
              <input
                id="batch-name"
                type="text"
                className="form-input"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder={`t.ex. Sommarskörd ${currentYear}`}
                required
                autoFocus
              />
              <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
                {[`Vårskörd ${currentYear}`, `Sommarskörd ${currentYear}`, `Sensommarskörd ${currentYear}`, `Ljunghonung ${currentYear}`].map(
                  (suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setBatchName(suggestion)}
                      style={{
                        background: "var(--color-surface-inset)",
                        border: "1px solid var(--color-border-subtle)",
                        padding: "0.2rem 0.55rem",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      + {suggestion}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Slungningsdatum (hela bigården som standard) */}
            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                <label className="form-label" htmlFor="harvest-date" style={{ margin: 0, fontWeight: 700 }}>
                  Slungningsdatum *
                </label>
                <span style={{ fontSize: "0.75rem", color: "var(--color-primary-base)", fontWeight: 600 }}>
                  Gemensam skörd för hela bigården
                </span>
              </div>
              <input
                id="harvest-date"
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {/* 1. Auto-calculated Dragperiod */}
            <div
              style={{
                background: "var(--color-surface-inset)",
                border: "1px solid var(--color-border-subtle)",
                borderRadius: "10px",
                padding: "0.85rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.35rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.825rem",
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  <Calendar size={15} color="var(--color-primary-base)" />
                  Dragperiod (automatiskt beräknad)
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingDragPeriod(!isEditingDragPeriod)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "0.75rem",
                    color: "var(--color-primary-base)",
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {isEditingDragPeriod ? "Använd automatisk" : "Ändra manuellt"}
                </button>
              </div>

              {!isEditingDragPeriod ? (
                <div>
                  <div
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: "var(--color-accent-dark)",
                      marginBottom: "0.2rem",
                    }}
                  >
                    🌸 {computedDragPeriod.label}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                    {computedDragPeriod.isSpringStart
                      ? "Beräknad från vårens dragstart (1 maj) till dagens slungdatum."
                      : `Beräknad från dagen efter förra slungningen (${computedDragPeriod.prevHarvestName || "tidigare skörd"}).`}
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="t.ex. 15 maj – 20 juni (36 dagar)"
                    value={customDragPeriod}
                    onChange={(e) => setCustomDragPeriod(e.target.value)}
                    style={{ marginTop: "0.25rem" }}
                  />
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.25rem", display: "block" }}>
                    Skriv in egen dragperiod eller datumintervall
                  </span>
                </div>
              )}
            </div>

            {/* Honey Weight (Optimized for unknown/rough estimate) & Water content */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="harvest-weight">
                  Uppskattad mängd i kärl (kg, valfritt)
                </label>
                <input
                  id="harvest-weight"
                  type="text"
                  className="form-input"
                  placeholder="t.ex. 30 (kan lämnas tomt)"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                />
                <span className="form-help" style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  Grovt estimat vid slungning. Exakt skörd beräknas allteftersom burkar tappas.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="harvest-water">
                  Vattenhalt (%)
                </label>
                <input
                  id="harvest-water"
                  type="text"
                  className="form-input"
                  placeholder="t.ex. 17,4"
                  value={waterContent}
                  onChange={(e) => setWaterContent(e.target.value)}
                />
                <span className="form-help" style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  Mätt med refraktometer (valfritt)
                </span>
              </div>
            </div>

            {/* Water quality feedback */}
            {waterQuality && (
              <div
                style={{
                  background: waterQuality.bg,
                  color: waterQuality.color,
                  border: `1px solid ${waterQuality.border}`,
                  padding: "0.5rem 0.75rem",
                  borderRadius: "8px",
                  marginBottom: "1rem",
                  fontSize: "0.825rem",
                  fontWeight: 600,
                }}
              >
                💧 {waterQuality.text}
              </div>
            )}

            {/* Notes Section: Collapsed by default since beekeepers rarely take notes on sling day */}
            <div style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}>
              {!showNotesField ? (
                <button
                  type="button"
                  onClick={() => setShowNotesField(true)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "0.8rem",
                    color: "var(--color-text-muted)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0.25rem 0",
                  }}
                >
                  <ChevronDown size={14} />
                  <span>+ Lägg till anteckning (valfritt)</span>
                </button>
              ) : (
                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label className="form-label" htmlFor="harvest-notes" style={{ margin: 0 }}>
                      Anteckningar (valfritt)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNotesField(false)}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "0.75rem",
                        color: "var(--color-text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      Dölj
                    </button>
                  </div>
                  <input
                    id="harvest-notes"
                    type="text"
                    className="form-input"
                    placeholder="t.ex. Mycket klöver och hallonblom, silad två gånger"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ marginTop: "0.3rem" }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Pinned Modal Actions */}
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
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <Check size={16} />
              <span>{isSubmitting ? "Sparar..." : "Spara skördeparti"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
