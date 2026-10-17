import React from 'react';
import { Hive, HiveEvent } from '../../domain/types';
import { X, Plus, Edit2, Calendar, ClipboardList } from 'lucide-react';

interface HiveDetailModalProps {
  hive: Hive;
  events: HiveEvent[];
  onClose: () => void;
  onLogEvent: (hiveId: string) => void;
  onEditHive: (hive: Hive) => void;
}

export const HiveDetailModal: React.FC<HiveDetailModalProps> = ({
  hive,
  events,
  onClose,
  onLogEvent,
  onEditHive,
}) => {
  const hiveEvents = events.filter((e) => e.hiveId === hive.id);

  const getStatusBadge = (status: Hive['status']) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-active">Aktiv</span>;
      case 'inactive':
        return <span className="badge badge-inactive">Inaktiv</span>;
      case 'merged':
        return <span className="badge badge-merged">Sammanslagen</span>;
      case 'archived':
        return <span className="badge badge-archived">Arkiverad</span>;
    }
  };

  const getEventBadge = (type: HiveEvent['type']) => {
    switch (type) {
      case 'inspection':
        return <span className="badge badge-event-inspection">Besiktning</span>;
      case 'feeding':
        return <span className="badge badge-event-feeding">Foder</span>;
      case 'treatment':
        return <span className="badge badge-event-treatment">Behandling</span>;
      case 'harvest':
        return <span className="badge badge-event-harvest">Skörd</span>;
      case 'equipment':
        return <span className="badge badge-event-equipment">Lådor</span>;
      case 'colony_change':
        return <span className="badge badge-event-colony_change">Koloni</span>;
      default:
        return <span className="badge badge-event-other">Övrigt</span>;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 className="modal-title">{hive.name}</h2>
            {getStatusBadge(hive.status)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onEditHive(hive)}
              title="Redigera kupuppgifter"
            >
              <Edit2 size={14} />
              <span>Ändra</span>
            </button>
            <button className="modal-close-btn" onClick={onClose} aria-label="Stäng">
              <X size={20} />
            </button>
          </div>
        </div>

        {hive.notes && (
          <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>ANTECKNING OM KUPAN</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-main)', marginTop: '0.2rem' }}>{hive.notes}</div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ClipboardList size={18} />
            <span>Händelsehistorik ({hiveEvents.length})</span>
          </h3>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onLogEvent(hive.id)}
          >
            <Plus size={14} />
            <span>Logga händelse</span>
          </button>
        </div>

        {hiveEvents.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
            <p className="empty-state-desc">Inga loggade besök ännu för {hive.name}. Tryck på "Logga händelse" ovan.</p>
          </div>
        ) : (
          <div className="item-list">
            {hiveEvents.map((event) => (
              <div key={event.id} className="list-item">
                <div className="list-item-main">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={13} />
                      {event.date}
                    </span>
                    {getEventBadge(event.type)}
                  </div>
                  {event.title && <div className="list-item-title">{event.title}</div>}
                  {event.notes && <div className="list-item-notes">{event.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
};
