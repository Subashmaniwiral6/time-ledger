import React, { useState, useEffect, useMemo } from 'react';
import { Square, Plus, X, Trash2, Pencil, ChevronLeft, ChevronRight, Sparkles, Check } from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { id: 'deep',     name: 'Deep Work',  color: '#a16207', type: 'focus' },
  { id: 'meeting',  name: 'Meeting',    color: '#475569', type: 'shallow' },
  { id: 'email',    name: 'Email',      color: '#7c8b9c', type: 'shallow' },
  { id: 'learning', name: 'Learning',   color: '#4d7c0f', type: 'focus' },
  { id: 'admin',    name: 'Admin',      color: '#78716c', type: 'shallow' },
  { id: 'break',    name: 'Break',      color: '#c2410c', type: 'break' },
  { id: 'personal', name: 'Personal',   color: '#9d174d', type: 'break' },
];

const STORAGE = {
  entries: (date) => `tl:entries:${date}`,
  settings: 'tl:settings',
  active: 'tl:active',
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const todayKey = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const fmtClock = (ms) => {
  const d = new Date(ms);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
};

const fmtDur = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return `${total}s`;
};

const fmtBigTimer = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const fmtDateLong = (date) => date.toLocaleDateString(undefined, {
  weekday: 'long', month: 'long', day: 'numeric',
});

const uid = () => Math.random().toString(36).slice(2, 10);

// ─── Storage helpers (localStorage) ─────────────────────────────────────────
function loadKey(key, fallback) {
  try {
    const r = localStorage.getItem(key);
    return r ? JSON.parse(r) : fallback;
  } catch { return fallback; }
}

function saveKey(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { console.error('save failed', key, e); }
}

function deleteKey(key) {
  try { localStorage.removeItem(key); } catch {}
}

// ─── Main App ───────────────────────────────────────────────────────────────
export default function TimeLedger() {
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [entries, setEntries] = useState([]);
  const [active, setActive] = useState(null);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [dateIndex, setDateIndex] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [activityInput, setActivityInput] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showCelebrate, setShowCelebrate] = useState(null);
  const [showCategoryMgr, setShowCategoryMgr] = useState(false);

  const viewKey = todayKey(viewDate);
  const isToday = viewKey === todayKey();

  // Initial load
  useEffect(() => {
    const settings = loadKey(STORAGE.settings, { categories: DEFAULT_CATEGORIES, dateIndex: [] });
    setCategories(settings.categories || DEFAULT_CATEGORIES);
    setDateIndex(settings.dateIndex || []);
    setEntries(loadKey(STORAGE.entries(viewKey), []));
    setActive(loadKey(STORAGE.active, null));
    setLoading(false);
    // eslint-disable-next-line
  }, []);

  // Reload entries when viewDate changes
  useEffect(() => {
    if (loading) return;
    setEntries(loadKey(STORAGE.entries(viewKey), []));
  }, [viewKey, loading]);

  // Tick clock while timer running
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  // Save settings when they change
  useEffect(() => {
    if (loading) return;
    saveKey(STORAGE.settings, { categories, dateIndex });
  }, [categories, dateIndex, loading]);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const startTimer = (categoryId, activity = '') => {
    if (active) stopTimer(true);
    const t = { activity: activity || '', categoryId, startMs: Date.now() };
    setActive(t);
    setActivityInput(activity);
    saveKey(STORAGE.active, t);
  };

  const stopTimer = (silent = false) => {
    if (!active) return;
    const endMs = Date.now();
    const duration = endMs - active.startMs;
    if (duration < 5000) {
      setActive(null);
      setActivityInput('');
      deleteKey(STORAGE.active);
      return;
    }
    const dateKey = todayKey(new Date(endMs));
    const entry = {
      id: uid(),
      activity: active.activity || '',
      categoryId: active.categoryId,
      start: active.startMs,
      end: endMs,
      duration,
    };
    const existing = loadKey(STORAGE.entries(dateKey), []);
    const updated = [...existing, entry].sort((a, b) => a.start - b.start);
    saveKey(STORAGE.entries(dateKey), updated);

    if (!dateIndex.includes(dateKey)) {
      setDateIndex([...dateIndex, dateKey].sort());
    }

    if (dateKey === viewKey) setEntries(updated);

    const finishedCat = categories.find(c => c.id === active.categoryId);

    setActive(null);
    setActivityInput('');
    deleteKey(STORAGE.active);

    if (!silent && finishedCat?.type === 'focus' && duration >= 25 * 60 * 1000) {
      setShowCelebrate({ duration, category: finishedCat });
      setTimeout(() => setShowCelebrate(null), 4500);
    }
  };

  const updateActiveActivity = (text) => {
    setActivityInput(text);
    if (active) {
      const updated = { ...active, activity: text };
      setActive(updated);
      saveKey(STORAGE.active, updated);
    }
  };

  const deleteEntry = (id) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    saveKey(STORAGE.entries(viewKey), updated);
    if (updated.length === 0) {
      setDateIndex(dateIndex.filter(d => d !== viewKey));
    }
  };

  const updateEntry = (id, patch) => {
    const updated = entries.map(e => e.id === id ? { ...e, ...patch } : e);
    setEntries(updated);
    saveKey(STORAGE.entries(viewKey), updated);
  };

  const addManualEntry = ({ activity, categoryId, startTime, endTime }) => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const base = new Date(viewDate);
    base.setHours(0, 0, 0, 0);
    const start = new Date(base); start.setHours(sh, sm, 0, 0);
    const end = new Date(base); end.setHours(eh, em, 0, 0);
    if (end <= start) return;
    const entry = {
      id: uid(),
      activity,
      categoryId,
      start: start.getTime(),
      end: end.getTime(),
      duration: end.getTime() - start.getTime(),
    };
    const updated = [...entries, entry].sort((a, b) => a.start - b.start);
    setEntries(updated);
    saveKey(STORAGE.entries(viewKey), updated);
    if (!dateIndex.includes(viewKey)) {
      setDateIndex([...dateIndex, viewKey].sort());
    }
    setShowManualAdd(false);
  };

  // ─── Computed ─────────────────────────────────────────────────────────────
  const elapsed = active ? now - active.startMs : 0;
  const activeCat = active ? categories.find(c => c.id === active.categoryId) : null;

  const stats = useMemo(() => {
    const byCat = {};
    let total = 0, focus = 0, shallow = 0, rest = 0;
    entries.forEach(e => {
      byCat[e.categoryId] = (byCat[e.categoryId] || 0) + e.duration;
      total += e.duration;
      const c = categories.find(c => c.id === e.categoryId);
      if (c?.type === 'focus') focus += e.duration;
      else if (c?.type === 'shallow') shallow += e.duration;
      else if (c?.type === 'break') rest += e.duration;
    });
    if (isToday && active) {
      byCat[active.categoryId] = (byCat[active.categoryId] || 0) + elapsed;
      total += elapsed;
      const c = categories.find(c => c.id === active.categoryId);
      if (c?.type === 'focus') focus += elapsed;
      else if (c?.type === 'shallow') shallow += elapsed;
      else if (c?.type === 'break') rest += elapsed;
    }
    const byCatArr = Object.entries(byCat)
      .map(([id, ms]) => ({ id, ms, cat: categories.find(c => c.id === id) }))
      .filter(x => x.cat)
      .sort((a, b) => b.ms - a.ms);
    const focusScore = total > 0 ? Math.round((focus / (focus + shallow + 1)) * 100) : 0;
    return { byCatArr, total, focus, shallow, rest, focusScore };
  }, [entries, categories, active, elapsed, isToday]);

  const prevDay = () => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() - 1);
    setViewDate(d);
  };
  const nextDay = () => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + 1);
    if (d > new Date()) return;
    setViewDate(d);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="paper f-body ink min-h-screen px-4 py-6 sm:px-8 sm:py-10">
      <div className="max-w-6xl mx-auto">

        <header className="mb-8 sm:mb-12">
          <div className="flex items-baseline justify-between flex-wrap gap-4">
            <div>
              <h1 className="f-display text-4xl sm:text-5xl font-light tracking-tight">
                Time <em className="italic font-normal">Ledger</em>
              </h1>
              <p className="ink-faint text-sm mt-1 tracking-wide uppercase">A record of where the hours go</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <button onClick={prevDay} className="p-1 hover:bg-amber-50 rounded transition-colors">
                  <ChevronLeft size={18} className="ink-soft" />
                </button>
                <span className="f-display text-lg italic">{isToday ? 'Today' : fmtDateLong(viewDate)}</span>
                <button
                  onClick={nextDay}
                  disabled={isToday}
                  className={`p-1 rounded transition-colors ${isToday ? 'opacity-30 cursor-not-allowed' : 'hover:bg-amber-50'}`}
                >
                  <ChevronRight size={18} className="ink-soft" />
                </button>
              </div>
              <div className="f-mono text-sm ink-faint mt-1">{fmtDur(stats.total)} logged</div>
            </div>
          </div>
          <div className="rule border-t mt-6"></div>
        </header>

        {loading ? (
          <div className="ink-faint text-center py-12 f-display italic">Loading your ledger…</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
            <div className="lg:col-span-2 space-y-8">

              {isToday && (
                <section className="border rule rounded-sm p-6 sm:p-8" style={{ background: '#fcf9f1' }}>
                  {active ? (
                    <div className="fade-up">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: activeCat?.color }}></span>
                        <span className="text-xs tracking-widest uppercase ink-faint">Now tracking</span>
                      </div>
                      <div className="flex items-baseline gap-3 mb-2 flex-wrap">
                        <span className="f-display text-2xl sm:text-3xl" style={{ color: activeCat?.color }}>
                          {activeCat?.name}
                        </span>
                        <span className="text-xs tracking-wider uppercase ink-faint">
                          since {fmtClock(active.startMs)}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={activityInput}
                        onChange={(e) => updateActiveActivity(e.target.value)}
                        placeholder="What are you working on? (optional)"
                        className="input-paper w-full px-3 py-2 rounded-sm mb-5 text-sm"
                      />
                      <div className="flex items-end justify-between gap-4 flex-wrap">
                        <div className="f-mono text-5xl sm:text-6xl tracking-tight tabular-nums">
                          {fmtBigTimer(elapsed)}
                        </div>
                        <button
                          onClick={() => stopTimer(false)}
                          className="btn-primary px-5 py-3 rounded-sm flex items-center gap-2 text-sm tracking-wide uppercase"
                        >
                          <Square size={14} fill="currentColor" /> Stop
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs tracking-widest uppercase ink-faint">Ready to track</span>
                      </div>
                      <p className="f-display text-2xl italic ink-soft mb-6">What are you about to do?</p>
                      <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => startTimer(cat.id)}
                            className="chip px-4 py-2 rounded-full text-sm flex items-center gap-2"
                          >
                            <span className="w-2 h-2 rounded-full" style={{ background: cat.color }}></span>
                            {cat.name}
                          </button>
                        ))}
                        <button
                          onClick={() => setShowCategoryMgr(true)}
                          className="chip px-3 py-2 rounded-full text-sm flex items-center gap-1 ink-faint"
                          title="Manage categories"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}

              <section>
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="f-display text-2xl">The Record</h2>
                  {isToday && (
                    <button
                      onClick={() => setShowManualAdd(true)}
                      className="text-xs tracking-wide uppercase ink-faint hover:text-stone-900 flex items-center gap-1"
                    >
                      <Plus size={12} /> Add past entry
                    </button>
                  )}
                </div>
                <div className="rule border-t mb-2"></div>
                {entries.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="f-display italic ink-faint">
                      {isToday ? 'The page is blank. Start tracking above.' : 'Nothing logged on this day.'}
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y rule">
                    {entries.map(e => (
                      <EntryRow
                        key={e.id}
                        entry={e}
                        categories={categories}
                        editing={editingId === e.id}
                        onStartEdit={() => setEditingId(e.id)}
                        onCancelEdit={() => setEditingId(null)}
                        onSave={(patch) => { updateEntry(e.id, patch); setEditingId(null); }}
                        onDelete={() => deleteEntry(e.id)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <aside className="space-y-8">
              <section className="border rule rounded-sm p-6" style={{ background: '#fcf9f1' }}>
                <h3 className="text-xs tracking-widest uppercase ink-faint mb-3">Focus Share</h3>
                <div className="flex items-baseline gap-1">
                  <span className="f-display text-5xl">{stats.focusScore}</span>
                  <span className="f-display text-2xl ink-faint">%</span>
                </div>
                <p className="text-xs ink-soft mt-2 leading-relaxed">
                  {stats.focusScore >= 60 ? 'Most of your active hours are going to deep work.' :
                   stats.focusScore >= 30 ? 'A reasonable mix of deep and shallow.' :
                   stats.total > 0 ? 'Shallow work is taking the larger share today.' :
                   'No data yet for today.'}
                </p>
                <div className="mt-4 flex h-2 rounded-full overflow-hidden bg-stone-200">
                  {stats.total > 0 && (
                    <>
                      <div style={{ background: '#a16207', width: `${(stats.focus / stats.total) * 100}%` }}></div>
                      <div style={{ background: '#7c8b9c', width: `${(stats.shallow / stats.total) * 100}%` }}></div>
                      <div style={{ background: '#c2410c', width: `${(stats.rest / stats.total) * 100}%` }}></div>
                    </>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div><div className="f-mono">{fmtDur(stats.focus)}</div><div className="ink-faint">focus</div></div>
                  <div><div className="f-mono">{fmtDur(stats.shallow)}</div><div className="ink-faint">shallow</div></div>
                  <div><div className="f-mono">{fmtDur(stats.rest)}</div><div className="ink-faint">rest</div></div>
                </div>
              </section>

              <section>
                <h3 className="text-xs tracking-widest uppercase ink-faint mb-3">By Category</h3>
                {stats.byCatArr.length === 0 ? (
                  <p className="text-sm ink-faint f-display italic">No entries yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {stats.byCatArr.map(({ id, ms, cat }) => {
                      const pct = stats.total > 0 ? (ms / stats.total) * 100 : 0;
                      return (
                        <li key={id}>
                          <div className="flex items-baseline justify-between mb-1">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="w-2 h-2 rounded-full" style={{ background: cat.color }}></span>
                              <span>{cat.name}</span>
                            </div>
                            <span className="f-mono text-xs ink-soft">{fmtDur(ms)}</span>
                          </div>
                          <div className="h-1 bg-stone-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ background: cat.color, width: `${pct}%` }}></div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <WeekGlance dateIndex={dateIndex} viewDate={viewDate} setViewDate={setViewDate} />
            </aside>
          </div>
        )}

        <footer className="mt-16 pt-6 rule border-t text-center">
          <p className="text-xs ink-faint f-display italic">
            "Until you value yourself, you will not value your time." — M. Scott Peck
          </p>
        </footer>
      </div>

      {showManualAdd && (
        <ManualAddModal
          categories={categories}
          onCancel={() => setShowManualAdd(false)}
          onSave={addManualEntry}
        />
      )}

      {showCategoryMgr && (
        <CategoryManager
          categories={categories}
          setCategories={setCategories}
          onClose={() => setShowCategoryMgr(false)}
        />
      )}

      {showCelebrate && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 slide-down z-50">
          <div className="rounded-sm px-5 py-3 shadow-lg flex items-center gap-3 text-white" style={{ background: showCelebrate.category.color }}>
            <Sparkles size={16} />
            <div className="text-sm">
              <span className="f-display italic">{fmtDur(showCelebrate.duration)}</span> of {showCelebrate.category.name.toLowerCase()}. Nicely done.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────
function EntryRow({ entry, categories, editing, onStartEdit, onCancelEdit, onSave, onDelete }) {
  const cat = categories.find(c => c.id === entry.categoryId);
  const [activity, setActivity] = useState(entry.activity);
  const [catId, setCatId] = useState(entry.categoryId);

  useEffect(() => {
    setActivity(entry.activity);
    setCatId(entry.categoryId);
  }, [entry, editing]);

  if (editing) {
    return (
      <li className="py-3">
        <div className="space-y-2">
          <input
            type="text"
            value={activity}
            onChange={e => setActivity(e.target.value)}
            placeholder="What was this?"
            className="input-paper w-full px-3 py-2 rounded-sm text-sm"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={catId}
              onChange={e => setCatId(e.target.value)}
              className="input-paper px-2 py-1 rounded-sm text-sm"
            >
              {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <button
              onClick={() => onSave({ activity, categoryId: catId })}
              className="btn-primary text-xs uppercase tracking-wide px-3 py-1.5 rounded-sm flex items-center gap-1"
            >
              <Check size={12} /> Save
            </button>
            <button onClick={onCancelEdit} className="btn-ghost text-xs uppercase tracking-wide px-3 py-1.5 rounded-sm">
              Cancel
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="py-3 group">
      <div className="flex items-baseline gap-4">
        <div className="f-mono text-xs ink-faint tabular-nums w-32 shrink-0">
          {fmtClock(entry.start)} — {fmtClock(entry.end)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cat?.color }}></span>
            <span className="text-sm font-medium">{cat?.name || 'Uncategorised'}</span>
          </div>
          {entry.activity && (
            <p className="text-sm ink-soft truncate">{entry.activity}</p>
          )}
        </div>
        <div className="f-mono text-sm tabular-nums shrink-0">{fmtDur(entry.duration)}</div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0">
          <button onClick={onStartEdit} className="p-1 hover:bg-amber-50 rounded"><Pencil size={12} className="ink-faint" /></button>
          <button onClick={onDelete} className="p-1 hover:bg-amber-50 rounded"><Trash2 size={12} className="ink-faint" /></button>
        </div>
      </div>
    </li>
  );
}

function ManualAddModal({ categories, onCancel, onSave }) {
  const [activity, setActivity] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(28, 22, 18, 0.4)' }}>
      <div className="paper border rule rounded-sm p-6 max-w-md w-full fade-up">
        <div className="flex justify-between items-baseline mb-4">
          <h3 className="f-display text-2xl">Add a past entry</h3>
          <button onClick={onCancel} className="ink-faint hover:text-stone-900"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs tracking-wide uppercase ink-faint block mb-1">Activity</label>
            <input
              type="text"
              value={activity}
              onChange={e => setActivity(e.target.value)}
              placeholder="What did you do?"
              className="input-paper w-full px-3 py-2 rounded-sm text-sm"
            />
          </div>
          <div>
            <label className="text-xs tracking-wide uppercase ink-faint block mb-1">Category</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="input-paper w-full px-3 py-2 rounded-sm text-sm"
            >
              {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs tracking-wide uppercase ink-faint block mb-1">From</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="input-paper w-full px-3 py-2 rounded-sm text-sm f-mono"
              />
            </div>
            <div>
              <label className="text-xs tracking-wide uppercase ink-faint block mb-1">To</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="input-paper w-full px-3 py-2 rounded-sm text-sm f-mono"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onCancel} className="btn-ghost px-4 py-2 rounded-sm text-sm uppercase tracking-wide">Cancel</button>
          <button
            onClick={() => onSave({ activity, categoryId, startTime, endTime })}
            className="btn-primary px-4 py-2 rounded-sm text-sm uppercase tracking-wide"
          >
            Log entry
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryManager({ categories, setCategories, onClose }) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#7c8b9c');
  const [newType, setNewType] = useState('focus');

  const colorOptions = ['#a16207','#475569','#7c8b9c','#4d7c0f','#78716c','#c2410c','#9d174d','#0e7490','#7c3aed','#b91c1c'];

  const addCategory = () => {
    if (!newName.trim()) return;
    setCategories([...categories, { id: uid(), name: newName.trim(), color: newColor, type: newType }]);
    setNewName('');
  };

  const removeCategory = (id) => setCategories(categories.filter(c => c.id !== id));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(28, 22, 18, 0.4)' }}>
      <div className="paper border rule rounded-sm p-6 max-w-md w-full fade-up max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-baseline mb-4">
          <h3 className="f-display text-2xl">Categories</h3>
          <button onClick={onClose} className="ink-faint hover:text-stone-900"><X size={18} /></button>
        </div>
        <ul className="space-y-2 mb-6">
          {categories.map(c => (
            <li key={c.id} className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full" style={{ background: c.color }}></span>
              <span className="flex-1">{c.name}</span>
              <span className="text-xs ink-faint uppercase tracking-wide">{c.type}</span>
              <button onClick={() => removeCategory(c.id)} className="p-1 hover:bg-amber-50 rounded">
                <Trash2 size={12} className="ink-faint" />
              </button>
            </li>
          ))}
        </ul>
        <div className="rule border-t pt-4">
          <p className="text-xs tracking-wide uppercase ink-faint mb-2">New category</p>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Name"
            className="input-paper w-full px-3 py-2 rounded-sm text-sm mb-2"
          />
          <div className="flex gap-1 mb-2 flex-wrap">
            {colorOptions.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="w-7 h-7 rounded-full"
                style={{ background: c, outline: newColor === c ? '2px solid #1c1612' : 'none', outlineOffset: 2 }}
              />
            ))}
          </div>
          <select
            value={newType}
            onChange={e => setNewType(e.target.value)}
            className="input-paper w-full px-3 py-2 rounded-sm text-sm mb-3"
          >
            <option value="focus">Focus work (counts toward focus share)</option>
            <option value="shallow">Shallow work</option>
            <option value="break">Break / Rest</option>
          </select>
          <button onClick={addCategory} className="btn-primary w-full px-4 py-2 rounded-sm text-sm uppercase tracking-wide">
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function WeekGlance({ dateIndex, viewDate, setViewDate }) {
  const days = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  const [totals, setTotals] = useState({});

  useEffect(() => {
    const t = {};
    for (const d of days) {
      const k = todayKey(d);
      if (dateIndex.includes(k)) {
        const ent = loadKey(STORAGE.entries(k), []);
        t[k] = ent.reduce((s, e) => s + e.duration, 0);
      } else {
        t[k] = 0;
      }
    }
    setTotals(t);
    // eslint-disable-next-line
  }, [dateIndex]);

  const max = Math.max(...Object.values(totals), 1);

  return (
    <section>
      <h3 className="text-xs tracking-widest uppercase ink-faint mb-3">Last 7 Days</h3>
      <div className="flex items-end gap-1.5 h-24">
        {days.map(d => {
          const k = todayKey(d);
          const ms = totals[k] || 0;
          const h = max > 0 ? (ms / max) * 100 : 0;
          const isSelected = k === todayKey(viewDate);
          const isCurrentDay = k === todayKey();
          return (
            <button
              key={k}
              onClick={() => setViewDate(new Date(d))}
              className="flex-1 flex flex-col items-center gap-1 group"
              title={`${d.toLocaleDateString(undefined, { weekday: 'long' })}: ${fmtDur(ms)}`}
            >
              <div className="flex-1 flex items-end w-full">
                <div
                  className="w-full rounded-sm transition-all group-hover:opacity-80"
                  style={{
                    height: `${Math.max(h, ms > 0 ? 4 : 0)}%`,
                    background: isSelected ? '#1c1612' : (ms > 0 ? '#a16207' : 'transparent'),
                    border: ms === 0 ? '1px dashed #d9cdb8' : 'none',
                    minHeight: ms === 0 ? '100%' : 0,
                  }}
                ></div>
              </div>
              <div className={`text-xs f-mono ${isSelected ? 'ink' : 'ink-faint'}`}>
                {d.toLocaleDateString(undefined, { weekday: 'narrow' })}
              </div>
              {isCurrentDay && <div className="w-1 h-1 rounded-full" style={{ background: '#a16207' }}></div>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
