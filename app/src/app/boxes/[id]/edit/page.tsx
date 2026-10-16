'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/ui/Header';

export default function EditBoxPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [box, setBox] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentBoxId, setParentBoxId] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [allBoxes, setAllBoxes] = useState([]);
  const [tags, setTags] = useState([]);

  useEffect(() => {
    Promise.all([params]).then(([p]) => {
      fetchBox(p.id);
      fetchBoxes();
      fetchTags();
    });
  }, []);

  useEffect(() => {
    if (box) {
      setName(box.name);
      setDescription(box.description || '');
      setParentBoxId(box.parentBoxId || '');
      setSelectedTagIds(box.tags.map((t: any) => t.tagId));
    }
  }, [box]);

  const fetchBox = async (id: string) => {
    try {
      const response = await fetch(`/api/boxes/${id}`);
      if (!response.ok) throw new Error('Failed to fetch box');
      const data = await response.json();
      setBox(data.box);
    } catch (err) {
      setError('Failed to load box');
    } finally {
      setLoading(false);
    }
  };

  const fetchBoxes = async () => {
    try {
      const response = await fetch('/api/boxes?parentId=root');
      if (!response.ok) throw new Error('Failed to fetch boxes');
      const data = await response.json();
      setAllBoxes(data.boxes || []);
    } catch (err) {
      console.error('Failed to load boxes:', err);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const id = (await params).id;
      const response = await fetch(`/api/boxes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          parentBoxId: parentBoxId || null,
          tagIds: selectedTagIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update box');
        return;
      }

      router.push(`/boxes/${id}`);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading box...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error && !box) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
            {error}
            <button
              onClick={() => router.push('/boxes')}
              className="ml-4 text-red-600 dark:text-red-400 hover:underline"
            >
              Back to boxes
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!box) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Box not found</p>
            <Link
              href="/boxes"
              className="inline-block mt-4 btn btn-primary"
            >
              Back to boxes
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Box</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Edit box: {box.name}
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
              Basic Information
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
                  placeholder="Enter box name"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="input resize-none"
                  placeholder="Enter box description"
                />
              </div>

              <div>
                <label htmlFor="parentBox" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Parent Box (Optional)
                </label>
                <select
                  id="parentBox"
                  value={parentBoxId}
                  onChange={(e) => setParentBoxId(e.target.value)}
                  className="py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No parent (root level)</option>
                  {allBoxes.filter((b: any) => b.id !== box.id).map((boxItem: any) => (
                    <option key={boxItem.id} value={boxItem.id} className="dark:bg-gray-800">
                      {boxItem.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Tags
            </h2>
            
            <div className="flex flex-wrap gap-2">
              {tags.map((tag: any) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`badge transition-all cursor-pointer ${selectedTagIds.includes(tag.id) ? 'ring-2 ring-blue-500' : ''}`}
                  style={{
                    backgroundColor: selectedTagIds.includes(tag.id) 
                      ? tag.color + '40'
                      : tag.color + '20',
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
            
            {tags.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                No tags available. <Link href="/tags" className="text-blue-600 dark:text-blue-400 hover:underline">Create tags first</Link>.
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <Link
              href={`/boxes/${box.id}`}
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
