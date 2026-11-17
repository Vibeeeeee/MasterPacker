'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/ui/Header';

const statusMeta: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planning', color: '#8a9282' },
  packing: { label: 'Packing', color: '#c89b5e' },
  ready: { label: 'Ready to go', color: '#3f6b4e' },
  active: { label: 'On the trail', color: '#2f8a4c' },
  completed: { label: 'Completed', color: '#66705e' },
};

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [tripId, setTripId] = useState('');
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverBoxId, setDragOverBoxId] = useState<string | null>(null);

  const [showAddBoxes, setShowAddBoxes] = useState(false);
  const [showAddItems, setShowAddItems] = useState(false);
  const [allBoxes, setAllBoxes] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [itemTagFilter, setItemTagFilter] = useState<string[]>([]);

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

  const openAddBoxes = async () => {
    setShowAddBoxes(true);
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

  const removeBoxFromTrip = async (tripBoxId: string) => {
    if (!confirm('Remove this box from the trip? Items packed in it return to the unpacked pool.')) return;
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
    setDragOverBoxId(null);
    const tripItemId = e.dataTransfer.getData('text/plain') || draggingId;
    if (!tripItemId) return;
    await assignItemToBox(tripItemId, boxId);
    setDraggingId(null);
  };

  const formatDate = (date: string) =>
    date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-8 text-center">
          <div
            className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"
            style={{ borderColor: 'var(--forest-500)', borderTopColor: 'transparent' }}
          />
          <p className="mt-2 text-sm" style={{ color: 'var(--ink-500)' }}>Loading trip...</p>
        </main>
      </div>
    );
  }

  if (error && !trip) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
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

  const itemChip = (tripItem: any, inBox: boolean) => {
    const item = tripItem.item;
    return (
      <div
        key={tripItem.id}
        draggable
        onDragStart={(e) => handleDragStart(e, tripItem.id)}
        onDragEnd={() => {
          setDraggingId(null);
          setDragOverBoxId(null);
        }}
        className={`drag-item group flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm font-medium shadow-sm ${draggingId === tripItem.id ? 'dragging' : ''}`}
        style={{
          background: inBox ? 'var(--forest-50)' : 'var(--paper-50)',
          borderColor: 'var(--paper-200)',
          color: 'var(--ink-900)',
        }}
      >
        <svg className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--forest-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 8V6a2 2 0 012-2h12a2 2 0 012 2v2M4 8v10a2 2 0 002 2h12a2 2 0 002-2V8m-4 4h.01M16 16h.01" />
        </svg>
        <Link href={`/items/${item.id}`} className="truncate hover:underline" style={{ maxWidth: 160 }}>
          {item.name}
        </Link>
        {tripItem.quantity > 1 && (
          <span className="text-xs font-bold" style={{ color: 'var(--sand-600)' }}>×{tripItem.quantity}</span>
        )}

        {/* Tap-to-move fallback */}
        <select
          value={tripItem.packedBoxId || ''}
          onChange={(e) => assignItemToBox(tripItem.id, e.target.value || null)}
          onClick={(e) => e.stopPropagation()}
          className="ml-auto !w-auto !py-0.5 !px-1 text-xs border-0 cursor-pointer"
          style={{ background: 'transparent', color: 'var(--ink-500)' }}
          aria-label={`Move ${item.name}`}
          tabIndex={-1}
        >
          <option value="">Unpacked</option>
          {trip.tripBoxes.map((tb: any) => (
            <option key={tb.boxId} value={tb.boxId}>{tb.box.name}</option>
          ))}
        </select>

        <button
          onClick={() => removeItemFromTrip(tripItem.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          style={{ color: 'var(--ink-400)' }}
          aria-label={`Remove ${item.name} from trip`}
          title="Remove from trip"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <Header />

      {/* Trip header */}
      <section className="topo-bg border-b" style={{ borderColor: 'var(--paper-200)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/trips" className="text-xs font-semibold inline-flex items-center gap-1 mb-3" style={{ color: 'var(--forest-600)' }}>
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
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Packing board */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--ink-900)' }}>
            Packing board
          </h2>
          <div className="flex gap-2">
            <button onClick={openAddBoxes} className="btn btn-secondary btn-sm">
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m10 0v6m-4-6v6M4 7a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
              </svg>
              Add storage box
            </button>
            <button onClick={openAddItems} className="btn btn-primary btn-sm">
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add items
            </button>
          </div>
        </div>

        {/* Unpacked pool */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverBoxId('pool');
          }}
          onDragLeave={() => setDragOverBoxId(null)}
          onDrop={(e) => handleDrop(e, null)}
          className={`board-row p-4 mb-4 ${dragOverBoxId === 'pool' ? 'drag-over' : ''}`}
          style={dragOverBoxId === 'pool' ? undefined : { borderStyle: 'dashed' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" style={{ color: 'var(--sand-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--ink-700)' }}>
                Unpacked pool
              </h3>
              <span className="badge badge-default">{unpacked.length}</span>
            </div>
            <span className="text-xs" style={{ color: 'var(--ink-400)' }}>
              Drag items into a box below
            </span>
          </div>
          {unpacked.length === 0 ? (
            <p className="text-sm py-2" style={{ color: 'var(--ink-400)' }}>
              {totalItems === 0 ? 'No items on this trip yet — click “Add items”.' : 'Everything is packed. Nice work! 🏔️'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {unpacked.map((ti: any) => itemChip(ti, false))}
            </div>
          )}
        </div>

        {/* Box rows */}
        {trip.tripBoxes.length === 0 && (
          <div className="card text-center py-10">
            <p style={{ color: 'var(--ink-500)' }}>No storage boxes on this trip yet</p>
            <button onClick={openAddBoxes} className="inline-block mt-4 btn btn-primary btn-sm">
              Add your first storage box
            </button>
          </div>
        )}

        <div className="space-y-4">
          {trip.tripBoxes.map((tripBox: any) => {
            const packed = trip.tripItems.filter((ti: any) => ti.packedBoxId === tripBox.boxId);
            const boxTotal = packed.length;
            const isDragOver = dragOverBoxId === tripBox.boxId;
            return (
              <div
                key={tripBox.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverBoxId(tripBox.boxId);
                }}
                onDragLeave={() => setDragOverBoxId(null)}
                onDrop={(e) => handleDrop(e, tripBox.boxId)}
                className={`board-row p-4 ${isDragOver ? 'drag-over' : ''}`}
              >
                {/* Row header — gantt-style label column */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--forest-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <Link href={`/boxes/${tripBox.boxId}`} className="font-bold truncate hover:underline" style={{ color: 'var(--ink-900)' }}>
                      {tripBox.box.name}
                    </Link>
                    <span className="badge badge-default shrink-0">{boxTotal} item{boxTotal === 1 ? '' : 's'}</span>
                  </div>

                  <div className="flex-1 flex items-center gap-3">
                    {/* Gantt-like track */}
                    <div className="progress-track h-2 flex-1">
                      <div
                        className="progress-fill"
                        style={{
                          width: totalItems > 0 ? `${Math.round((boxTotal / Math.max(totalItems, 1)) * 100)}%` : '0%',
                        }}
                      />
                    </div>
                    <button
                      onClick={() => removeBoxFromTrip(tripBox.id)}
                      className="text-xs font-semibold shrink-0 hover:underline"
                      style={{ color: 'var(--ink-400)' }}
                      title="Remove box from trip"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Items track */}
                {packed.length === 0 ? (
                  <p className="text-xs py-3 text-center rounded-lg" style={{ color: 'var(--ink-400)', background: 'var(--paper-100)' }}>
                    Drop items here to pack them in this box
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {packed.map((ti: any) => itemChip(ti, true))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Add boxes modal */}
      {showAddBoxes && (
        <div className="modal-overlay" onClick={() => setShowAddBoxes(false)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--ink-900)' }}>
              Add storage boxes to bring
            </h3>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {allBoxes
                .filter(b => !trip.tripBoxes.some((tb: any) => tb.boxId === b.id))
                .map(box => (
                  <button
                    key={box.id}
                    onClick={() => addBoxToTrip(box.id)}
                    className="w-full text-left px-3 py-2.5 rounded-lg border transition-colors hover:border-[var(--forest-500)]"
                    style={{ borderColor: 'var(--paper-200)', color: 'var(--ink-900)' }}
                  >
                    <span className="font-semibold">{box.name}</span>
                    {box.description && (
                      <span className="block text-xs truncate" style={{ color: 'var(--ink-500)' }}>{box.description}</span>
                    )}
                  </button>
                ))}
              {allBoxes.filter(b => !trip.tripBoxes.some((tb: any) => tb.boxId === b.id)).length === 0 && (
                <p className="text-sm" style={{ color: 'var(--ink-500)' }}>All boxes are already on this trip.</p>
              )}
            </div>
            <div className="mt-4 text-right">
              <button onClick={() => setShowAddBoxes(false)} className="btn btn-secondary btn-sm">Done</button>
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
                    className="badge"
                    style={{
                      backgroundColor: active ? tag.color : tag.color + '22',
                      color: active ? '#fff' : tag.color,
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
                    className="w-full text-left px-3 py-2.5 rounded-lg border transition-colors hover:border-[var(--forest-500)]"
                    style={{ borderColor: 'var(--paper-200)', color: 'var(--ink-900)' }}
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
