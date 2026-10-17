import React, { useState } from "react";
import { usePWAInstall } from "./usePWAInstall";
import { Download, Smartphone } from "lucide-react";

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed standalone app, hide the prompt
  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="btn btn-primary btn-sm install-button"
        title="Installera Bifogat på din hemskärm"
        aria-label="Installera Bifogat appen"
      >
        <Download size={16} />
        <span>Installera app</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="btn btn-outline btn-sm install-button"
          title="Installera på iPhone eller iPad"
          aria-label="Installera på iPhone eller iPad"
        >
          <Smartphone size={16} />
          <span>Installera på iOS</span>
        </button>

        {showIOSGuide && (
          <div className="modal-backdrop" onClick={() => setShowIOSGuide(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Installera på iPhone & iPad</h3>
              <p className="modal-text">
                1. Tryck på knappen <strong>Dela</strong> (fyrkant med pil uppåt) i Safaris
                verktygsfält.
                <br />
                2. Rulla ner och välj <strong>Lägg till på hemskärmen</strong>.<br />
                3. Nu startar Bifogat som en fristående app med fullt offline-stöd!
              </p>
              <div className="modal-actions">
                <button onClick={() => setShowIOSGuide(false)} className="btn btn-secondary">
                  Stäng
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
