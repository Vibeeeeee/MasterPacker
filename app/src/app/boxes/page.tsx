'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/ui/Header';
import { LABEL_SIZES } from '@/lib/label-sizes';

const BOX_SIZES = LABEL_SIZES.filter(s => s.kind === 'box');

const EXPORT_FORMATS = [
  { value: 'png', label: 'PNG (ZIP when multiple)' },
  { value: 'strip', label: 'Cut-line strip (PNG)' },
  { value: 'lemc', label: 'Epson label file (.lemc)' },
];

export default function BoxesPage() {
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tags, setTags] = useState([]);
  const [expandedBoxes, setExpandedBoxes] = useState<Set<string>>(new Set());

  // Label creation
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [labelSize, setLabelSize] = useState('MP_BOX_MM24');
  const [labelFormat, setLabelFormat] = useState('png');
  const [creatingLabels, setCreatingLabels] = useState(false);

  useEffect(() => {
    fetchBoxes();
    fetchTags();
  }, []);

  const fetchBoxes = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/boxes', window.location.origin);
      url.searchParams.set('parentId', 'root');
      url.searchParams.set('search', searchQuery);
      if (selectedTags.length > 0) {
        selectedTags.forEach(tagId => url.searchParams.append('tag', tagId));
      }

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch boxes');
      const data = await response.json();
      setBoxes(data.boxes || []);
    } catch (err) {
      setError('Failed to load boxes');
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
      fetchBoxes();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedTags]);

  const toggleExpanded = (boxId: string) => {
    setExpandedBoxes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(boxId)) {
        newSet.delete(boxId);
      } else {
        newSet.add(boxId);
      }
      return newSet;
    });
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
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
          type: 'box',
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

  const renderBoxTree = (box: any, depth = 0) => (
    <div key={box.id} className={`ml-${depth * 4}`}>
      <div className="flex items-start">
        {box.childBoxes.length > 0 && (
          <button
            onClick={() => toggleExpanded(box.id)}
            className="mr-2 flex-shrink-0"
          >
            {expandedBoxes.has(box.id) ? (
              <svg className="w-5 h-5 t-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 t-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        )}
        
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <label
              className="flex items-center justify-center cursor-pointer shrink-0"
              style={{
                width: 22, height: 22, borderRadius: 6,
                background: selectedIds.has(box.id) ? 'linear-gradient(135deg, var(--accent), var(--accent-strong))' : 'var(--surface-glass-strong)',
                border: selectedIds.has(box.id) ? 'none' : '1.5px solid var(--surface-border-strong)',
                boxShadow: selectedIds.has(box.id) ? '0 2px 10px var(--accent-glow)' : undefined,
              }}
              aria-label={`Select ${box.name} for labels`}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(box.id)}
                onChange={() => toggleSelected(box.id)}
                className="sr-only"
              />
              {selectedIds.has(box.id) && (
                <svg className="w-3.5 h-3.5" style={{ color: 'var(--accent-contrast, #fff)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </label>
            <h3 className="font-medium text-lg">
              <Link
                href={`/boxes/${box.id}`}
                className="link"
              >
                {box.name}
              </Link>
            </h3>
            
            <div className="flex flex-wrap gap-1">
              {box.tags.slice(0, 2).map((tag: any) => (
                <span
                  key={tag.tag.id}
                  className="badge badge-default"
                  style={{ backgroundColor: tag.tag.color + '20', color: tag.tag.color }}
                >
                  {tag.tag.name}
                </span>
              ))}
              {box.tags.length > 2 && (
                <span className="badge badge-default">+{box.tags.length - 2}</span>
              )}
            </div>
          </div>
          
          {box.description && (
            <p className="text-sm t-ink-3 mt-1">
              {box.description}
            </p>
          )}
          
          <div className="text-sm t-ink-3 mt-1">
            {box.boxItems.length} items
            {box.childBoxes.length > 0 && `, ${box.childBoxes.length} sub-boxes`}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <Link
            href={`/boxes/${box.id}`}
            className="link"
            title="View"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </Link>
          <Link
            href={`/boxes/${box.id}/edit`}
            className="t-ink-3"
            title="Edit"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Link>
        </div>
      </div>
      
      {/* Child boxes */}
      {expandedBoxes.has(box.id) && box.childBoxes.length > 0 && (
        <div className="mt-2 border-l [border-color:var(--surface-border)] pl-4">
          {box.childBoxes.map((child: any) => renderBoxTree(child, depth + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              {BOX_SIZES.map(s => (
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

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold t-ink">Boxes</h1>
            <p className="mt-2 text-sm t-ink-3">
              Organize your items in nested boxes
            </p>
          </div>
          
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <Link
              href="/boxes/new"
              className="btn btn-primary btn-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Box
            </Link>
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
                placeholder="Search boxes..."
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
            <p className="mt-2 t-ink-3">Loading boxes...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="alert-danger px-4 py-3 rounded-md text-sm">
            {error}
            <button
              onClick={fetchBoxes}
              className="ml-4 danger-link hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Boxes Tree */}
        {!loading && !error && (
          <div className="panel rounded-lg border [border-color:var(--surface-border)] overflow-hidden">
            {boxes.length === 0 ? (
              <div className="text-center py-8">
                <p className="t-ink-3">No boxes found</p>
                <Link
                  href="/boxes/new"
                  className="inline-block mt-4 btn btn-primary btn-sm"
                >
                  Add your first box
                </Link>
              </div>
            ) : (
              <div className="p-4">
                {boxes.map((box: any) => renderBoxTree(box))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
