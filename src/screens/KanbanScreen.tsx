import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { TASK_COLUMNS, PRIORITY_LABELS } from '../lib/constants';
import { daysUntil } from '../lib/format';
import { Modal, EmptyState, Spinner, Badge } from '../components/ui';
import type { Task } from '../lib/types';
import {
  Plus, GripVertical, Flag,
  KanbanSquare, Trash2, Clock, AlertCircle
} from 'lucide-react';

const COLUMN_COLORS: Record<string, string> = {
  slate: 'bg-slate-500',
  blue: 'bg-brand-500',
  amber: 'bg-warning-500',
  green: 'bg-success-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-slate-500',
  medium: 'text-brand-600',
  high: 'text-warning-600',
  urgent: 'text-error-600',
};

export function KanbanScreen() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStatus, setCreateStatus] = useState<'todo' | 'in_progress' | 'review' | 'done'>('todo');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const loadTasks = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('owner_id', profile.id)
      .order('position', { ascending: true });
    if (data) setTasks(data as Task[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleDragStart = (task: Task) => setDraggedTask(task);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = async (status: string) => {
    if (!draggedTask || draggedTask.status === status) return;
    const updated = tasks.map(t => t.id === draggedTask.id ? { ...t, status: status as Task['status'] } : t);
    setTasks(updated);
    await supabase.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', draggedTask.id);
    setDraggedTask(null);
  };

  const handleDeleteTask = async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setEditingTask(null);
  };

  const handleCreateTask = async (taskData: Partial<Task>) => {
    if (!profile) return;
    const maxPos = tasks.filter(t => t.status === createStatus).reduce((max, t) => Math.max(max, t.position), 0);
    await supabase.from('tasks').insert({
      owner_id: profile.id,
      title: taskData.title,
      description: taskData.description || null,
      status: createStatus,
      priority: taskData.priority || 'medium',
      position: maxPos + 1,
      due_date: taskData.due_date || null,
      labels: taskData.labels || [],
    });
    setShowCreateModal(false);
    loadTasks();
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    await supabase.from('tasks').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    loadTasks();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Spinner className="w-8 h-8 text-brand-600" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Доска задач</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Управляйте своими рабочим процессом</p>
        </div>
        <button onClick={() => { setCreateStatus('todo'); setShowCreateModal(true); }} className="btn-primary">
          <Plus className="w-4 h-4" />
          Новая задача
        </button>
      </div>

      {tasks.length === 0 && !loading ? (
        <EmptyState
          icon={KanbanSquare}
          title="Доска пуста"
          description="Создайте первую задачу, чтобы начать работу"
          action={<button onClick={() => setShowCreateModal(true)} className="btn-primary mt-2"><Plus className="w-4 h-4" /> Создать задачу</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 overflow-x-auto">
          {TASK_COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key);
            return (
              <div
                key={col.key}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(col.key)}
                className="flex flex-col bg-slate-100 dark:bg-slate-900 rounded-2xl p-3 min-h-[200px]"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${COLUMN_COLORS[col.color]}`} />
                    <span className="font-semibold text-slate-900 dark:text-white text-sm">{col.label}</span>
                    <span className="text-xs text-slate-400">({colTasks.length})</span>
                  </div>
                  <button onClick={() => { setCreateStatus(col.key as typeof createStatus); setShowCreateModal(true); }} className="btn-ghost !p-1">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 flex-1">
                  {colTasks.map(task => {
                    const remaining = task.due_date ? daysUntil(task.due_date) : null;
                    const overdue = remaining !== null && remaining < 0 && task.status !== 'done';
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => handleDragStart(task)}
                        onClick={() => setEditingTask(task)}
                        className="card p-3 cursor-pointer hover:shadow-card-hover transition-all duration-200 animate-fade-in group"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                          <h4 className="font-medium text-slate-900 dark:text-white text-sm flex-1 leading-snug">{task.title}</h4>
                        </div>
                        {task.description && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">{task.description}</p>}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Flag className={`w-3 h-3 ${PRIORITY_COLORS[task.priority]}`} />
                          {task.due_date && (
                            <span className={`text-[11px] flex items-center gap-1 ${overdue ? 'text-error-600' : 'text-slate-500'}`}>
                              {overdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {overdue ? `Просрочено ${Math.abs(remaining!)}д` : `${remaining}д`}
                            </span>
                          )}
                          {task.labels.map(l => <Badge key={l} color="slate" className="!text-[10px]">{l}</Badge>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <TaskModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateTask}
          status={createStatus}
        />
      )}

      {editingTask && (
        <TaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={(data) => { handleUpdateTask(editingTask.id, data); setEditingTask(null); }}
          onDelete={() => handleDeleteTask(editingTask.id)}
        />
      )}
    </div>
  );
}

function TaskModal({ task, onClose, onSave, onDelete, status }: {
  task?: Task;
  onClose: () => void;
  onSave: (data: Partial<Task>) => void;
  onDelete?: () => void;
  status?: string;
}) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState(task?.priority || 'medium');
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.split('T')[0] : '');
  const [taskStatus, setTaskStatus] = useState(task?.status || status || 'todo');
  const [labels, setLabels] = useState<string[]>(task?.labels || []);
  const [labelInput, setLabelInput] = useState('');

  const addLabel = () => {
    const l = labelInput.trim();
    if (l && !labels.includes(l)) setLabels([...labels, l]);
    setLabelInput('');
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      status: taskStatus as Task['status'],
      labels,
    });
  };

  return (
    <Modal open onClose={onClose} size="md" title={task ? 'Редактировать задачу' : 'Новая задача'}>
      <div className="p-6 space-y-4">
        <div>
          <label className="label">Название</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Что нужно сделать?" className="input" autoFocus />
        </div>
        <div>
          <label className="label">Описание</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Подробнее..." className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Приоритет</label>
            <select value={priority} onChange={e => setPriority(e.target.value as Task['priority'])} className="input">
              {Object.entries(PRIORITY_LABELS).map(([key, val]) => <option key={key} value={key}>{val.ru}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Статус</label>
            <select value={taskStatus} onChange={e => setTaskStatus(e.target.value as Task['status'])} className="input">
              {TASK_COLUMNS.map(col => <option key={col.key} value={col.key}>{col.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Срок</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Метки</label>
          <div className="flex gap-2 mb-2">
            <input type="text" value={labelInput} onChange={e => setLabelInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLabel())} placeholder="Добавить метку" className="input" />
            <button onClick={addLabel} className="btn-secondary">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {labels.map(l => <span key={l} className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{l}<button onClick={() => setLabels(labels.filter(x => x !== l))} className="ml-1">×</button></span>)}
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
          {onDelete ? (
            <button onClick={onDelete} className="btn-danger !py-2">
              <Trash2 className="w-4 h-4" />
              Удалить
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">Отмена</button>
            <button onClick={handleSave} disabled={!title.trim()} className="btn-primary">
              {task ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
