'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/ui/Header';

export default function EditTagPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [tag, setTag] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      router.push(`/tags/${id}`);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Tag</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Edit tag: {tag.name}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Tag Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="input"
                  placeholder="Enter tag name"
                />
              </div>

              <div>
                <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    id="color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-12 h-10 rounded-md border border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-gray-600 dark:text-gray-400">{color}</span>
                </div>
              </div>

              <div>
                <label htmlFor="tagClass" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tag Class (Optional)
                </label>
                <select
                  id="tagClass"
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
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Link
              href={`/tags/${tag.id}`}
              className="btn btn-secondary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !name}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
