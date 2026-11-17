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
  const [color, setColor] = useState('#6e7c50');
  const [tagClassId, setTagClassId] = useState('');
  const [tagClasses, setTagClasses] = useState<any[]>([]);

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
      <div className="min-h-screen">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-[3px] [border-color:var(--surface-border-strong)] [border-top-color:var(--accent)]"></div>
            <p className="mt-2 t-ink-3">Loading tag...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error && !tag) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="alert-danger px-4 py-3 rounded-md text-sm">
            {error}
            <button
              onClick={() => router.push('/tags')}
              className="ml-4 danger-link hover:underline"
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
      <div className="min-h-screen">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8">
            <p className="t-ink-3">Tag not found</p>
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
    <div className="min-h-screen">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold t-ink">Edit Tag</h1>
          <p className="mt-2 text-sm t-ink-3">
            Edit tag: {tag.name}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="alert-danger px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="card">
            <h2 className="text-lg font-semibold t-ink mb-4">
              Tag Information
            </h2>
            
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
