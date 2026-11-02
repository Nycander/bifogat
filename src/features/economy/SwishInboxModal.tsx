import React, { useState, useMemo } from "react";
import { Transaction } from "../../domain/types";
import {
  extractUniqueCustomers,
  deriveSwishAliases,
  rankCustomerSuggestionsForSwish,
  normalizeSwishName,
} from "../../domain/customers";
import { formatHoneySaleDescription } from "../../domain/honeySale";
import { parseSwishHistoryText } from "../../import/swishHistoryParser";
import { classifySwishRows, ClassifiedSwishRow } from "../../import/swishDuplicates";
import { recognizeSwishScreenshot } from "../../import/swishOcrService";
import { useBottomSheet } from "../../hooks/useBottomSheet";
import { BottomSheetDragHandle } from "../../components/ui/BottomSheetDragHandle";
import { CustomerPicker } from "../../components/ui/CustomerPicker";
import {
  X,
  ScanText,
  Upload,
  Check,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  User,
  ArrowRight,
  Plus,
  Minus,
} from "lucide-react";

export interface SwishInboxModalProps {
  transactions: Transaction[];
  onClose: () => void;
  onSaveSwishSale: (data: {
    date: string;
    description: string;
    amountOre: number;
    counterparty?: string;
    category?: string;
    externalReference: string;
  }) => Promise<string>;
  onDeleteSwishSale: (txId: string) => Promise<void>;
}

interface DraftRowState {
  id: string;
  swishName: string;
  chosenCustomer: string;
  isCustomerManual: boolean;
  date: string;
  amountOre: number;
  swishKey: string;
  status: "new" | "already_booked" | "possibly_booked";
  nameTruncated: boolean;
  rawText: string;
  jarCount: number | null;
  needsCheck: boolean;
  isBooked: boolean;
  isSkipped: boolean;
  bookedTxId?: string;
  isEditingCustomer: boolean;
}

export const SwishInboxModal: React.FC<SwishInboxModalProps> = ({
  transactions,
  onClose,
  onSaveSwishSale,
  onDeleteSwishSale,
}) => {
  const [step, setStep] = useState<"upload" | "inbox">("upload");

  // Global settings
  const savedPrice = typeof window !== "undefined" ? localStorage.getItem("bifogat_honey_price_per_jar") : null;
  const [pricePerJar, setPricePerJar] = useState<number>(savedPrice ? parseInt(savedPrice, 10) || 95 : 95);
  const [jarSizeGrams, setJarSizeGrams] = useState<number>(500);

  // OCR state
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusText, setOcrStatusText] = useState("");
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Rows state
  const [draftRows, setDraftRows] = useState<DraftRowState[]>([]);
  const [showPossibleBooked, setShowPossibleBooked] = useState(false);
  const [showAlreadyBooked, setShowAlreadyBooked] = useState(false);

  // Propagation feedback
  const [propagationNotice, setPropagationNotice] = useState<{
    swishName: string;
    customer: string;
    affectedCount: number;
    previousState: Map<string, string>;
  } | null>(null);

  const { contentRef, backdropRef, bottomSheetHandlers } = useBottomSheet({ onClose });

  const allCustomers = useMemo(() => extractUniqueCustomers(transactions), [transactions]);
  const aliasMap = useMemo(() => deriveSwishAliases(transactions), [transactions]);

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

  /**
   * Initializes draft rows from parsed Swish rows.
   */
  const initializeDrafts = (rawRows: ReturnType<typeof parseSwishHistoryText>) => {
    const classified = classifySwishRows(rawRows, transactions);
    const combined: ClassifiedSwishRow[] = [
      ...classified.newRows,
      ...classified.possiblyBookedRows,
      ...classified.alreadyBookedRows,
    ];

    // Sort oldest first for chronological booking
    const sorted = [...combined].sort((a, b) => {
      const dateA = a.date || "9999-99-99";
      const dateB = b.date || "9999-99-99";
      return dateA.localeCompare(dateB);
    });

    const drafts: DraftRowState[] = sorted.map((row) => {
      const normSwish = normalizeSwishName(row.swishName);
      const learnedAlias = aliasMap.get(normSwish);
      const chosenCustomer = learnedAlias || row.swishName;

      const sek = row.amountOre / 100;
      const isDivisible = pricePerJar > 0 && sek % pricePerJar === 0;
      const guessedCount = isDivisible ? Math.round(sek / pricePerJar) : null;
      const needsCheck = !isDivisible;

      return {
        id: row.id,
        swishName: row.swishName,
        chosenCustomer,
        isCustomerManual: false,
        date: row.date || new Date().toISOString().slice(0, 10),
        amountOre: row.amountOre,
        swishKey: row.swishKey,
        status: row.status,
        nameTruncated: row.nameTruncated,
        rawText: row.rawText,
        jarCount: guessedCount,
        needsCheck,
        isBooked: row.status === "already_booked",
        isSkipped: false,
        isEditingCustomer: false,
      };
    });

    setDraftRows(drafts);
    setStep("inbox");
  };

  /**
   * Runs OCR on user-selected file.
   */
  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      setOcrError(null);
      setOcrProgress(0.05);
      setOcrStatusText("Startar bildanalys...");

      const recognizedText = await recognizeSwishScreenshot(file, (p, s) => {
        setOcrProgress(p);
        setOcrStatusText(s);
      });

      const parsed = parseSwishHistoryText(recognizedText, new Date());
      if (parsed.length === 0) {
        setOcrError("Kunde inte identifiera några Swish-rader i bilden. Kontrollera att bilden visar Swish-historik.");
        setIsProcessing(false);
        return;
      }

      initializeDrafts(parsed);
      setIsProcessing(false);
    } catch (err: any) {
      setOcrError(err.message || "Kunde inte läsa skärmdumpen");
      setIsProcessing(false);
    }
  };

  /**
   * Loads sample test fixture from spec (17 items simulation or spec sample).
   */
  const handleLoadSampleFixture = () => {
    const specSampleText = `
Berg Anna 200 kr
29 okt.
Erik Lind 200 kr
29 okt.
Lindqvist Maximilian Alexa... 100 kr
27 okt.
Erik Lind 100 kr
8 okt.
Erik Lind 100 kr
8 okt.
Johan Karlsson 150 kr
7 okt.
Karin Blom 130 kr
5 okt.
`;
    const parsed = parseSwishHistoryText(specSampleText, new Date());
    initializeDrafts(parsed);
  };

  /**
   * Updates customer on a card and propagates to other unbooked cards with same Swish name.
   */
  const handleCustomerChange = (
    rowId: string,
    newCustomerName: string,
    closeEditing = false,
  ) => {
    const target = draftRows.find((r) => r.id === rowId);
    if (!target) return;

    const normSwish = normalizeSwishName(target.swishName);

    // Save previous state for undo
    const prevState = new Map<string, string>();
    draftRows.forEach((r) => {
      if (!r.isBooked && normalizeSwishName(r.swishName) === normSwish && !r.isCustomerManual) {
        prevState.set(r.id, r.chosenCustomer);
      }
    });

    let affectedCount = 0;

    const updated = draftRows.map((r) => {
      if (r.id === rowId) {
        return {
          ...r,
          chosenCustomer: newCustomerName,
          isCustomerManual: true,
          isEditingCustomer: closeEditing ? false : r.isEditingCustomer,
        };
      }
      // Propagate to unbooked rows with same normalized Swish name that weren't manually edited
      if (!r.isBooked && normalizeSwishName(r.swishName) === normSwish && !r.isCustomerManual) {
        affectedCount++;
        return {
          ...r,
          chosenCustomer: newCustomerName,
        };
      }
      return r;
    });

    setDraftRows(updated);

    if (affectedCount > 0) {
      setPropagationNotice({
        swishName: target.swishName,
        customer: newCustomerName,
        affectedCount: affectedCount + 1,
        previousState: prevState,
      });
    }
  };

  /**
   * Reverts propagated customer changes.
   */
  const handleUndoPropagation = () => {
    if (!propagationNotice) return;
    const updated = draftRows.map((r) => {
      const prev = propagationNotice.previousState.get(r.id);
      if (prev !== undefined) {
        return { ...r, chosenCustomer: prev, isCustomerManual: false };
      }
      return r;
    });
    setDraftRows(updated);
    setPropagationNotice(null);
  };

  const handleJarCountSelect = (rowId: string, count: number) => {
    setDraftRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, jarCount: count, needsCheck: false } : r)),
    );
  };

  /**
   * Books a single draft row to IndexedDB.
   */
  const handleBookRow = async (row: DraftRowState) => {
    const jarCount = row.jarCount || 1;
    const description = formatHoneySaleDescription({
      jarCount,
      jarSizeGrams,
      paymentMethod: "Swish",
      counterparty: row.chosenCustomer,
    });

    try {
      const txId = await onSaveSwishSale({
        date: row.date,
        description,
        amountOre: row.amountOre,
        counterparty: row.chosenCustomer.trim() || undefined,
        category: "Honungsförsäljning",
        externalReference: row.swishKey,
      });

      setDraftRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, isBooked: true, bookedTxId: txId } : r)),
      );
    } catch (err: any) {
      alert("Kunde inte bokföra: " + err.message);
    }
  };

  /**
   * Undoes a booked row in this session.
   */
  const handleUndoRow = async (row: DraftRowState) => {
    if (!row.bookedTxId) return;
    try {
      await onDeleteSwishSale(row.bookedTxId);
      setDraftRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, isBooked: false, bookedTxId: undefined } : r,
        ),
      );
    } catch (err: any) {
      alert("Kunde inte ångra: " + err.message);
    }
  };

  const handleSkipRow = (rowId: string) => {
    setDraftRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, isSkipped: true } : r)),
    );
  };

  // Grouped counts for top summary
  const newPendingRows = draftRows.filter((r) => r.status === "new" && !r.isSkipped && !r.isBooked);
  const possibleRows = draftRows.filter((r) => r.status === "possibly_booked" && !r.isBooked);
  const alreadyBookedList = draftRows.filter((r) => r.status === "already_booked" || r.isBooked);
  const checkCount = newPendingRows.filter((r) => r.needsCheck).length;
  const totalBookedThisSession = draftRows.filter((r) => Boolean(r.bookedTxId)).length;

  return (
    <div ref={backdropRef} className="modal-backdrop" onClick={onClose}>
      <div
        ref={contentRef}
        className="modal-content zero-scroll-modal"
        style={{ maxWidth: "580px", maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
        {...bottomSheetHandlers}
      >
        <BottomSheetDragHandle />

        {/* Modal Header */}
        <div className="modal-header wizard-header" style={{ marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div className="wizard-icon-badge" style={{ backgroundColor: "#0284c7", color: "#fff" }}>
              <ScanText size={18} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: "1.1rem", margin: 0 }}>
                Swish-inkorg
              </h2>
              <span className="wizard-subtitle">
                {step === "upload" ? "Läs skärmdump från Swish" : "Granska och bokför försäljningar"}
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Stäng">
            <X size={20} />
          </button>
        </div>

        {/* STEP A: Upload & OCR */}
        {step === "upload" && (
          <div className="modal-scroll-body" style={{ padding: "8px 0" }}>
            <div
              className="card"
              style={{
                border: "2px dashed var(--color-border-default)",
                textAlign: "center",
                padding: "24px 16px",
                backgroundColor: "var(--color-surface-subtle)",
                borderRadius: "16px",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(2, 132, 199, 0.12)",
                  color: "#0284c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px auto",
                }}
              >
                <Upload size={24} />
              </div>

              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 6px 0" }}>
                Ladda upp Swish-skärmdump
              </h3>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--color-text-muted)",
                  maxWidth: "340px",
                  margin: "0 auto 16px auto",
                  lineHeight: "1.4",
                }}
              >
                Välj en skärmdump från Swish Historik (filtrerad på inkommande betalningar). All bildanalys sker direkt på enheten.
              </p>

              {isProcessing ? (
                <div style={{ maxWidth: "300px", margin: "0 auto" }}>
                  <div
                    style={{
                      height: "8px",
                      backgroundColor: "var(--color-border-default)",
                      borderRadius: "999px",
                      overflow: "hidden",
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.round(ocrProgress * 100)}%`,
                        backgroundColor: "#0284c7",
                        transition: "width 0.2s ease",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginBottom: "12px" }}>
                    {ocrStatusText} ({Math.round(ocrProgress * 100)}%)
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsProcessing(false)}
                  >
                    Avbryt
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                  <label className="btn btn-primary" style={{ cursor: "pointer", display: "inline-flex", gap: "6px" }}>
                    <Upload size={16} />
                    <span>Välj skärmdump</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleLoadSampleFixture}
                    style={{ marginTop: "4px" }}
                  >
                    <Sparkles size={14} color="#d97706" />
                    <span>Testa med exempeldata</span>
                  </button>
                </div>
              )}
            </div>

            {ocrError && (
              <div className="form-error" style={{ marginBottom: "1rem" }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{ocrError}</span>
              </div>
            )}
          </div>
        )}

        {/* STEP B: Inbox */}
        {step === "inbox" && (
          <div className="modal-scroll-body" style={{ padding: "0 0 12px 0" }}>
            {/* Summary badges */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                flexWrap: "wrap",
                marginBottom: "8px",
                fontSize: "0.8rem",
              }}
            >
              <span className="badge badge-success" style={{ fontWeight: 600 }}>
                {newPendingRows.length} nya
              </span>
              {possibleRows.length > 0 && (
                <span className="badge badge-warning" style={{ fontWeight: 600 }}>
                  {possibleRows.length} möjligen redan bokförda
                </span>
              )}
              {checkCount > 0 && (
                <span className="badge badge-info" style={{ fontWeight: 600 }}>
                  {checkCount} att kolla
                </span>
              )}
            </div>

            {/* Global Settings (Price per jar & Jar size) */}
            <div
              className="card"
              style={{
                padding: "8px 12px",
                marginBottom: "10px",
                backgroundColor: "var(--color-surface-subtle)",
                borderRadius: "12px",
                display: "grid",
                gridTemplateColumns: "1.1fr 1fr",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <div>
                <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "2px" }}>
                  Pris per burk (kr)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    style={{ padding: "4px 8px", fontSize: "0.85rem", width: "70px", fontWeight: 700 }}
                    value={pricePerJar}
                    onChange={(e) => handlePriceChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>kr</span>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "2px" }}>
                  Standard burkstorlek
                </label>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[500, 350, 250].map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`jar-size-chip ${jarSizeGrams === size ? "selected" : ""}`}
                      style={{ padding: "3px 7px", fontSize: "0.75rem" }}
                      onClick={() => setJarSizeGrams(size)}
                    >
                      {size}g
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Propagation Toast / Notice */}
            {propagationNotice && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "rgba(2, 132, 199, 0.1)",
                  border: "1px solid rgba(2, 132, 199, 0.25)",
                  color: "var(--color-text-main)",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  marginBottom: "8px",
                  fontSize: "0.8rem",
                }}
              >
                <span>
                  Gäller {propagationNotice.affectedCount} rader med &quot;{propagationNotice.swishName}&quot; → <b>{propagationNotice.customer}</b>
                </span>
                <button
                  type="button"
                  onClick={handleUndoPropagation}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: "2px 6px", fontSize: "0.75rem" }}
                >
                  <RotateCcw size={12} />
                  <span>Ångra</span>
                </button>
              </div>
            )}

            {/* NEW ROWS LIST */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {newPendingRows.map((row) => {
                const normSwish = normalizeSwishName(row.swishName);
                const learnedAlias = aliasMap.get(normSwish);
                const quickChips = rankCustomerSuggestionsForSwish(row.swishName, allCustomers, learnedAlias, 4);
                const sek = row.amountOre / 100;
                const exactCount = (pricePerJar > 0 && sek > 0) ? Math.round(sek / pricePerJar) : null;
                const chipSet = new Set<number>([1, 2, 3, 4, 5, 6]);
                if (exactCount && exactCount >= 1 && exactCount <= 30) {
                  chipSet.add(exactCount);
                }
                if (row.jarCount && row.jarCount >= 1 && row.jarCount <= 30) {
                  chipSet.add(row.jarCount);
                }
                const jarChipOptions = Array.from(chipSet).sort((a, b) => a - b);

                return (
                  <div
                    key={row.id}
                    className="card swish-inbox-card"
                    style={{
                      padding: "10px 12px",
                      borderRadius: "14px",
                      border: row.needsCheck ? "1px solid #f59e0b" : "1px solid var(--color-border-default)",
                      backgroundColor: "var(--color-surface)",
                    }}
                  >
                    {/* Row Header: Date, Swish Name & Check badge */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-text-muted)" }}>
                          {row.date}
                        </span>
                        {row.nameTruncated && (
                          <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                            (avkortat namn)
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        {row.needsCheck && (
                          <span
                            className="badge badge-warning"
                            style={{ fontSize: "0.7rem", padding: "1px 6px", display: "inline-flex", gap: "3px" }}
                          >
                            <HelpCircle size={11} />
                            Kolla
                          </span>
                        )}
                        <span style={{ fontSize: "1rem", fontWeight: 800, color: "#16a34a" }}>
                          {sek.toFixed(0)} kr
                        </span>
                      </div>
                    </div>

                    {/* Customer Row */}
                    <div style={{ marginBottom: "6px" }}>
                      {row.isEditingCustomer ? (
                        <div style={{ marginTop: "4px", marginBottom: "4px", display: "flex", alignItems: "flex-start", gap: "6px" }}>
                          <div style={{ flex: 1 }}>
                            <CustomerPicker
                              id={`picker-${row.id}`}
                              value={row.chosenCustomer}
                              onChange={(name) => handleCustomerChange(row.id, name, false)}
                              onFinishEditing={() =>
                                setDraftRows((prev) =>
                                  prev.map((r) => (r.id === row.id ? { ...r, isEditingCustomer: false } : r)),
                                )
                              }
                              allCustomers={allCustomers}
                              quickChips={quickChips}
                              placeholder="Välj eller skriv kund..."
                            />
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "5px 10px", fontSize: "0.8rem", whiteSpace: "nowrap", height: "34px" }}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() =>
                              setDraftRows((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, isEditingCustomer: false } : r)),
                              )
                            }
                          >
                            Klar
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <button
                            type="button"
                            className="customer-name-toggle-btn"
                            onClick={() =>
                              setDraftRows((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, isEditingCustomer: true } : r)),
                              )
                            }
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              background: "none",
                              border: "none",
                              padding: "2px 0",
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <User size={14} color="var(--color-text-muted)" />
                            <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--color-text-main)" }}>
                              {row.chosenCustomer}
                            </span>
                            {row.chosenCustomer !== row.swishName && (
                              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                ({row.swishName})
                              </span>
                            )}
                          </button>

                          {/* Quick change chip if alias / fuzzy match exists */}
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                            {quickChips.slice(0, 2).map((chip) => {
                              if (chip === row.chosenCustomer) return null;
                              return (
                                <button
                                  key={chip}
                                  type="button"
                                  className="customer-quick-chip"
                                  style={{ fontSize: "0.75rem", padding: "1px 6px" }}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => handleCustomerChange(row.id, chip, true)}
                                >
                                  {chip}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Jar count selector chips & stepper */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Antal burkar:</span>

                      {/* Stepper Controls */}
                      <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--color-border-default)", borderRadius: "8px", overflow: "hidden", backgroundColor: "var(--color-surface-bg)" }}>
                        <button
                          type="button"
                          style={{ padding: "2px 6px", background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", color: "var(--color-text-main)" }}
                          aria-label="Minska antal burkar"
                          onClick={() => handleJarCountSelect(row.id, Math.max(1, (row.jarCount || 1) - 1))}
                        >
                          <Minus size={13} />
                        </button>
                        <span style={{ padding: "0 6px", fontSize: "0.78rem", fontWeight: 700, minWidth: "22px", textAlign: "center", color: "var(--color-text-main)" }}>
                          {row.jarCount || 1} st
                        </span>
                        <button
                          type="button"
                          style={{ padding: "2px 6px", background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", color: "var(--color-text-main)" }}
                          aria-label="Öka antal burkar"
                          onClick={() => handleJarCountSelect(row.id, (row.jarCount || 1) + 1)}
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      {/* Preset Chips */}
                      {jarChipOptions.map((cnt) => {
                        const cost = cnt * pricePerJar;
                        const isSelected = row.jarCount === cnt;
                        return (
                          <button
                            key={cnt}
                            type="button"
                            className={`honey-preset-chip ${isSelected ? "selected" : ""}`}
                            style={{ padding: "2px 7px", fontSize: "0.75rem", minWidth: "auto" }}
                            onClick={() => handleJarCountSelect(row.id, cnt)}
                          >
                            {cnt} st ({cost} kr)
                          </button>
                        );
                      })}
                    </div>

                    {/* Card Actions */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                        onClick={() => handleSkipRow(row.id)}
                      >
                        Hoppa över
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ padding: "4px 12px", fontSize: "0.8rem" }}
                        onClick={() => handleBookRow(row)}
                      >
                        <Check size={14} />
                        <span>Bokför</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Already booked cards in this session (with Undo) */}
              {draftRows.filter((r) => r.isBooked).map((row) => (
                <div
                  key={row.id}
                  className="card"
                  style={{
                    padding: "8px 12px",
                    borderRadius: "12px",
                    backgroundColor: "rgba(22, 163, 74, 0.08)",
                    border: "1px solid rgba(22, 163, 74, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Check size={15} color="#16a34a" />
                    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      Bokförd: {row.chosenCustomer} ({row.amountOre / 100} kr)
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                    onClick={() => handleUndoRow(row)}
                  >
                    <RotateCcw size={12} />
                    <span>Ångra</span>
                  </button>
                </div>
              ))}

              {newPendingRows.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px 12px",
                    color: "var(--color-text-muted)",
                    fontSize: "0.9rem",
                  }}
                >
                  <Check size={28} color="#16a34a" style={{ margin: "0 auto 8px auto" }} />
                  <div>Alla nya Swish-rader är hanterade!</div>
                </div>
              )}
            </div>

            {/* COLLAPSED SECTIONS AT BOTTOM */}

            {/* Möjligen redan bokförda */}
            {possibleRows.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                <button
                  type="button"
                  className="accordion-header-btn"
                  onClick={() => setShowPossibleBooked(!showPossibleBooked)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    backgroundColor: "rgba(245, 158, 11, 0.08)",
                    border: "1px solid rgba(245, 158, 11, 0.2)",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  <span>Möjligen redan bokförda ({possibleRows.length})</span>
                  {showPossibleBooked ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showPossibleBooked && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                    {possibleRows.map((row) => (
                      <div
                        key={row.id}
                        className="card"
                        style={{
                          padding: "8px 10px",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: "0.82rem",
                        }}
                      >
                        <div>
                          <b>{row.swishName}</b> · {row.amountOre / 100} kr ({row.date})
                          <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                            Matchar äldre bokföring med samma datum och belopp
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                          onClick={() => handleBookRow(row)}
                        >
                          Bokför ändå
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Redan bokförda */}
            {alreadyBookedList.length > 0 && (
              <div style={{ marginTop: "8px" }}>
                <button
                  type="button"
                  className="accordion-header-btn"
                  onClick={() => setShowAlreadyBooked(!showAlreadyBooked)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    backgroundColor: "var(--color-surface-subtle)",
                    border: "1px solid var(--color-border-default)",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    color: "var(--color-text-muted)",
                  }}
                >
                  <span>Redan bokförda ({alreadyBookedList.length})</span>
                  {showAlreadyBooked ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showAlreadyBooked && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                    {alreadyBookedList.map((row) => (
                      <div
                        key={row.id}
                        style={{
                          padding: "6px 10px",
                          fontSize: "0.78rem",
                          color: "var(--color-text-muted)",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>{row.swishName} ({row.date})</span>
                        <span>{row.amountOre / 100} kr</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Actions Footer */}
        <div className="wizard-actions" style={{ marginTop: "auto", paddingTop: "8px", borderTop: "1px solid var(--color-border-default)" }}>
          {step === "upload" ? (
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ width: "100%" }}>
              Avbryt
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <span style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
                {totalBookedThisSession} bokförda
              </span>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
              >
                <span>Klar</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
