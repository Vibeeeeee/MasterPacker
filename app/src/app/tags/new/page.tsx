'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/ui/Header';

export default function NewTagPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6e7c50');
  const [tagClassId, setTagClassId] = useState('');
  const [tagClasses, setTagClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTagClasses();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          color,
          tagClassId: tagClassId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create tag');
        return;
      }

      router.push(`/tags/${data.tag.id}`);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold t-ink">New Tag</h1>
          <p className="mt-2 text-sm t-ink-3">
            Create a new tag for organizing your items and boxes
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="alert-danger px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="card">
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium t-ink-2 mb-1">
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
                <label htmlFor="color" className="block text-sm font-medium t-ink-2 mb-1">
                  Color
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    id="color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-12 h-10 rounded-md"
                  />
                  <span className="t-ink-3">{color}</span>
                </div>
              </div>

              <div>
                <label htmlFor="tagClass" className="block text-sm font-medium t-ink-2 mb-1">
                  Tag Class (Optional)
                </label>
                <select
                  id="tagClass"
                  value={tagClassId}
                  onChange={(e) => setTagClassId(e.target.value)}
                  className="py-2 rounded-md t-ink"
                >
                  <option value="">No class</option>
                  {tagClasses.map((tc: any) => (
                    <option key={tc.id} value={tc.id} >
                      {tc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Link
              href="/tags"
              className="btn btn-secondary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !name}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Tag'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
