'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/ui/Header';

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tags, setTags] = useState([]);

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

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="topo-bg border-b" style={{ borderColor: 'var(--paper-200)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-xs font-bold uppercase tracking-[0.25em] mb-3" style={{ color: 'var(--forest-500)' }}>
            Base camp · Inventory
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight" style={{ color: 'var(--ink-900)' }}>
            Everything you own,
            <br />
            <span style={{ color: 'var(--forest-600)' }}>ready for the trail.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base" style={{ color: 'var(--ink-500)' }}>
            Track your gear, organize storage boxes, and pack for trips with a visual packing board.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/items/new" className="btn btn-primary">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Item
            </Link>
            <Link href="/trips" className="btn btn-accent">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8l-1-1H5a2 2 0 00-2 2zm9-12v4" />
              </svg>
              Plan a Trip
            </Link>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Bar */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="sr-only">Search</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5" style={{ color: 'var(--ink-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  id="search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your gear..."
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Tag filter chips */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {tags.map((tag: any) => {
                const active = selectedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className="badge transition-all"
                    style={{
                      backgroundColor: active ? tag.color : tag.color + '22',
                      color: active ? '#fff' : tag.color,
                      boxShadow: active ? `0 0 0 2px ${tag.color}` : 'none',
                    }}
                  >
                    {tag.name}
                  </button>
                );
              })}
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="badge badge-default"
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div
              className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"
              style={{ borderColor: 'var(--forest-500)', borderTopColor: 'transparent' }}
            />
            <p className="mt-2 text-sm" style={{ color: 'var(--ink-500)' }}>Loading items...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
            <button onClick={fetchItems} className="ml-4 underline">Retry</button>
          </div>
        )}

        {/* Items Grid */}
        {!loading && !error && filteredItems.length === 0 && (
          <div className="card text-center py-12">
            <p style={{ color: 'var(--ink-500)' }}>No items found</p>
            {searchQuery || selectedTags.length > 0 ? (
              <p className="text-sm mt-1" style={{ color: 'var(--ink-400)' }}>
                Try adjusting your search or filters
              </p>
            ) : (
              <Link href="/items/new" className="inline-block mt-4 btn btn-primary btn-sm">
                Add your first item
              </Link>
            )}
          </div>
        )}

        {!loading && !error && filteredItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item: any) => {
              const src = pictureSrc(item);
              return (
                <Link
                  key={item.id}
                  href={`/items/${item.id}`}
                  className="card group hover:shadow-md transition-all overflow-hidden !p-0"
                >
                  <div
                    className="h-40 w-full flex items-center justify-center"
                    style={{ background: 'var(--forest-100)' }}
                  >
                    {src ? (
                      <img src={src} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <svg className="w-10 h-10" style={{ color: 'var(--forest-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold truncate" style={{ color: 'var(--ink-900)' }}>
                      {item.name}
                    </h3>
                    <p className="text-sm mt-1 line-clamp-2 min-h-[2.5rem]" style={{ color: 'var(--ink-500)' }}>
                      {item.description || 'No description'}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {item.tags.slice(0, 3).map((tag: any) => (
                        <span
                          key={tag.tag.id}
                          className="badge"
                          style={{ backgroundColor: tag.tag.color + '22', color: tag.tag.color }}
                        >
                          {tag.tag.name}
                        </span>
                      ))}
                      {item.tags.length > 3 && (
                        <span className="badge badge-default">+{item.tags.length - 3}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
