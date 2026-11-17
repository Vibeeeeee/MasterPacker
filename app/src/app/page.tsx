'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/ui/Header';
import { LABEL_SIZES } from '@/lib/label-sizes';

const ITEM_SIZES = LABEL_SIZES.filter(s => s.kind === 'item');

const EXPORT_FORMATS = [
  { value: 'png', label: 'PNG (ZIP when multiple)' },
  { value: 'strip', label: 'Cut-line strip (PNG)' },
  { value: 'lemc', label: 'Epson label file (.lemc)' },
];

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tags, setTags] = useState([]);

  // Label creation
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [labelSize, setLabelSize] = useState('MP_ITEM_MM24');
  const [labelFormat, setLabelFormat] = useState('png');
  const [creatingLabels, setCreatingLabels] = useState(false);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items');
      if (!response.ok) throw new Error('Failed to fetch items');
      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      setError('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      if (!response.ok) throw new Error('Failed to fetch tags');
      const data = await response.json();
      setTags(data.tags || []);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  };

  useEffect(() => {
    (async () => {
      await fetchItems();
      await fetchTags();
    })();
  }, []);

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const filteredItems = items.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags = selectedTags.length === 0 ||
      item.tags.some((tag: any) => selectedTags.includes(tag.tag.id));
    return matchesSearch && matchesTags;
  });

  const pictureSrc = (item: any) => {
    const pic = (item.pictures || [])[0];
    if (!pic) return null;
    const base64 = typeof pic.data === 'string'
      ? pic.data
      : btoa(String.fromCharCode(...new Uint8Array(pic.data)));
    return `data:${pic.mimeType};base64,${base64}`;
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createLabels = async () => {
    if (selectedIds.size === 0) return;
    setCreatingLabels(true);
    try {
      const res = await fetch('/api/labels/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'item',
          ids: [...selectedIds],
          size: labelSize,
          format: labelFormat,
        }),
      });
      if (!res.ok) throw new Error('Failed to create labels');
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^";]+)"?/);
      const filename = match ? match[1] : 'labels.zip';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to create labels. Please try again.');
    } finally {
      setCreatingLabels(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(50rem 24rem at 20% 0%, var(--accent-soft), transparent 65%), radial-gradient(40rem 24rem at 90% 20%, var(--glow-secondary), transparent 65%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
          <p className="text-xs font-bold uppercase tracking-[0.25em] mb-3 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 20l6-13 3.5 7.5L15 11l6 9H3z" />
            </svg>
            Base camp · Inventory
          </p>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]" style={{ color: 'var(--ink-900)' }}>
            Ready for your
            <br />
            <span className="text-gradient">next journey?</span>
          </h1>
          <p className="mt-4 max-w-xl text-base sm:text-lg" style={{ color: 'var(--ink-500)' }}>
            Track your gear, organize boxes, and pack for trips — all in one place.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/items/new" className="btn btn-primary btn-lg">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Item
            </Link>
            <Link href="/trips" className="btn btn-secondary btn-lg">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8l-1-1H5a2 2 0 00-2 2zm9-12v4" />
              </svg>
              Plan a Trip
            </Link>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Label creation toolbar */}
        {selectedIds.size > 0 && (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center gap-2 px-4 py-3 rounded-2xl max-w-[calc(100vw-2rem)]"
            style={{
              background: 'var(--surface-glass-strong)',
              border: '1px solid var(--surface-border-strong)',
              boxShadow: 'var(--shadow-pop)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            <span className="text-sm font-bold whitespace-nowrap" style={{ color: 'var(--ink-900)' }}>
              {selectedIds.size} selected
            </span>
            <select
              value={labelSize}
              onChange={(e) => setLabelSize(e.target.value)}
              className="!w-auto !py-1.5 !text-xs"
              aria-label="Label size"
              title="Label size"
            >
              {ITEM_SIZES.map(s => (
                <option key={s.key} value={s.key}>{s.name}</option>
              ))}
            </select>
            <select
              value={labelFormat}
              onChange={(e) => setLabelFormat(e.target.value)}
              className="!w-auto !py-1.5 !text-xs"
              aria-label="Export format"
              title="Export format"
            >
              {EXPORT_FORMATS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <button onClick={createLabels} disabled={creatingLabels} className="btn btn-primary btn-sm">
              {creatingLabels ? 'Creating…' : 'Create labels'}
            </button>
            <Link href="/labels/editor" className="btn btn-secondary btn-sm">Edit layout</Link>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="btn btn-secondary btn-sm"
              aria-label="Clear selection"
            >
              Clear
            </button>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="card mb-8" style={{ padding: '1rem 1.25rem' }}>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1 search-pill">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5" style={{ color: 'var(--ink-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your gear..."
                className="pl-11"
              />
            </div>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {tags.map((tag: any) => {
                const active = selectedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className="chip"
                    style={active ? {
                      background: `linear-gradient(135deg, ${tag.color}, ${tag.color}cc)`,
                      color: '#fff',
                      borderColor: 'transparent',
                      boxShadow: `0 4px 14px ${tag.color}55`,
                    } : undefined}                  >
                    {tag.name}
                  </button>
                );
              })}
              {selectedTags.length > 0 && (
                <button onClick={() => setSelectedTags([])} className="chip">
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>

        {/* Section heading */}
        {!loading && !error && (
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-bold" style={{ color: 'var(--ink-900)' }}>
              Your Gear
              <span className="ml-2 text-sm font-medium" style={{ color: 'var(--ink-400)' }}>
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
              </span>
            </h2>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div
              className="inline-block animate-spin rounded-full h-10 w-10 border-[3px]"
              style={{ borderColor: 'var(--surface-border)', borderTopColor: 'var(--accent)' }}
            />
            <p className="mt-3 text-sm" style={{ color: 'var(--ink-500)' }}>Loading items...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="card text-center py-8" style={{ borderColor: 'rgba(239, 68, 68, 0.35)' }}>
            <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
            <button onClick={fetchItems} className="btn btn-secondary btn-sm mt-3">Retry</button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredItems.length === 0 && (
          <div className="card text-center py-16">
            <div
              className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4"
              style={{ background: 'var(--accent-soft)' }}
            >
              <svg className="w-8 h-8" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--ink-900)' }}>No items found</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-500)' }}>
              {searchQuery || selectedTags.length > 0
                ? 'Try adjusting your search or filters'
                : 'Start building your inventory'}
            </p>
            <Link href="/items/new" className="btn btn-primary mt-5">Add your first item</Link>
          </div>
        )}

        {/* Items Grid */}
        {!loading && !error && filteredItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredItems.map((item: any) => {
              const src = pictureSrc(item);
              return (
                <div key={item.id} className="relative">
                  {/* Selection checkbox — outside the card link so it doesn't navigate */}
                  <label
                    className="absolute top-[52px] right-3 z-20 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: 26, height: 26, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: selectedIds.has(item.id) ? 'linear-gradient(135deg, var(--accent), var(--accent-strong))' : 'rgba(2, 6, 23, 0.55)',
                      border: selectedIds.has(item.id) ? 'none' : '1.5px solid rgba(255,255,255,0.4)',
                      backdropFilter: 'blur(8px)',
                      boxShadow: selectedIds.has(item.id) ? '0 2px 10px var(--accent-glow)' : undefined,
                    }}
                    aria-label={`Select ${item.name} for labels`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelected(item.id)}
                      className="sr-only"
                    />
                    {selectedIds.has(item.id) && (
                      <svg className="w-4 h-4" style={{ color: 'var(--accent-contrast, #fff)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </label>
                <Link
                  href={`/items/${item.id}`}
                  className="card card-hover group overflow-hidden !p-0"
                >
                  <div className="relative h-44 overflow-hidden" style={{ background: 'var(--surface-glass-strong)' }}>
                    {src ? (
                      <img
                        src={src}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <svg className="w-12 h-12 opacity-30" style={{ color: 'var(--ink-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                    {/* Gradient overlay for photo cards */}
                    {src && (
                      <div
                        className="absolute inset-0"
                        style={{ background: 'linear-gradient(to top, rgba(2, 6, 23, 0.55), transparent 55%)' }}
                      />
                    )}
                    {/* Tags overlay */}
                    {item.tags.length > 0 && (
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        {item.tags.slice(0, 2).map((tag: any) => (
                          <span
                            key={tag.tag.id}
                            className="badge"
                            style={{
                              backgroundColor: 'rgba(2, 6, 23, 0.55)',
                              color: tag.tag.color,
                              backdropFilter: 'blur(8px)',
                            }}
                          >
                            {tag.tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold truncate" style={{ color: 'var(--ink-900)' }}>
                      {item.name}
                    </h3>
                    <p className="text-sm mt-1 line-clamp-1" style={{ color: 'var(--ink-500)' }}>
                      {item.description || 'No description'}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: 'var(--ink-400)' }}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        View details
                      </span>
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-0.5"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
