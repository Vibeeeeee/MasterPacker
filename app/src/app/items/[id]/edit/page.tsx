'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/ui/Header';

export default function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [markForReorder, setMarkForReorder] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  const [tags, setTags] = useState([]);
  const [attributes, setAttributes] = useState([]);

  useEffect(() => {
    Promise.all([params]).then(([p]) => {
      fetchItem(p.id);
      fetchTags();
      fetchAttributes();
    });
  }, []);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description || '');
      setMarkForReorder(item.markForReorder);
      setSelectedTagIds(item.tags.map((t: any) => t.tagId));
      
      const attrValues: Record<string, string> = {};
      item.attributes.forEach((attr: any) => {
        attrValues[attr.attributeId] = attr.value || '';
      });
      setAttributeValues(attrValues);
    }
  }, [item]);

  const fetchItem = async (id: string) => {
    try {
      const response = await fetch(`/api/items/${id}`);
      if (!response.ok) throw new Error('Failed to fetch item');
      const data = await response.json();
      setItem(data.item);
    } catch (err) {
      setError('Failed to load item');
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

  const fetchAttributes = async () => {
    try {
      const response = await fetch('/api/attributes');
      if (!response.ok) throw new Error('Failed to fetch attributes');
      const data = await response.json();
      setAttributes(data.attributes || []);
    } catch (err) {
      console.error('Failed to load attributes:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const id = (await params).id;
      const response = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          markForReorder,
          tagIds: selectedTagIds,
          attributeValues,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update item');
        return;
      }

      router.push(`/items/${id}`);
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

  const handleAttributeChange = (attributeId: string, value: string) => {
    setAttributeValues(prev => ({
      ...prev,
      [attributeId]: value,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading item...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
            {error}
            <button
              onClick={() => router.push('/items')}
              className="ml-4 text-red-600 dark:text-red-400 hover:underline"
            >
              Back to items
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Item not found</p>
            <Link
              href="/items"
              className="inline-block mt-4 btn btn-primary"
            >
              Back to items
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Item</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Edit item: {item.name}
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
                  placeholder="Enter item name"
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
                  placeholder="Enter item description"
                />
              </div>

              <div className="flex items-center">
                <input
                  id="markForReorder"
                  type="checkbox"
                  checked={markForReorder}
                  onChange={(e) => setMarkForReorder(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <label htmlFor="markForReorder" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Mark for reorder
                </label>
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

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Custom Attributes
            </h2>
            
            {attributes.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No custom attributes defined. <Link href="/settings" className="text-blue-600 dark:text-blue-400 hover:underline">Create attributes in settings</Link>.
              </p>
            ) : (
              <div className="space-y-4">
                {attributes.map((attr: any) => (
                  <div key={attr.id} className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {attr.name}
                      {attr.type === 'SELECT' && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          (Select one)
                        </span>
                      )}
                    </label>
                    
                    {attr.type === 'BOOLEAN' ? (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={attributeValues[attr.id] === 'true'}
                          onChange={(e) => handleAttributeChange(attr.id, e.target.checked ? 'true' : 'false')}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          {attributeValues[attr.id] === 'true' ? 'Yes' : 'No'}
                        </span>
                      </div>
                    ) : attr.type === 'SELECT' && attr.options ? (
                      <select
                        value={attributeValues[attr.id] || ''}
                        onChange={(e) => handleAttributeChange(attr.id, e.target.value)}
                        className="w-full py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select an option</option>
                        {attr.options.split(',').map((option: string) => (
                          <option key={option.trim()} value={option.trim()}>
                            {option.trim()}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={attr.type === 'NUMBER' ? 'number' : attr.type === 'DATE' ? 'date' : 'text'}
                        value={attributeValues[attr.id] || ''}
                        onChange={(e) => handleAttributeChange(attr.id, e.target.value)}
                        className="input"
                        placeholder={`Enter ${attr.name}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <Link
              href={`/items/${item.id}`}
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
