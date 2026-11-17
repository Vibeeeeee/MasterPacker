'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/ui/Header';

export default function TagsPage() {
  const [tags, setTags] = useState<any[]>([]);
  const [tagClasses, setTagClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<any>(null);
  const [mergeTagId, setMergeTagId] = useState('');

  useEffect(() => {
    fetchTags();
    fetchTagClasses();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/tags', window.location.origin);
      url.searchParams.set('includeUsage', 'true');
      url.searchParams.set('search', searchQuery);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch tags');
      const data = await response.json();
      setTags(data.tags || []);
    } catch (err) {
      setError('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const fetchTagClasses = async () => {
    try {
      const response = await fetch('/api/tag-classes');
      if (!response.ok) {
        // If endpoint doesn't exist, use default
        setTagClasses([{ id: 'default', name: 'Default', color: '#6e7c50' }]);
        return;
      }
      const data = await response.json();
      setTagClasses(data.tagClasses || []);
    } catch (err) {
      setTagClasses([{ id: 'default', name: 'Default', color: '#6e7c50' }]);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTags();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDeleteTag = (tag: any) => {
    setTagToDelete(tag);
    setMergeTagId('');
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!tagToDelete) return;

    try {
      const response = await fetch(`/api/tags/${tagToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mergeTagId }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to delete tag');
        return;
      }

      setShowDeleteModal(false);
      setTagToDelete(null);
      fetchTags();
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const filteredTags = tags.filter((tag: any) => {
    const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tag.tagClass?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = !selectedClass || tag.tagClassId === selectedClass;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold t-ink">Tags</h1>
            <p className="mt-2 text-sm t-ink-3">
              Manage all your tags and tag classes
            </p>
          </div>
          
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <Link
              href="/tags/new"
              className="btn btn-primary btn-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Tag
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
                placeholder="Search tags..."
                className="block w-full pl-10 pr-3 py-2 rounded-md leading-5 t-ink placeholder-[color:var(--ink-400)]"
              />
            </div>

            <div>
              <label htmlFor="tagClass" className="sr-only">
                Filter by class
              </label>
              <select
                id="tagClass"
                value={selectedClass || ''}
                onChange={(e) => setSelectedClass(e.target.value || null)}
                className="py-2 rounded-md t-ink"
              >
                <option value="">All Classes</option>
                {tagClasses.map((tc: any) => (
                  <option key={tc.id} value={tc.id} >
                    {tc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-[3px] [border-color:var(--surface-border-strong)] [border-top-color:var(--accent)]"></div>
            <p className="mt-2 t-ink-3">Loading tags...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="alert-danger px-4 py-3 rounded-md text-sm">
            {error}
            <button
              onClick={fetchTags}
              className="ml-4 danger-link hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Tags Table */}
        {!loading && !error && (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Usage</th>
                  <th>Color</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTags.map((tag: any) => (
                  <tr key={tag.id}>
                    <td className="font-medium">
                      <Link
                        href={`/tags/${tag.id}`}
                        className="link transition-colors"
                      >
                        {tag.name}
                      </Link>
                    </td>
                    <td>
                      {tag.tagClass ? (
                        <span
                          className="badge"
                          style={{ backgroundColor: tag.tagClass.color + '20', color: tag.tagClass.color }}
                        >
                          {tag.tagClass.name}
                        </span>
                      ) : (
                        <span className="t-ink-4">-</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-default">
                        {tag.usageCount || 0} {tag.usageCount === 1 ? 'item' : 'items'}
                      </span>
                    </td>
                    <td>
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/tags/${tag.id}/edit`}
                          className="t-ink-3"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleDeleteTag(tag)}
                          className="danger-link"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && filteredTags.length === 0 && (
          <div className="text-center py-8 panel rounded-lg border [border-color:var(--surface-border)]">
            <p className="t-ink-3">No tags found</p>
            <Link
              href="/tags/new"
              className="inline-block mt-4 btn btn-primary btn-sm"
            >
              Add your first tag
            </Link>
          </div>
        )}
      </main>

      {/* Delete Modal */}
      {showDeleteModal && tagToDelete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="text-lg font-semibold t-ink mb-4">
              Delete Tag
            </h3>
            
            <p className="t-ink-3 mb-4">
              Are you sure you want to delete the tag "{tagToDelete.name}"?
              {tagToDelete.usageCount > 0 && (
                <>
                  <br />
                  This tag is currently used on {tagToDelete.usageCount} {tagToDelete.usageCount === 1 ? 'item' : 'items'}.
                </>
              )}
            </p>

            {tagToDelete.usageCount > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium t-ink-2 mb-2">
                  Merge with another tag (optional)
                </label>
                <select
                  value={mergeTagId}
                  onChange={(e) => setMergeTagId(e.target.value)}
                  className="w-full py-2 rounded-md t-ink"
                >
                  <option value="">Don't merge (delete from all items)</option>
                  {tags.filter((t: any) => t.id !== tagToDelete.id).map((tag: any) => (
                    <option key={tag.id} value={tag.id} >
                      {tag.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTagToDelete(null);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="btn btn-danger"
              >
                Delete Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
