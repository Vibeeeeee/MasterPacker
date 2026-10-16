'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/ui/Header';

export default function BoxDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [box, setBox] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentBoxId, setParentBoxId] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [allBoxes, setAllBoxes] = useState([]);
  const [tags, setTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableItems, setAvailableItems] = useState([]);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([params]).then(([p]) => {
      fetchBox(p.id);
      fetchBoxes();
      fetchTags();
      fetchAvailableItems();
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

  const fetchAvailableItems = async () => {
    try {
      const response = await fetch('/api/items');
      if (!response.ok) throw new Error('Failed to fetch items');
      const data = await response.json();
      setAvailableItems(data.items || []);
    } catch (err) {
      console.error('Failed to load items:', err);
    }
  };

  const handleSave = async () => {
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

      setBox(data.box);
      setEditMode(false);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this box? All items in this box will need to be moved first.')) {
      return;
    }

    try {
      const id = (await params).id;
      const response = await fetch(`/api/boxes/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to delete box');
        return;
      }

      router.push('/boxes');
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

      const response = await fetch(`/api/boxes/${id}/pictures`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to upload picture');
        return;
      }

      fetchBox(id);
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
      const response = await fetch(`/api/boxes/${id}/pictures/${pictureId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to delete picture');
        return;
      }

      fetchBox(id);
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleAddItems = async () => {
    if (selectedItemIds.length === 0) return;

    try {
      const id = (await params).id;
      for (const itemId of selectedItemIds) {
        await fetch(`/api/boxes/${id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId, quantity: 1 }),
        });
      }

      setShowAddItemModal(false);
      setSelectedItemIds([]);
      fetchBox(id);
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const id = (await params).id;
      const response = await fetch(`/api/boxes/${id}/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to remove item');
        return;
      }

      fetchBox(id);
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const filteredItems = availableItems.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    // Don't show items already in this box
    const notInBox = !box?.boxItems?.some((bi: any) => bi.itemId === item.id);
    return matchesSearch && notInBox;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  box.name
                )}
              </h1>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Box ID: {box.id}
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
                    setName(box.name);
                    setDescription(box.description || '');
                    setParentBoxId(box.parentBoxId || '');
                    setSelectedTagIds(box.tags.map((t: any) => t.tagId));
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
          
          {box.pictures?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {box.pictures.map((picture: any) => (
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
                  {box.description || 'No description'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Parent Box
              </label>
              {editMode ? (
                <select
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
              ) : (
                <p className="text-gray-900 dark:text-gray-100">
                  {box.parentBox ? (
                    <Link
                      href={`/boxes/${box.parentBox.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {box.parentBox.name}
                    </Link>
                  ) : (
                    'No parent (root level)'
                  )}
                </p>
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
              {box.tags.map((tag: any) => (
                <span
                  key={tag.tag.id}
                  className="badge"
                  style={{ backgroundColor: tag.tag.color + '20', color: tag.tag.color }}
                >
                  {tag.tag.name}
                </span>
              ))}
              {box.tags.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No tags</p>
              )}
            </div>
          )}
        </div>

        {/* Items in Box */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Items in this Box
            </h2>
            {!editMode && (
              <button
                onClick={() => setShowAddItemModal(true)}
                className="btn btn-primary btn-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Items
              </button>
            )}
          </div>
          
          {box.boxItems?.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No items in this box
            </p>
          ) : (
            <>
              {/* Search for items in box */}
              <div className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items in this box..."
                  className="input"
                />
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Tags</th>
                      <th>Quantity</th>
                      {editMode && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {box.boxItems
                      .filter((bi: any) => {
                        const item = bi.item;
                        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
                        return matchesSearch;
                      })
                      .map((boxItem: any) => (
                        <tr key={boxItem.id}>
                          <td className="font-medium">
                            <Link
                              href={`/items/${boxItem.itemId}`}
                              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              {boxItem.item?.name || boxItem.itemId}
                            </Link>
                          </td>
                          <td className="text-gray-600 dark:text-gray-400 max-w-xs truncate">
                            {boxItem.item?.description || '-'}
                          </td>
                          <td>
                            <div className="flex flex-wrap gap-1">
                              {boxItem.item?.tags?.slice(0, 2).map((tag: any) => (
                                <span
                                  key={tag.tagId}
                                  className="badge badge-default"
                                  style={{ backgroundColor: tag.tag.color + '20', color: tag.tag.color }}
                                >
                                  {tag.tag.name}
                                </span>
                              ))}
                              {boxItem.item?.tags?.length > 2 && (
                                <span className="badge badge-default">+{boxItem.item.tags.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            {boxItem.quantity}
                          </td>
                          {editMode && (
                            <td>
                              <button
                                onClick={() => handleRemoveItem(boxItem.itemId)}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Child Boxes */}
        {box.childBoxes?.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Child Boxes
            </h2>
            
            <div className="flex flex-wrap gap-2">
              {box.childBoxes.map((child: any) => (
                <Link
                  key={child.id}
                  href={`/boxes/${child.id}`}
                  className="badge badge-default hover:bg-blue-100 dark:hover:bg-blue-900/30"
                >
                  {child.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="card mt-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Metadata
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Created
              </label>
              <p className="text-gray-900 dark:text-gray-100">
                {new Date(box.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Updated
              </label>
              <p className="text-gray-900 dark:text-gray-100">
                {new Date(box.updatedAt).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total Items
              </label>
              <p className="text-gray-900 dark:text-gray-100">
                {box.boxItems?.reduce((sum: number, bi: any) => sum + bi.quantity, 0) || 0}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Child Boxes
              </label>
              <p className="text-gray-900 dark:text-gray-100">
                {box.childBoxes?.length || 0}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Add Items Modal */}
      {showAddItemModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add Items to Box
              </h3>
              <button
                onClick={() => {
                  setShowAddItemModal(false);
                  setSelectedItemIds([]);
                  setSearchQuery('');
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                className="input"
              />
            </div>

            {filteredItems.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
                No items available to add
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {filteredItems.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedItemIds(prev =>
                        prev.includes(item.id) 
                          ? prev.filter(id => id !== item.id)
                          : [...prev, item.id]
                      );
                    }}
                    className={`p-3 border border-gray-200 dark:border-gray-700 rounded-md mb-2 cursor-pointer transition-all ${
                      selectedItemIds.includes(item.id) 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedItemIds.includes(item.id)}
                        onChange={() => {}}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags?.slice(0, 3).map((tag: any) => (
                            <span
                              key={tag.tagId}
                              className="badge badge-default text-xs"
                              style={{ backgroundColor: tag.tag.color + '20', color: tag.tag.color }}
                            >
                              {tag.tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowAddItemModal(false);
                  setSelectedItemIds([]);
                  setSearchQuery('');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItems}
                disabled={selectedItemIds.length === 0}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add {selectedItemIds.length} Item{selectedItemIds.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
