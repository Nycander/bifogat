import React from 'react';
import { Harvest, Hive } from '../../domain/types';
import { Plus, Droplet, Calendar, Trash2 } from 'lucide-react';

interface HarvestsViewProps {
  harvests: Harvest[];
  hives: Hive[];
  onOpenCreateHarvest: () => void;
  onDeleteHarvest: (id: string) => Promise<void>;
}

export const HarvestsView: React.FC<HarvestsViewProps> = ({
  harvests,
  hives,
  onOpenCreateHarvest,
  onDeleteHarvest,
}) => {
  const getHiveName = (hiveId?: string) => {
    if (!hiveId) return 'Gemensam / alla kupor';
    const hive = hives.find((h) => h.id === hiveId);
    return hive ? hive.name : 'Okänd kupa';
  };

  // Group by year for annual summary
  const summaryByYear: Record<string, { totalWeightGrams: number; totalJars: number; count: number }> = {};
  for (const h of harvests) {
    const year = h.date.substring(0, 4) || 'Okänt år';
    if (!summaryByYear[year]) {
      summaryByYear[year] = { totalWeightGrams: 0, totalJars: 0, count: 0 };
    }
    summaryByYear[year].count += 1;
    if (h.honeyWeightGrams !== undefined) {
      summaryByYear[year].totalWeightGrams += h.honeyWeightGrams;
    }
    if (h.jarCount !== undefined) {
      summaryByYear[year].totalJars += h.jarCount;
    }
  }

  const years = Object.keys(summaryByYear).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h1>Skörd & honungsproduktion</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Slungning, burkning och årlig skördestatistik
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onOpenCreateHarvest}>
          <Plus size={16} />
          <span>Registrera skörd</span>
        </button>
      </div>

      {years.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem', backgroundColor: 'var(--color-primary-subtle)', borderColor: 'var(--color-primary-light)' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ color: 'var(--color-accent-dark)' }}>
              <Droplet size={18} />
              <span>Årlig produktionsöversikt</span>
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            {years.map((yr) => {
              const data = summaryByYear[yr];
              const kg = (data.totalWeightGrams / 1000).toFixed(1).replace('.', ',');
              return (
                <div key={yr} style={{ background: '#fff', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-accent-dark)' }}>{yr}</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text-main)', marginTop: '0.2rem' }}>
                    {data.totalWeightGrams > 0 ? `${kg} kg` : `${data.totalJars} burkar`}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {data.totalJars > 0 && data.totalWeightGrams > 0 ? `(~${data.totalJars} st burkar)` : `${data.count} skördetillfällen`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {harvests.length === 0 ? (
        <div className="card empty-state">
          <Droplet size={40} className="empty-state-icon" />
          <h3 className="empty-state-title">Inga skördar registrerade</h3>
          <p className="empty-state-desc">
            När du slungar eller tappar honung på burk kan du registrera vikt och antal burkar här.
          </p>
          <button className="btn btn-primary" onClick={onOpenCreateHarvest}>
            <Plus size={16} />
            <span>Registrera första skörden</span>
          </button>
        </div>
      ) : (
        <div className="item-list">
          {harvests.map((harvest) => {
            const hiveName = getHiveName(harvest.hiveId);
            const weightStr =
              harvest.honeyWeightGrams !== undefined
                ? `${(harvest.honeyWeightGrams / 1000).toFixed(1).replace('.', ',')} kg`
                : null;
            const jarsStr = harvest.jarCount !== undefined ? `${harvest.jarCount} st burkar` : null;

            return (
              <div key={harvest.id} className="list-item">
                <div className="list-item-main">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={12} />
                      {harvest.date}
                    </span>
                    <span className="badge badge-event-harvest">
                      {hiveName}
                    </span>
                  </div>

                  <div className="list-item-title" style={{ fontSize: '1.1rem', color: 'var(--color-accent-dark)' }}>
                    {[weightStr, jarsStr].filter(Boolean).join(' • ') || 'Skörd'}
                  </div>

                  {harvest.notes && (
                    <div className="list-item-notes">
                      {harvest.notes}
                    </div>
                  )}
                </div>

                <button
                  className="btn btn-secondary btn-sm btn-icon-only"
                  onClick={() => {
                    if (window.confirm('Vill du ta bort denna skördepost?')) {
                      onDeleteHarvest(harvest.id);
                    }
                  }}
                  title="Ta bort skördepost"
                  aria-label="Ta bort skördepost"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
