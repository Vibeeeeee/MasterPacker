'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/ui/Header';
import { useThemeContext } from '@/components/ThemeProvider';

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tags, setTags] = useState([]);
  const [showReorderOnly, setShowReorderOnly] = useState(false);
  const { resolvedTheme } = useThemeContext();

  useEffect(() => {
    fetchItems();
    fetchTags();
  }, [showReorderOnly]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/items', window.location.origin);
      url.searchParams.set('search', searchQuery);
      if (showReorderOnly) {
        url.searchParams.set('reorderOnly', 'true');
      }
      if (selectedTags.length > 0) {
        selectedTags.forEach(tagId => url.searchParams.append('tag', tagId));
      }

      const response = await fetch(url.toString());
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
      const response = await fetch('/api/tags?includeUsage=true');
      if (!response.ok) throw new Error('Failed to fetch tags');
      const data = await response.json();
      setTags(data.tags || []);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedTags, showReorderOnly]);

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold t-ink">Items</h1>
            <p className="mt-2 text-sm t-ink-3">
              Manage all your items with tags, attributes, and box assignments
            </p>
          </div>
          
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <Link
              href="/items/new"
              className="btn btn-primary btn-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Item
            </Link>
            
            <button
              onClick={() => setShowReorderOnly(!showReorderOnly)}
              className={`btn btn-sm ${showReorderOnly ? 'btn-success' : 'btn-secondary'}`}
            >
              {showReorderOnly ? (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Show All
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Reorder Only
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="panel rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 t-ink-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items by name or description..."
                className="block w-full pl-10 pr-3 py-2 rounded-md leading-5 t-ink placeholder-[color:var(--ink-400)]"
              />
            </div>
          </div>

          {/* Tag filters */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag: any) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`badge transition-all ${selectedTags.includes(tag.id) ? 'ring-2 ' : ''}`}
                  style={{
                    backgroundColor: selectedTags.includes(tag.id) 
                      ? tag.color + '40'
                      : tag.color + '20',
                    color: tag.color,
                  }}
                >
                  {tag.name} <span className="text-xs opacity-70">({tag.usageCount || 0})</span>
                </button>
              ))}
            </div>
            
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="mt-2 text-sm t-ink-3 link"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-[3px] [border-color:var(--surface-border-strong)] [border-top-color:var(--accent)]"></div>
            <p className="mt-2 t-ink-3">Loading items...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="alert-danger px-4 py-3 rounded-md text-sm">
            {error}
            <button
              onClick={fetchItems}
              className="ml-4 danger-link hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Items Grid (Mobile) / Table (Desktop) */}
        {!loading && !error && (
          <>
            {/* Mobile View */}
            <div className="md:hidden space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-8 panel rounded-lg border [border-color:var(--surface-border)]">
                  <p className="t-ink-3">No items found</p>
                  <Link
                    href="/items/new"
                    className="inline-block mt-4 btn btn-primary btn-sm"
                  >
                    Add your first item
                  </Link>
                </div>
              ) : (
                items.map((item: any) => (
                  <div key={item.id} className="card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-lg">
                          <Link
                            href={`/items/${item.id}`}
                            className="link"
                          >
                            {item.name}
                          </Link>
                        </h3>
                        {item.description && (
                          <p className="text-sm t-ink-3 mt-1">
                            {item.description}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.tags.slice(0, 3).map((tag: any) => (
                            <span
                              key={tag.tag.id}
                              className="badge badge-default"
                              style={{ backgroundColor: tag.tag.color + '20', color: tag.tag.color }}
                            >
                              {tag.tag.name}
                            </span>
                          ))}
                          {item.tags.length > 3 && (
                            <span className="badge badge-default">+{item.tags.length - 3}</span>
                          )}
                        </div>

                        {item.boxItems.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.boxItems.slice(0, 2).map((boxItem: any) => (
                              <Link
                                key={boxItem.boxId}
                                href={`/boxes/${boxItem.boxId}`}
                                className="badge badge-default"
                              >
                                {boxItem.box.name}
                              </Link>
                            ))}
                            {item.boxItems.length > 2 && (
                              <span className="badge badge-default">+{item.boxItems.length - 2} boxes</span>
                            )}
                          </div>
                        )}

                        {item.markForReorder && (
                          <span className="inline-block mt-2 badge [background:var(--accent-soft)] t-ink-2">
                            Marked for reorder
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Link
                          href={`/items/${item.id}`}
                          className="link"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <Link
                          href={`/items/${item.id}/edit`}
                          className="t-ink-3"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
              {items.length === 0 ? (
                <div className="text-center py-8 panel rounded-lg border [border-color:var(--surface-border)]">
                  <p className="t-ink-3">No items found</p>
                  {searchQuery || selectedTags.length > 0 ? (
                    <p className="text-sm t-ink-4 mt-1">
                      Try adjusting your search or filters
                    </p>
                  ) : (
                    <Link
                      href="/items/new"
                      className="inline-block mt-4 btn btn-primary btn-sm"
                    >
                      Add your first item
                    </Link>
                  )}
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Tags</th>
                        <th>Boxes</th>
                        <th className="text-center">Reorder</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item: any) => (
                        <tr key={item.id}>
                          <td className="font-medium">
                            <Link
                              href={`/items/${item.id}`}
                              className="link transition-colors"
                            >
                              {item.name}
                            </Link>
                          </td>
                          <td className="t-ink-3 max-w-xs truncate">
                            {item.description || '-'}
                          </td>
                          <td>
                            <div className="flex flex-wrap gap-1">
                              {item.tags.slice(0, 3).map((tag: any) => (
                                <span
                                  key={tag.tag.id}
                                  className="badge badge-default"
                                  style={{ backgroundColor: tag.tag.color + '20', color: tag.tag.color }}
                                >
                                  {tag.tag.name}
                                </span>
                              ))}
                              {item.tags.length > 3 && (
                                <span className="badge badge-default">+{item.tags.length - 3}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            {item.boxItems.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.boxItems.slice(0, 2).map((boxItem: any) => (
                                  <Link
                                    key={boxItem.boxId}
                                    href={`/boxes/${boxItem.boxId}`}
                                    className="badge badge-default"
                                  >
                                    {boxItem.box.name}
                                  </Link>
                                ))}
                                {item.boxItems.length > 2 && (
                                  <span className="badge badge-default">+{item.boxItems.length - 2}</span>
                                )}
                              </div>
                            ) : (
                              <span className="t-ink-4">-</span>
                            )}
                          </td>
                          <td className="text-center">
                            {item.markForReorder && (
                              <svg className="w-5 h-5 t-ink-3 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </td>
                          <td>
                            <div className="flex items-center justify-center space-x-2">
                              <Link
                                href={`/items/${item.id}`}
                                className="link link"
                                title="View"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </Link>
                              <Link
                                href={`/items/${item.id}/edit`}
                                className="t-ink-3"
                                title="Edit"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Mobile Navigation */}
      <div className="mobile-nav">
        <div className="flex justify-around">
          <Link
            href="/"
            className="flex flex-col items-center py-2 link"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs mt-1">Items</span>
          </Link>
          <Link
            href="/boxes"
            className="flex flex-col items-center py-2 t-ink-2 link"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="text-xs mt-1">Boxes</span>
          </Link>
          <Link
            href="/tags"
            className="flex flex-col items-center py-2 t-ink-2 link"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 8V7a4 4 0 014-4z" />
            </svg>
            <span className="text-xs mt-1">Tags</span>
          </Link>
          <Link
            href="/settings"
            className="flex flex-col items-center py-2 t-ink-2 link"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
            <span className="text-xs mt-1">Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
