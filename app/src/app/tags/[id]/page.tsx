'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/ui/Header';

export default function TagDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [tag, setTag] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#808080');
  const [tagClassId, setTagClassId] = useState('');
  const [tagClasses, setTagClasses] = useState([]);

  useEffect(() => {
    Promise.all([params]).then(([p]) => {
      fetchTag(p.id);
      fetchTagClasses();
    });
  }, []);

  useEffect(() => {
    if (tag) {
      setName(tag.name);
      setColor(tag.color);
      setTagClassId(tag.tagClassId || '');
    }
  }, [tag]);

  const fetchTag = async (id: string) => {
    try {
      const response = await fetch(`/api/tags/${id}`);
      if (!response.ok) throw new Error('Failed to fetch tag');
      const data = await response.json();
      setTag(data.tag);
    } catch (err) {
      setError('Failed to load tag');
    } finally {
      setLoading(false);
    }
  };

  const fetchTagClasses = async () => {
    try {
      const response = await fetch('/api/tag-classes');
      if (!response.ok) {
        setTagClasses([{ id: 'default', name: 'Default', color: '#808080' }]);
        return;
      }
      const data = await response.json();
      setTagClasses(data.tagClasses || []);
    } catch (err) {
      setTagClasses([{ id: 'default', name: 'Default', color: '#808080' }]);
    }
  };

  const handleSave = async () => {
    setError('');
    setLoading(true);

    try {
      const id = (await params).id;
      const response = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          color,
          tagClassId: tagClassId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update tag');
        return;
      }

      setTag(data.tag);
      setEditMode(false);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this tag?')) {
      return;
    }

    try {
      const id = (await params).id;
      const response = await fetch(`/api/tags/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mergeTagId: '' }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to delete tag');
        return;
      }

      router.push('/tags');
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading tag...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error && !tag) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
            {error}
            <button
              onClick={() => router.push('/tags')}
              className="ml-4 text-red-600 dark:text-red-400 hover:underline"
            >
              Back to tags
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Tag not found</p>
            <Link
              href="/tags"
              className="inline-block mt-4 btn btn-primary"
            >
              Back to tags
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {editMode ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-3xl font-bold bg-transparent border-none focus:ring-0 p-0"
                  autoFocus
                />
              ) : (
                tag.name
              )}
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Tag ID: {tag.id}
            </p>
          </div>
          
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            {editMode ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={loading || !name}
                  className="btn btn-success btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setName(tag.name);
                    setColor(tag.color);
                    setTagClassId(tag.tagClassId || '');
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditMode(true)}
                  className="btn btn-secondary btn-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="btn btn-danger btn-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm mb-6">
            {error}
          </div>
        )}

        {/* Tag Information */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Tag Information
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Color
              </label>
              {editMode ? (
                <div className="flex items-center space-x-4">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-12 h-10 rounded-md border border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-gray-600 dark:text-gray-400">{color}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <div
                    className="w-12 h-10 rounded-md"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-gray-600 dark:text-gray-400">{tag.color}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tag Class
              </label>
              {editMode ? (
                <select
                  value={tagClassId}
                  onChange={(e) => setTagClassId(e.target.value)}
                  className="py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No class</option>
                  {tagClasses.map((tc: any) => (
                    <option key={tc.id} value={tc.id} className="dark:bg-gray-800">
                      {tc.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-900 dark:text-gray-100">
                  {tag.tagClass ? tag.tagClass.name : 'No class'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Usage Information */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Usage
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Items with this tag
              </label>
              <p className="text-gray-900 dark:text-gray-100">
                {tag.itemTags?.length || 0}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Boxes with this tag
              </label>
              <p className="text-gray-900 dark:text-gray-100">
                {tag.boxTags?.length || 0}
              </p>
            </div>
          </div>

          {tag.itemTags?.length > 0 && (
            <>
              <h3 className="text-md font-medium text-gray-900 dark:text-white mt-6 mb-2">
                Items
              </h3>
              <div className="flex flex-wrap gap-2">
                {tag.itemTags.slice(0, 10).map((itemTag: any) => (
                  <Link
                    key={itemTag.itemId}
                    href={`/items/${itemTag.itemId}`}
                    className="badge badge-default"
                  >
                    {itemTag.item?.name || itemTag.itemId}
                  </Link>
                ))}
                {tag.itemTags.length > 10 && (
                  <span className="badge badge-default">+{tag.itemTags.length - 10} more</span>
                )}
              </div>
            </>
          )}

          {tag.boxTags?.length > 0 && (
            <>
              <h3 className="text-md font-medium text-gray-900 dark:text-white mt-6 mb-2">
                Boxes
              </h3>
              <div className="flex flex-wrap gap-2">
                {tag.boxTags.slice(0, 10).map((boxTag: any) => (
                  <Link
                    key={boxTag.boxId}
                    href={`/boxes/${boxTag.boxId}`}
                    className="badge badge-default"
                  >
                    {boxTag.box?.name || boxTag.boxId}
                  </Link>
                ))}
                {tag.boxTags.length > 10 && (
                  <span className="badge badge-default">+{tag.boxTags.length - 10} more</span>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
