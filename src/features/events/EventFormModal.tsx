import React, { useState } from 'react';
import { Hive, EventType } from '../../domain/types';
import { formatDate } from '../../domain/validation';
import { X, Check } from 'lucide-react';

interface EventFormModalProps {
  hives: Hive[];
  initialHiveId?: string;
  onClose: () => void;
  onSave: (data: {
    hiveId: string;
    date: string;
    type: EventType;
    title: string;
    notes: string;
  }) => Promise<void>;
}

export const EventFormModal: React.FC<EventFormModalProps> = ({
  hives,
  initialHiveId,
  onClose,
  onSave,
}) => {
  const [hiveId, setHiveId] = useState(initialHiveId || (hives[0]?.id ?? ''));
  const [date, setDate] = useState(formatDate(new Date()));
  const [type, setType] = useState<EventType>('inspection');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double tap

    if (!hiveId) {
      setError('Du måste välja en kupa');
      return;
    }
    if (!title.trim() && !notes.trim()) {
      setError('Fyll i åtminstone en kort sammanfattning eller anteckning');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        hiveId,
        date,
        type,
        title: title.trim() || 'Kupbesök',
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Kunde inte spara händelsen');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Logga kupbesök / händelse</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Stäng">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="event-hive">Kupa *</label>
            <select
              id="event-hive"
              className="form-select"
              value={hiveId}
              onChange={(e) => setHiveId(e.target.value)}
              required
            >
              {hives.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} {h.status !== 'active' ? `(${h.status})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="event-date">Datum *</label>
              <input
                id="event-date"
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="event-type">Typ av händelse</label>
              <select
                id="event-type"
                className="form-select"
                value={type}
                onChange={(e) => setType(e.target.value as EventType)}
              >
                <option value="inspection">Besiktning / Koll</option>
                <option value="feeding">Invintring / Foder</option>
                <option value="treatment">Behandling (t.ex. Varroa)</option>
                <option value="harvest">Skörd / Slungning</option>
                <option value="equipment">Utrustning / Lådor</option>
                <option value="colony_change">Drottning / Avläggare</option>
                <option value="other">Övrigt</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="event-title">Kort sammanfattning</label>
            <input
              id="event-title"
              type="text"
              className="form-input"
              placeholder="t.ex. Drottning sedd, 5 ramar yngel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="event-notes">Detaljerade anteckningar (frivilligt)</label>
            <textarea
              id="event-notes"
              className="form-textarea"
              placeholder="Observationer, humör, foderförråd, tillsatta ramar..."
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Avbryt
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <Check size={16} />
              <span>{isSubmitting ? 'Sparar...' : 'Spara händelse'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
