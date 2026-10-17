import React, { useState } from 'react';
import { Hive } from '../../domain/types';
import { parseHistoricalNotes, ParsedNotesResult } from '../../import/notesParser';
import { X, Upload, Check, FileText, ArrowRight } from 'lucide-react';

interface NotesImportModalProps {
  existingHives: Hive[];
  onClose: () => void;
  onConfirmImport: (result: ParsedNotesResult) => Promise<void>;
  onExportBackup: () => void;
}

export const NotesImportModal: React.FC<NotesImportModalProps> = ({
  existingHives,
  onClose,
  onConfirmImport,
  onExportBackup,
}) => {
  const [notesText, setNotesText] = useState('');
  const [previewResult, setPreviewResult] = useState<ParsedNotesResult | null>(null);
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setNotesText(text);
      processNotes(text);
    };
    reader.readAsText(file, 'utf-8');
  };

  const processNotes = (text: string) => {
    try {
      setError(null);
      const res = parseHistoricalNotes(text, existingHives);
      setPreviewResult(res);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Fel vid tolkning av anteckningar');
    }
  };

  const handleConfirm = async () => {
    if (!previewResult || isSubmitting) return;
    try {
      setIsSubmitting(true);
      await onConfirmImport(previewResult);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Kunde inte importera anteckningarna');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} color="var(--color-primary)" />
            <h2 className="modal-title">Importera historiska anteckningar</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Stäng">
            <X size={20} />
          </button>
        </div>

        {error && <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {step === 'input' ? (
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Klistra in dina gamla anteckningar från Google Keep eller textfiler.
              Sektioner som <em>Köpa</em>, <em>Skörd</em>, <em>Loggbok</em>, <em>Kupa A/B/C</em> och <em>Nästa gång</em> tolkas
              och delas upp i uppgifter, skördar och händelser med fullständigt bevarad originaltext.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="btn btn-secondary" style={{ width: '100%', padding: '1.5rem', border: '2px dashed var(--color-border)', cursor: 'pointer' }}>
                <Upload size={24} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700 }}>Välj text- eller markdown-fil (.txt / .md)</div>
                </div>
                <input
                  type="file"
                  accept=".txt,.md"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Eller klistra in anteckningstexten direkt här:</label>
              <textarea
                className="form-textarea"
                rows={8}
                placeholder={`# Köpa\n- Apistan\n- 50 st burkar\n\n# Kupa A\n- 2026-05-15: Drottning sedd, 4 ramar yngel\n\n# Skörd\n- 45 st 500 g burkar`}
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>Avbryt</button>
              <button
                className="btn btn-primary"
                onClick={() => processNotes(notesText)}
                disabled={!notesText.trim()}
              >
                <span>Granska innehåll</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div>
            {previewResult && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Identifierade kupor</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>{previewResult.detectedHives.length}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Loggade händelser</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-success)' }}>{previewResult.events.length}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Uppgifter (Köpa/Nästa)</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-info)' }}>{previewResult.tasks.length}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Skördeposter</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-accent-dark)' }}>{previewResult.harvests.length}</div>
                  </div>
                </div>

                {previewResult.detectedHives.length > 0 && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '0.65rem 0.85rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                    <strong>Hittade kupor/avläggare:</strong>{' '}
                    {previewResult.detectedHives.map((h) => `${h.name}${h.isNew ? ' (ny)' : ''}`).join(', ')}
                  </div>
                )}

                {previewResult.unclassifiedEntries.length > 0 && (
                  <div style={{ background: '#f1f5f9', padding: '0.65rem 0.85rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                    <strong>{previewResult.unclassifiedEntries.length} oklassificerade rader</strong> (saknade datum, sparas som allmänna anteckningar så ingen data förloras).
                  </div>
                )}

                <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setStep('input')}>
                    Tillbaka
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleConfirm}
                    disabled={isSubmitting}
                  >
                    <Check size={16} />
                    <span>{isSubmitting ? 'Sparar...' : 'Bekräfta & skapa poster'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
