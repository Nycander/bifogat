import React, { useState } from 'react';
import { Task, Hive } from '../../domain/types';
import { Plus, CheckSquare, Calendar, Edit2, Trash2 } from 'lucide-react';

interface TasksViewProps {
  tasks: Task[];
  hives: Hive[];
  onToggleTask: (id: string) => Promise<void>;
  onOpenCreateTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => Promise<void>;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  hives,
  onToggleTask,
  onOpenCreateTask,
  onEditTask,
  onDeleteTask,
}) => {
  const [filter, setFilter] = useState<'open' | 'completed'>('open');

  const openTasks = tasks.filter((t) => t.status === 'open');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const displayTasks = filter === 'open' ? openTasks : completedTasks;

  const getHiveName = (hiveId?: string) => {
    if (!hiveId) return null;
    const hive = hives.find((h) => h.id === hiveId);
    return hive ? hive.name : null;
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h1>Uppgifter & att göra</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Planerade åtgärder vid kuporna och inköpslistor
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onOpenCreateTask}>
          <Plus size={16} />
          <span>Ny uppgift</span>
        </button>
      </div>

      <div className="tabs-header">
        <button
          className={`tab-btn ${filter === 'open' ? 'active' : ''}`}
          onClick={() => setFilter('open')}
        >
          Att göra ({openTasks.length})
        </button>
        <button
          className={`tab-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Avklarade ({completedTasks.length})
        </button>
      </div>

      {displayTasks.length === 0 ? (
        <div className="card empty-state">
          <CheckSquare size={40} className="empty-state-icon" />
          <h3 className="empty-state-title">
            {filter === 'open' ? 'Inga öppna uppgifter!' : 'Inga avklarade uppgifter ännu.'}
          </h3>
          <p className="empty-state-desc">
            {filter === 'open'
              ? 'Allt är ordnat i bigården just nu. Lägg till en ny uppgift vid behov.'
              : 'Avklarade uppgifter hamnar här när du bockar av dem.'}
          </p>
          {filter === 'open' && (
            <button className="btn btn-primary" onClick={onOpenCreateTask}>
              <Plus size={16} />
              <span>Skapa uppgift</span>
            </button>
          )}
        </div>
      ) : (
        <div className="item-list">
          {displayTasks.map((task) => {
            const hiveName = getHiveName(task.hiveId);
            const isCompleted = task.status === 'completed';

            return (
              <div key={task.id} className="list-item">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
                  <input
                    type="checkbox"
                    className="task-checkbox"
                    checked={isCompleted}
                    onChange={() => onToggleTask(task.id)}
                    aria-label={`Markera "${task.title}" som ${isCompleted ? 'öppen' : 'klar'}`}
                    style={{ marginTop: '0.2rem' }}
                  />
                  <div className="list-item-main">
                    <div className={`list-item-title ${isCompleted ? 'task-title completed' : ''}`}>
                      {task.title}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                      {task.dueDate && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-primary-hover)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={12} />
                          Förfaller: {task.dueDate}
                        </span>
                      )}
                      {hiveName && (
                        <span className="badge badge-inactive" style={{ fontSize: '0.7rem' }}>
                          {hiveName}
                        </span>
                      )}
                    </div>

                    {task.notes && (
                      <div className="list-item-notes" style={{ marginTop: '0.35rem' }}>
                        {task.notes}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <button
                    className="btn btn-secondary btn-sm btn-icon-only"
                    onClick={() => onEditTask(task)}
                    title="Redigera uppgift"
                    aria-label="Redigera uppgift"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="btn btn-secondary btn-sm btn-icon-only"
                    onClick={() => {
                      if (window.confirm(`Vill du ta bort uppgiften "${task.title}"?`)) {
                        onDeleteTask(task.id);
                      }
                    }}
                    title="Ta bort uppgift"
                    aria-label="Ta bort uppgift"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
