import React, { useState } from "react";
import {
  createScenarioBundle,
  generateMarkdownDiagnosticReport,
  loadScenarioBundle,
  ScenarioBundle,
} from "../../domain/scenarioBundle";
import { useBottomSheet } from "../../hooks/useBottomSheet";
import { BottomSheetDragHandle } from "../../components/ui/BottomSheetDragHandle";
import {
  X,
  Share2,
  Copy,
  Download,
  Upload,
  Check,
  ShieldCheck,
  AlertCircle,
  FileText,
} from "lucide-react";

export interface ScenarioManagerModalProps {
  onClose: () => void;
  onReloadData: () => Promise<void>;
  showSnackbar: (options: { message: string; type?: "success" | "info" | "warning" | "error" }) => string;
}

export const ScenarioManagerModal: React.FC<ScenarioManagerModalProps> = ({
  onClose,
  onReloadData,
  showSnackbar,
}) => {
  const { contentRef, backdropRef, bottomSheetHandlers } = useBottomSheet({ onClose });

  const [scramblePii, setScramblePii] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopyReport = async () => {
    try {
      setIsExporting(true);
      setError(null);
      const bundle = await createScenarioBundle(scramblePii);
      const markdown = generateMarkdownDiagnosticReport(bundle);

      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      showSnackbar({
        message: "Diagnostikrapport kopierad till urklipp!",
        type: "success",
      });
      setTimeout(() => setCopied(false), 2500);
    } catch (err: any) {
      setError(err.message || "Kunde inte kopiera rapporten");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadBundle = async () => {
    try {
      setIsExporting(true);
      setError(null);
      const bundle = await createScenarioBundle(scramblePii);
      const jsonStr = JSON.stringify(bundle, null, 2);

      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().substring(0, 10);
      const fileName = `bifogat-scenario-${dateStr}${scramblePii ? "-anonymiserat" : ""}.json`;

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSnackbar({
        message: `Scenariopaket sparades (${fileName})`,
        type: "success",
      });
    } catch (err: any) {
      setError(err.message || "Kunde inte ladda ner scenariopaketet");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileImport = async (file: File) => {
    try {
      setIsImporting(true);
      setError(null);

      const text = await file.text();
      const parsed: ScenarioBundle = JSON.parse(text);

      if (!parsed || parsed.version !== "1.0") {
        throw new Error("Ogiltigt format på scenariopaketet (version 1.0 krävs)");
      }

      await loadScenarioBundle(parsed);
      await onReloadData();

      showSnackbar({
        message: "Scenariopaket inläst! Apptillståndet är nu simulerat.",
        type: "success",
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Kunde inte läsa in scenariopaketet");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div ref={backdropRef} className="modal-backdrop" onClick={onClose}>
      <div
        ref={contentRef}
        className="modal-content zero-scroll-modal"
        style={{ maxWidth: "560px", maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
        {...bottomSheetHandlers}
      >
        <BottomSheetDragHandle />

        {/* Modal Header */}
        <div className="modal-header wizard-header" style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              className="wizard-icon-badge"
              style={{
                backgroundColor: "var(--color-honey-surface)",
                color: "var(--color-honey-text)",
                border: "1px solid var(--color-honey-border)",
              }}
            >
              <Share2 size={18} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: "1.1rem", margin: 0 }}>
                Dela scenarion & diagnostik
              </h2>
              <span className="wizard-subtitle">
                Exportera fallstudier, rapportera buggar eller simulera tillstånd
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Stäng">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-scroll-body" style={{ padding: "4px 0 12px 0" }}>
          {error && (
            <div className="form-error wizard-error-alert" style={{ marginBottom: "10px" }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Privacy & Scrambling Toggle Box */}
          <div
            className="card"
            style={{
              padding: "12px",
              marginBottom: "12px",
              backgroundColor: "var(--color-surface-subtle)",
              borderRadius: "12px",
              border: "1px solid var(--color-border-subtle)",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                cursor: "pointer",
                margin: 0,
              }}
            >
              <input
                type="checkbox"
                checked={scramblePii}
                onChange={(e) => setScramblePii(e.target.checked)}
                style={{ marginTop: "2px" }}
              />
              <div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: "var(--color-text-main)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <ShieldCheck size={16} color="var(--color-success-base)" />
                  <span>Scrambla känsliga personuppgifter</span>
                </div>
                <p
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--color-text-muted)",
                    margin: "2px 0 0 0",
                    lineHeight: "1.4",
                  }}
                >
                  Byter automatiskt ut kundnamn och kontaktuppgifter mot pseudonymer (t.ex.{" "}
                  <code>Kund A.B.</code>). Bocka ur om problemet du vill dela beror på ett
                  specifikt namn eller specialtecken.
                </p>
              </div>
            </label>
          </div>

          {/* Action 1: Copy Markdown Report */}
          <div
            className="card"
            style={{
              padding: "12px",
              marginBottom: "10px",
              borderRadius: "12px",
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border-default)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <FileText size={18} color="var(--color-primary-base)" />
              <strong style={{ fontSize: "0.9rem", color: "var(--color-text-primary)" }}>
                Kopiera diagnostikrapport (Markdown)
              </strong>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "10px", lineHeight: "1.4" }}>
              Genererar en strukturerad textrapport med volymer, miljö och nyliga transaktioner
              anpassad för att klistra in direkt i chatten.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleCopyReport}
              disabled={isExporting}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? "Kopierad!" : "Kopiera diagnostikrapport"}</span>
            </button>
          </div>

          {/* Action 2: Download JSON Scenario Bundle */}
          <div
            className="card"
            style={{
              padding: "12px",
              marginBottom: "10px",
              borderRadius: "12px",
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border-default)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <Download size={18} color="var(--color-info-base)" />
              <strong style={{ fontSize: "0.9rem", color: "var(--color-text-primary)" }}>
                Ladda ner scenariopaket (.json)
              </strong>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "10px", lineHeight: "1.4" }}>
              Sparar en komplett JSON-ögonblicksbild av alla register, inställningar och utbox som kan
              delas eller läsas in på nytt.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleDownloadBundle}
              disabled={isExporting}
              style={{ width: "100%", justifyContent: "center" }}
            >
              <Download size={16} />
              <span>Ladda ner scenariopaket (.json)</span>
            </button>
          </div>

          {/* Action 3: Re-import Scenario Bundle (Simulate State) */}
          <div
            className="card"
            style={{
              padding: "12px",
              marginBottom: "0",
              borderRadius: "12px",
              backgroundColor: "var(--color-surface-subtle)",
              border: "2px dashed var(--color-border-default)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "var(--color-honey-surface)",
                color: "var(--color-honey-text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 8px auto",
              }}
            >
              <Upload size={18} />
            </div>
            <strong style={{ fontSize: "0.9rem", color: "var(--color-text-primary)", display: "block", marginBottom: "2px" }}>
              Simulera tillstånd (Läs in scenariopaket)
            </strong>
            <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: "10px", lineHeight: "1.4" }}>
              Välj en sparad <code>.json</code>-fil för att läsa in och simulera ett produktionsscenario
              i utvecklingsmiljön.
            </p>

            <label
              className="btn btn-secondary btn-sm"
              style={{ cursor: isImporting ? "not-allowed" : "pointer", display: "inline-flex", gap: "6px" }}
            >
              <Upload size={15} />
              <span>{isImporting ? "Läser in..." : "Välj .json-fil"}</span>
              <input
                type="file"
                accept=".json,application/json"
                style={{ display: "none" }}
                disabled={isImporting}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileImport(file);
                }}
              />
            </label>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div
          className="wizard-actions"
          style={{ marginTop: "auto", paddingTop: "8px", borderTop: "1px solid var(--color-border-default)" }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ width: "100%" }}>
            <span>Stäng</span>
          </button>
        </div>
      </div>
    </div>
  );
};
