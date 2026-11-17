'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/ui/Header';

const statusMeta: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planning', color: '#94a3b8' },
  packing: { label: 'Packing', color: '#f97316' },
  ready: { label: 'Ready to go', color: '#22c55e' },
  active: { label: 'On the trail', color: '#14b8a6' },
  completed: { label: 'Completed', color: '#64748b' },
};

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [tripId, setTripId] = useState('');
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const [showAddStorage, setShowAddStorage] = useState(false);
  const [showAddItems, setShowAddItems] = useState(false);
  const [allBoxes, setAllBoxes] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [itemTagFilter, setItemTagFilter] = useState<string[]>([]);
  const [newStorageName, setNewStorageName] = useState('');

  const fetchTrip = async (id: string) => {
    try {
      const response = await fetch(`/api/trips/${id}`);
      if (!response.ok) throw new Error('Failed to fetch trip');
      const data = await response.json();
      setTrip(data.trip);
    } catch (err) {
      setError('Failed to load trip');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    params.then(p => {
      setTripId(p.id);
      fetchTrip(p.id);
    });
  }, []);

  const openAddStorage = async () => {
    setShowAddStorage(true);
    try {
      const response = await fetch('/api/boxes');
      const data = await response.json();
      setAllBoxes(data.boxes || []);
    } catch (err) {
      console.error('Failed to load boxes:', err);
    }
  };

  const openAddItems = async () => {
    setShowAddItems(true);
    try {
      const [itemsRes, tagsRes] = await Promise.all([
        fetch('/api/items'),
        fetch('/api/tags'),
      ]);
      const itemsData = await itemsRes.json();
      const tagsData = await tagsRes.json();
      setAllItems(itemsData.items || []);
      setAllTags(tagsData.tags || []);
    } catch (err) {
      console.error('Failed to load items:', err);
    }
  };

  const updateStatus = async (status: string) => {
    setTrip((prev: any) => ({ ...prev, status }));
    await fetch(`/api/trips/${tripId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  };

  const addBoxToTrip = async (boxId: string) => {
    await fetch(`/api/trips/${tripId}/boxes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boxId }),
    });
    await fetchTrip(tripId);
  };

  const createAndAddStorage = async () => {
    const name = newStorageName.trim();
    if (!name) return;
    try {
      const res = await fetch('/api/boxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        await addBoxToTrip(data.box.id);
        setNewStorageName('');
        await openAddStorage();
      }
    } catch (err) {
      console.error('Failed to create storage:', err);
    }
  };

  const removeBoxFromTrip = async (tripBoxId: string) => {
    if (!confirm('Remove this storage from the trip? Items packed in it return to the unpacked column.')) return;
    await fetch(`/api/trips/${tripId}/boxes/${tripBoxId}`, { method: 'DELETE' });
    await fetchTrip(tripId);
  };

  const addItemToTrip = async (itemId: string) => {
    await fetch(`/api/trips/${tripId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });
    await fetchTrip(tripId);
  };

  const removeItemFromTrip = async (tripItemId: string) => {
    await fetch(`/api/trips/${tripId}/items/${tripItemId}`, { method: 'DELETE' });
    await fetchTrip(tripId);
  };

  const assignItemToBox = async (tripItemId: string, boxId: string | null) => {
    // Optimistic update
    setTrip((prev: any) => ({
      ...prev,
      tripItems: prev.tripItems.map((ti: any) =>
        ti.id === tripItemId ? { ...ti, packedBoxId: boxId } : ti
      ),
    }));
    await fetch(`/api/trips/${tripId}/items/${tripItemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packedBoxId: boxId }),
    });
    await fetchTrip(tripId);
  };

  const handleDragStart = (e: React.DragEvent, tripItemId: string) => {
    setDraggingId(tripItemId);
    e.dataTransfer.setData('text/plain', tripItemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, boxId: string | null) => {
    e.preventDefault();
    const tripItemId = e.dataTransfer.getData('text/plain') || draggingId;
    setDragOverCol(null);
    setDraggingId(null);
    if (!tripItemId) return;
    // No-op if dropped in the column it's already in
    const current = trip.tripItems.find((ti: any) => ti.id === tripItemId);
    if (current && (current.packedBoxId || null) === boxId) return;
    await assignItemToBox(tripItemId, boxId);
  };

  const formatDate = (date: string) =>
    date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div
            className="inline-block animate-spin rounded-full h-10 w-10 border-[3px]"
            style={{ borderColor: 'var(--surface-border)', borderTopColor: 'var(--accent)' }}
          />
          <p className="mt-3 text-sm" style={{ color: 'var(--ink-500)' }}>Loading trip...</p>
        </main>
      </div>
    );
  }

  if (error && !trip) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.35)', color: 'var(--danger)' }}>
            {error}
            <Link href="/trips" className="ml-4 underline">Back to trips</Link>
          </div>
        </main>
      </div>
    );
  }

  const totalItems = trip?.tripItems?.length || 0;
  const packedItems = trip?.tripItems?.filter((ti: any) => ti.packedBoxId).length || 0;
  const pct = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;
  const meta = statusMeta[trip.status] || statusMeta.planning;
  const unpacked = trip.tripItems.filter((ti: any) => !ti.packedBoxId);
  const tripDays =
    trip.startDate && trip.endDate
      ? Math.max(1, Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000) + 1)
      : null;

  // Kanban card for a trip item
  const kanbanCard = (tripItem: any, packed: boolean) => {
    const item = tripItem.item;
    return (
      <div
        key={tripItem.id}
        draggable
        onDragStart={(e) => handleDragStart(e, tripItem.id)}
        onDragEnd={() => {
          setDraggingId(null);
          setDragOverCol(null);
        }}
        className={`drag-item group rounded-xl border p-3 transition-shadow hover:shadow-lg ${draggingId === tripItem.id ? 'dragging' : ''}`}
        style={{
          background: 'var(--surface-glass-strong)',
          borderColor: packed ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--surface-border)',
          boxShadow: packed ? '0 2px 10px var(--accent-glow)' : undefined,
          cursor: 'grab',
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <Link href={`/items/${item.id}`} className="text-sm font-semibold truncate hover:underline" style={{ color: 'var(--ink-900)' }}>
            {item.name}
          </Link>
          <button
            onClick={() => removeItemFromTrip(tripItem.id)}
            className="shrink-0 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/10 dark:hover:bg-white/10"
            style={{ color: 'var(--ink-400)' }}
            aria-label={`Remove ${item.name} from trip`}
            title="Remove from trip"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 mt-2">
          {tripItem.quantity > 1 ? (
            <span className="text-[10px] font-bold" style={{ color: 'var(--accent)' }}>×{tripItem.quantity}</span>
          ) : (
            <span className="text-[10px] font-semibold inline-flex items-center gap-1" style={{ color: 'var(--ink-400)' }}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 8V6a2 2 0 012-2h12a2 2 0 012 2v2M4 8v10a2 2 0 002 2h12a2 2 0 002-2V8" />
              </svg>
              Drag me
            </span>
          )}
          {/* Tap-to-move fallback (touch) */}
          <select
            value={tripItem.packedBoxId || ''}
            onChange={(e) => assignItemToBox(tripItem.id, e.target.value || null)}
            className="!w-auto !py-0.5 !px-1.5 !text-[10px]"
            aria-label={`Move ${item.name}`}
            title="Move to storage"
          >
            <option value="">Unpacked</option>
            {trip.tripBoxes.map((tb: any) => (
              <option key={tb.boxId} value={tb.boxId}>{tb.box.name}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  // A droppable kanban column
  const column = (
    colId: string | null,
    title: string,
    icon: React.ReactNode,
    cards: any[],
    emptyHint: string,
    headerExtra?: React.ReactNode
  ) => {
    const isDragOver = dragOverCol === (colId ?? 'unpacked');
    return (
      <div
        key={colId ?? 'unpacked'}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverCol(colId ?? 'unpacked');
        }}
        onDragLeave={() => setDragOverCol(null)}
        onDrop={(e) => handleDrop(e, colId)}
        className="w-[270px] shrink-0 flex flex-col rounded-2xl p-3 transition-colors"
        style={{
          background: isDragOver ? 'var(--accent-soft)' : 'var(--surface-glass)',
          border: `1px solid ${isDragOver ? 'var(--accent)' : 'var(--surface-border)'}`,
          boxShadow: isDragOver ? '0 0 0 3px var(--accent-soft)' : undefined,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {/* Column header */}
        <div className="flex items-center gap-2 px-1 pb-3 mb-1 border-b" style={{ borderColor: 'var(--surface-border)' }}>
          <span className="shrink-0" style={{ color: colId === null ? 'var(--ink-400)' : 'var(--accent)' }}>{icon}</span>
          <h3 className="text-sm font-bold truncate" style={{ color: 'var(--ink-900)' }}>{title}</h3>
          <span className="badge badge-default shrink-0 ml-auto">{cards.length}</span>
          {headerExtra}
        </div>
        {/* Cards */}
        <div className="flex-1 space-y-2 py-2 min-h-[80px]">
          {cards.length === 0 ? (
            <p className="text-xs text-center py-4 rounded-xl" style={{ color: 'var(--ink-400)', border: '1px dashed var(--surface-border)' }}>
              {emptyHint}
            </p>
          ) : (
            cards.map((ti: any) => kanbanCard(ti, colId !== null))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <Header />

      {/* Trip header */}
      <section className="relative border-b" style={{ borderColor: 'var(--surface-border)' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(40rem 16rem at 15% 0%, var(--accent-soft), transparent 65%)' }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/trips" className="text-xs font-semibold inline-flex items-center gap-1 mb-3" style={{ color: 'var(--accent)' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All trips
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--ink-900)' }}>
                  {trip.name}
                </h1>
                <span className="badge" style={{ backgroundColor: meta.color + '22', color: meta.color }}>
                  {meta.label}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm" style={{ color: 'var(--ink-500)' }}>
                {trip.location && (
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {trip.location}
                  </span>
                )}
                {(trip.startDate || trip.endDate) && (
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDate(trip.startDate)}
                    {trip.startDate && trip.endDate && ' → '}
                    {formatDate(trip.endDate)}
                    {tripDays && ` · ${tripDays} day${tripDays === 1 ? '' : 's'}`}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={trip.status}
                onChange={(e) => updateStatus(e.target.value)}
                className="!w-auto"
                aria-label="Trip status"
              >
                {Object.entries(statusMeta).map(([value, m]) => (
                  <option key={value} value={value}>{m.label}</option>
                ))}
              </select>
              <Link href={`/trips/${trip.id}/edit`} className="btn btn-secondary btn-sm">Edit</Link>
              <button
                onClick={async () => {
                  if (!confirm('Delete this trip? This cannot be undone.')) return;
                  await fetch(`/api/trips/${trip.id}`, { method: 'DELETE' });
                  router.push('/trips');
                }}
                className="btn btn-danger btn-sm"
              >
                Delete
              </button>
            </div>
          </div>

          {/* Overall progress */}
          <div className="mt-6 max-w-xl">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-500)' }}>
              <span>Packing progress</span>
              <span>{packedItems}/{totalItems} items packed · {pct}%</span>
            </div>
            <div className="progress-track h-2.5 w-full">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="card mb-6" style={{ borderColor: 'rgba(239, 68, 68, 0.35)', color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        {/* Board toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--ink-900)' }}>
              Packing board
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-400)' }}>
              Drag cards between columns — or use the dropdown on a card on touch.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={openAddStorage} className="btn btn-secondary btn-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m10 0v6m-4-6v6M4 7a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
              </svg>
              Add storage
            </button>
            <button onClick={openAddItems} className="btn btn-primary btn-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add items
            </button>
          </div>
        </div>

        {/* Kanban board */}
        <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-4 items-start min-h-[300px]">
            {/* Unpacked column — always first */}
            {column(
              null,
              'Unpacked',
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>,
              unpacked,
              totalItems === 0 ? 'No items yet — “Add items”' : 'Drop here to unpack'
            )}

            {/* Storage columns */}
            {trip.tripBoxes.map((tripBox: any) =>
              column(
                tripBox.boxId,
                tripBox.box.name,
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>,
                trip.tripItems.filter((ti: any) => ti.packedBoxId === tripBox.boxId),
                'Drop items here',
                <button
                  onClick={() => removeBoxFromTrip(tripBox.id)}
                  className="shrink-0 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                  style={{ color: 'var(--ink-400)' }}
                  aria-label={`Remove ${tripBox.box.name} from trip`}
                  title="Remove storage from trip"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )
            )}

            {/* + Add storage tile — at the far end of the scroll */}
            <button
              onClick={openAddStorage}
              className="w-[160px] shrink-0 min-h-[220px] rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors hover:border-[var(--accent)] group"
              style={{
                border: '2px dashed var(--surface-border-strong)',
                color: 'var(--ink-400)',
              }}
              aria-label="Add storage to this trip"
            >
              <span
                className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </span>
              <span className="text-xs font-bold" style={{ color: 'var(--ink-500)' }}>Add storage</span>
            </button>
          </div>
        </div>
      </main>

      {/* Add storage modal */}
      {showAddStorage && (
        <div className="modal-overlay" onClick={() => setShowAddStorage(false)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--ink-900)' }}>
              Add storage to this trip
            </h3>

            {/* Create new */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newStorageName}
                onChange={(e) => setNewStorageName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createAndAddStorage()}
                placeholder="New box or bag name…"
              />
              <button onClick={createAndAddStorage} disabled={!newStorageName.trim()} className="btn btn-primary btn-sm shrink-0">
                Create & add
              </button>
            </div>

            <p className="section-title mt-4">Existing storage</p>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {allBoxes
                .filter(b => !trip.tripBoxes.some((tb: any) => tb.boxId === b.id))
                .map(box => (
                  <button
                    key={box.id}
                    onClick={() => addBoxToTrip(box.id)}
                    className="w-full text-left px-3 py-2.5 rounded-xl border transition-colors hover:border-[var(--accent)]"
                    style={{ borderColor: 'var(--surface-border)', color: 'var(--ink-900)' }}
                  >
                    <span className="font-semibold">{box.name}</span>
                    {box.description && (
                      <span className="block text-xs truncate" style={{ color: 'var(--ink-500)' }}>{box.description}</span>
                    )}
                  </button>
                ))}
              {allBoxes.filter(b => !trip.tripBoxes.some((tb: any) => tb.boxId === b.id)).length === 0 && (
                <p className="text-sm" style={{ color: 'var(--ink-500)' }}>All of your storage is already on this trip.</p>
              )}
            </div>
            <div className="mt-4 text-right">
              <button onClick={() => setShowAddStorage(false)} className="btn btn-secondary btn-sm">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Add items modal */}
      {showAddItems && (
        <div className="modal-overlay" onClick={() => setShowAddItems(false)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--ink-900)' }}>
              Add items to this trip
            </h3>
            <input
              type="text"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="Search items..."
              className="mb-3"
            />
            <div className="flex flex-wrap gap-1.5 mb-3">
              {allTags.map((tag: any) => {
                const active = itemTagFilter.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() =>
                      setItemTagFilter(prev =>
                        prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                      )
                    }
                    className="chip !py-1 !px-3"
                    style={active ? {
                      background: `linear-gradient(135deg, ${tag.color}, ${tag.color}cc)`,
                      color: '#fff',
                      borderColor: 'transparent',
                    } : {
                      backgroundColor: tag.color + '22',
                      color: tag.color,
                      borderColor: 'transparent',
                    }}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {allItems
                .filter((item: any) => {
                  const inTrip = trip.tripItems.some((ti: any) => ti.itemId === item.id);
                  const matchesSearch = item.name.toLowerCase().includes(itemSearch.toLowerCase());
                  const matchesTags =
                    itemTagFilter.length === 0 ||
                    item.tags.some((t: any) => itemTagFilter.includes(t.tag.id));
                  return !inTrip && matchesSearch && matchesTags;
                })
                .map(item => (
                  <button
                    key={item.id}
                    onClick={() => addItemToTrip(item.id)}
                    className="w-full text-left px-3 py-2.5 rounded-xl border transition-colors hover:border-[var(--accent)]"
                    style={{ borderColor: 'var(--surface-border)', color: 'var(--ink-900)' }}
                  >
                    <span className="font-semibold">{item.name}</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.tags.slice(0, 4).map((t: any) => (
                        <span key={t.tag.id} className="badge" style={{ backgroundColor: t.tag.color + '22', color: t.tag.color }}>
                          {t.tag.name}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
            </div>
            <div className="mt-4 text-right">
              <button onClick={() => setShowAddItems(false)} className="btn btn-secondary btn-sm">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
