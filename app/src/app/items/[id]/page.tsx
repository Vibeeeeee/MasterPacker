'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/ui/Header';

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [markForReorder, setMarkForReorder] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  const [tags, setTags] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [selectedBoxIds, setSelectedBoxIds] = useState<string[]>([]);
  const [pictures, setPictures] = useState([]);

  useEffect(() => {
    Promise.all([params]).then(([p]) => {
      fetchItem(p.id);
      fetchTags();
      fetchAttributes();
      fetchBoxes();
    });
  }, []);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description || '');
      setMarkForReorder(item.markForReorder);
      setSelectedTagIds(item.tags.map((t: any) => t.tagId));
      setSelectedBoxIds(item.boxItems.map((b: any) => b.boxId));
      setPictures(item.pictures || []);
      
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

  const fetchBoxes = async () => {
    try {
      const response = await fetch('/api/boxes?parentId=root');
      if (!response.ok) throw new Error('Failed to fetch boxes');
      const data = await response.json();
      setBoxes(data.boxes || []);
    } catch (err) {
      console.error('Failed to load boxes:', err);
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

  const toggleBox = (boxId: string) => {
    setSelectedBoxIds(prev =>
      prev.includes(boxId) ? prev.filter(id => id !== boxId) : [...prev, boxId]
    );
  };

  const handleSave = async () => {
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

      setItem(data.item);
      setEditMode(false);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }

    try {
      const id = (await params).id;
      const response = await fetch(`/api/items/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to delete item');
        return;
      }

      router.push('/');
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const id = (await params).id;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/items/${id}/pictures`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to upload picture');
        return;
      }

      const data = await response.json();
      fetchItem(id);
      e.target.value = '';
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handlePictureDelete = async (pictureId: string) => {
    if (!confirm('Are you sure you want to delete this picture?')) {
      return;
    }

    try {
      const id = (await params).id;
      const response = await fetch(`/api/items/${id}/pictures/${pictureId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to delete picture');
        return;
      }

      fetchItem(id);
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
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
            {error}
            <button
              onClick={() => router.push('/')}
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
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Item not found</p>
            <Link
              href="/"
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
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <div className="flex items-center space-x-2">
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
                  item.name
                )}
              </h1>
              {item.markForReorder && !editMode && (
                <span className="badge bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                  Marked for reorder
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Item ID: {item.id}
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
                    setName(item.name);
                    setDescription(item.description || '');
                    setMarkForReorder(item.markForReorder);
                    setSelectedTagIds(item.tags.map((t: any) => t.tagId));
                    setAttributeValues({});
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

        {/* Pictures */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Pictures
          </h2>
          
          {pictures.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {pictures.map((picture: any) => (
                <div key={picture.id} className="relative group">
                  <img
                    src={`data:${picture.mimeType};base64,${Buffer.from(picture.data).toString('base64')}`}
                    alt=""
                    className="w-full h-32 object-cover rounded-md"
                  />
                  {editMode && (
                    <button
                      onClick={() => handlePictureDelete(picture.id)}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No pictures</p>
          )}

          {editMode && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload Picture
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePictureUpload}
                className="block w-full text-sm text-gray-500 dark:text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 dark:file:bg-gray-700
                  file:text-blue-700 dark:file:text-gray-300
                  hover:file:bg-blue-100 dark:hover:file:bg-gray-600"
              />
            </div>
          )}
        </div>

        {/* Basic Information */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Basic Information
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              {editMode ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="input resize-none"
                />
              ) : (
                <p className="text-gray-900 dark:text-gray-100">
                  {item.description || 'No description'}
                </p>
              )}
            </div>

            <div className="flex items-center">
              {editMode ? (
                <>
                  <input
                    type="checkbox"
                    checked={markForReorder}
                    onChange={(e) => setMarkForReorder(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Mark for reorder
                  </label>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {item.markForReorder ? 'Marked for reorder' : 'Not marked for reorder'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Tags
          </h2>
          
          {editMode ? (
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
          ) : (
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag: any) => (
                <span
                  key={tag.tag.id}
                  className="badge"
                  style={{ backgroundColor: tag.tag.color + '20', color: tag.tag.color }}
                >
                  {tag.tag.name}
                </span>
              ))}
              {item.tags.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No tags</p>
              )}
            </div>
          )}
        </div>

        {/* Boxes */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Boxes
          </h2>
          
          {editMode ? (
            <div className="flex flex-wrap gap-2">
              {boxes.map((box: any) => (
                <button
                  key={box.id}
                  type="button"
                  onClick={() => toggleBox(box.id)}
                  className={`badge transition-all cursor-pointer ${selectedBoxIds.includes(box.id) ? 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/30' : ''}`}
                >
                  {box.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {item.boxItems.length > 0 ? (
                item.boxItems.map((boxItem: any) => (
                  <Link
                    key={boxItem.boxId}
                    href={`/boxes/${boxItem.boxId}`}
                    className="badge badge-default hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  >
                    {boxItem.box.name}
                    {boxItem.quantity > 1 && <span className="ml-1">×{boxItem.quantity}</span>}
                  </Link>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Not in any box</p>
              )}
            </div>
          )}
        </div>

        {/* Custom Attributes */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Custom Attributes
          </h2>
          
          {item.attributes.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No custom attributes</p>
          ) : (
            <div className="space-y-4">
              {item.attributes.map((attr: any) => (
                <div key={attr.attributeId} className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {attr.attribute.name}
                  </label>
                  
                  {editMode ? (
                    attr.attribute.type === 'BOOLEAN' ? (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={attributeValues[attr.attributeId] === 'true'}
                          onChange={(e) => handleAttributeChange(attr.attributeId, e.target.checked ? 'true' : 'false')}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          {attributeValues[attr.attributeId] === 'true' ? 'Yes' : 'No'}
                        </span>
                      </div>
                    ) : attr.attribute.type === 'SELECT' ? (
                      <select
                        value={attributeValues[attr.attributeId] || ''}
                        onChange={(e) => handleAttributeChange(attr.attributeId, e.target.value)}
                        className="w-full py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select an option</option>
                        {attr.attribute.options?.split(',').map((option: string) => (
                          <option key={option.trim()} value={option.trim()}>
                            {option.trim()}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={attr.attribute.type === 'NUMBER' ? 'number' : attr.attribute.type === 'DATE' ? 'date' : 'text'}
                        value={attributeValues[attr.attributeId] || ''}
                        onChange={(e) => handleAttributeChange(attr.attributeId, e.target.value)}
                        className="input"
                      />
                    )
                  ) : (
                    <p className="text-gray-900 dark:text-gray-100">
                      {attr.value || '-'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Metadata
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Created
              </label>
              <p className="text-gray-900 dark:text-gray-100">
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Updated
              </label>
              <p className="text-gray-900 dark:text-gray-100">
                {new Date(item.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
