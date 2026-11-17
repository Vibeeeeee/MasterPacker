'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/ui/Header';

function pictureSrc(picture: any) {
  if (!picture) return null;
  const base64 =
    typeof picture.data === 'string'
      ? picture.data
      : btoa(String.fromCharCode(...new Uint8Array(picture.data)));
  return `data:${picture.mimeType};base64,${base64}`;
}

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [relatedItems, setRelatedItems] = useState<any[]>([]);
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
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  useEffect(() => {
    params.then(p => {
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
      setRelatedItems(data.relatedItems || []);
    } catch (err) {
      setError('Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      const data = await response.json();
      setTags(data.tags || []);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  };

  const fetchAttributes = async () => {
    try {
      const response = await fetch('/api/attributes');
      const data = await response.json();
      setAttributes(data.attributes || []);
    } catch (err) {
      console.error('Failed to load attributes:', err);
    }
  };

  const fetchBoxes = async () => {
    try {
      const response = await fetch('/api/boxes?parentId=root');
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
    setAttributeValues(prev => ({ ...prev, [attributeId]: value }));
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
      const response = await fetch(`/api/items/${id}`, { method: 'DELETE' });
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
      fetchItem(id);
      e.target.value = '';
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handlePictureDelete = async (pictureId: string) => {
    if (!confirm('Are you sure you want to delete this picture?')) return;
    try {
      const id = (await params).id;
      const response = await fetch(`/api/items/${id}/pictures/${pictureId}`, { method: 'DELETE' });
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

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkUrl) return;
    const id = (await params).id;
    try {
      const response = await fetch(`/api/items/${id}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLinkLabel, url: newLinkUrl }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to add link');
        return;
      }
      setNewLinkLabel('');
      setNewLinkUrl('');
      fetchItem(id);
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    const id = (await params).id;
    try {
      await fetch(`/api/items/${id}/links/${linkId}`, { method: 'DELETE' });
      fetchItem(id);
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  if (loading && !item) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-8 text-center">
          <div
            className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"
            style={{ borderColor: 'var(--forest-500)', borderTopColor: 'transparent' }}
          />
          <p className="mt-2 text-sm" style={{ color: 'var(--ink-500)' }}>Loading item...</p>
        </main>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
            <Link href="/" className="ml-4 underline">Back to items</Link>
          </div>
        </main>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-8 text-center">
          <p style={{ color: 'var(--ink-500)' }}>Item not found</p>
          <Link href="/" className="inline-block mt-4 btn btn-primary btn-sm">Back to items</Link>
        </main>
      </div>
    );
  }

  const heroSrc = pictureSrc(item.pictures?.[0]);

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative border-b" style={{ borderColor: 'var(--paper-200)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-0 min-h-[280px]">
            <div className="flex flex-col justify-center py-10 md:pr-8">
              <Link href="/" className="text-xs font-semibold inline-flex items-center gap-1 mb-4" style={{ color: 'var(--forest-600)' }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Inventory
              </Link>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight break-words" style={{ color: 'var(--ink-900)' }}>
                {editMode ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-3xl font-bold"
                    autoFocus
                  />
                ) : (
                  item.name
                )}
              </h1>

              {item.markForReorder && !editMode && (
                <span className="badge mt-3 self-start" style={{ backgroundColor: 'var(--sand-200)', color: 'var(--sand-600)' }}>
                  Marked for reorder
                </span>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-4">
                {editMode ? (
                  tags.map((tag: any) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className="badge transition-all cursor-pointer"
                      style={{
                        backgroundColor: selectedTagIds.includes(tag.id) ? tag.color : tag.color + '22',
                        color: selectedTagIds.includes(tag.id) ? '#fff' : tag.color,
                      }}
                    >
                      {tag.name}
                    </button>
                  ))
                ) : (
                  item.tags.map((tag: any) => (
                    <Link
                      key={tag.tag.id}
                      href={`/?tag=${tag.tag.id}`}
                      className="badge"
                      style={{ backgroundColor: tag.tag.color + '22', color: tag.tag.color }}
                    >
                      {tag.tag.name}
                    </Link>
                  ))
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 mt-6">
                {editMode ? (
                  <>
                    <button onClick={handleSave} disabled={loading || !name} className="btn btn-success btn-sm disabled:opacity-50">
                      Save
                    </button>
                    <button onClick={() => setEditMode(false)} className="btn btn-secondary btn-sm">Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditMode(true)} className="btn btn-secondary btn-sm">
                      <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <a href={`/api/labels/item/${item.id}`} className="btn btn-secondary btn-sm" title="Download label with QR code">
                      <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m0 14v1m-8-8H3m18 0h-1M5.6 5.6l.7.7m12.1 12.1l.7.7m0-13.4l-.7.7M6.3 17.7l-.7.7M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Label
                    </a>
                    <button onClick={handleDelete} className="btn btn-danger btn-sm">
                      <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Hero picture */}
            <div className="relative md:border-l" style={{ borderColor: 'var(--paper-200)', background: 'var(--forest-100)' }}>
              {heroSrc ? (
                <img src={heroSrc} alt={item.name} className="w-full h-full max-h-[380px] object-cover" />
              ) : (
                <div className="w-full h-full min-h-[220px] flex items-center justify-center">
                  <svg className="w-16 h-16 opacity-50" style={{ color: 'var(--forest-600)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Gallery */}
        {item.pictures.length > 1 && (
          <div className="mb-6">
            <h2 className="section-title">Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {item.pictures.slice(1).map((picture: any) => (
                <div key={picture.id} className="relative group rounded-lg overflow-hidden">
                  <img src={pictureSrc(picture) || ''} alt="" className="w-full h-28 object-cover" />
                  {editMode && (
                    <button
                      onClick={() => handlePictureDelete(picture.id)}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {editMode && (
          <div className="card mb-6">
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--ink-700)' }}>
              Upload picture
            </label>
            <input type="file" accept="image/*" onChange={handlePictureUpload} className="block w-full text-sm" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="card">
              <h2 className="section-title">Description</h2>
              {editMode ? (
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              ) : (
                <p className="whitespace-pre-wrap" style={{ color: 'var(--ink-700)' }}>
                  {item.description || 'No description yet.'}
                </p>
              )}
            </div>

            {/* Attributes */}
            <div className="card">
              <h2 className="section-title">Specs & attributes</h2>
              {item.attributes.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--ink-400)' }}>No attributes yet — add some in edit mode.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {item.attributes.map((attr: any) => (
                    <div key={attr.attributeId} className="rounded-lg border p-3" style={{ borderColor: 'var(--paper-200)' }}>
                      <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--ink-400)' }}>
                        {attr.attribute.name}
                      </p>
                      {editMode ? (
                        attr.attribute.type === 'BOOLEAN' ? (
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={attributeValues[attr.attributeId] === 'true'}
                              onChange={(e) => handleAttributeChange(attr.attributeId, e.target.checked ? 'true' : 'false')}
                            />
                            <span className="ml-2 text-sm" style={{ color: 'var(--ink-700)' }}>
                              {attributeValues[attr.attributeId] === 'true' ? 'Yes' : 'No'}
                            </span>
                          </div>
                        ) : attr.attribute.type === 'SELECT' ? (
                          <select
                            value={attributeValues[attr.attributeId] || ''}
                            onChange={(e) => handleAttributeChange(attr.attributeId, e.target.value)}
                          >
                            <option value="">Select an option</option>
                            {attr.attribute.options?.split(',').map((option: string) => (
                              <option key={option.trim()} value={option.trim()}>{option.trim()}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={attr.attribute.type === 'NUMBER' ? 'number' : attr.attribute.type === 'DATE' ? 'date' : 'text'}
                            value={attributeValues[attr.attributeId] || ''}
                            onChange={(e) => handleAttributeChange(attr.attributeId, e.target.value)}
                          />
                        )
                      ) : (
                        <p className="font-semibold" style={{ color: 'var(--ink-900)' }}>
                          {attr.attribute.type === 'BOOLEAN'
                            ? attr.value === 'true' ? 'Yes' : 'No'
                            : attr.value || '—'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Links */}
            <div className="card">
              <h2 className="section-title">Links & resources</h2>
              {item.links?.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {item.links.map((link: any) => (
                    <div key={link.id} className="flex items-center gap-2 group">
                      <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--forest-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5m8.156-8.156l1.5-1.5a4 4 0 015.656 5.656l-3 3a4 4 0 01-5.656 0z" />
                      </svg>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium truncate hover:underline"
                        style={{ color: 'var(--forest-600)' }}
                      >
                        {link.label}
                      </a>
                      <span className="text-xs truncate flex-1" style={{ color: 'var(--ink-400)' }}>{link.url}</span>
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        style={{ color: 'var(--ink-400)' }}
                        aria-label="Delete link"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm mb-4" style={{ color: 'var(--ink-400)' }}>No links yet — add manuals, purchase pages, or guides.</p>
              )}

              <form onSubmit={handleAddLink} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  placeholder="Label (e.g. User manual)"
                  className="sm:w-48"
                />
                <input
                  type="url"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1"
                  required
                />
                <button type="submit" className="btn btn-primary btn-sm">Add link</button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Storage location */}
            <div className="card">
              <h2 className="section-title">Stored in</h2>
              {editMode ? (
                <div className="flex flex-wrap gap-2">
                  {boxes.map((box: any) => (
                    <button
                      key={box.id}
                      type="button"
                      onClick={() => toggleBox(box.id)}
                      className={`badge transition-all cursor-pointer ${selectedBoxIds.includes(box.id) ? 'ring-2' : ''}`}
                      style={{ backgroundColor: 'var(--forest-100)', color: 'var(--forest-800)' }}
                    >
                      {box.name}
                    </button>
                  ))}
                </div>
              ) : item.boxItems.length > 0 ? (
                <div className="space-y-2">
                  {item.boxItems.map((boxItem: any) => (
                    <Link
                      key={boxItem.boxId}
                      href={`/boxes/${boxItem.boxId}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:border-[var(--forest-500)]"
                      style={{ borderColor: 'var(--paper-200)', color: 'var(--ink-900)' }}
                    >
                      <svg className="w-4 h-4" style={{ color: 'var(--forest-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="font-semibold truncate">{boxItem.box.name}</span>
                      {boxItem.quantity > 1 && (
                        <span className="text-xs font-bold ml-auto" style={{ color: 'var(--sand-600)' }}>×{boxItem.quantity}</span>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--ink-400)' }}>Not in any box</p>
              )}
            </div>

            {/* Metadata */}
            <div className="card">
              <h2 className="section-title">Details</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt style={{ color: 'var(--ink-500)' }}>Created</dt>
                  <dd className="font-medium" style={{ color: 'var(--ink-900)' }}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt style={{ color: 'var(--ink-500)' }}>Updated</dt>
                  <dd className="font-medium" style={{ color: 'var(--ink-900)' }}>
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt style={{ color: 'var(--ink-500)' }}>Item ID</dt>
                  <dd className="font-mono text-xs truncate max-w-[160px]" style={{ color: 'var(--ink-400)' }}>
                    {item.id}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Related items */}
        {!editMode && relatedItems.length > 0 && (
          <div className="mt-8">
            <h2 className="section-title">Goes well with</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {relatedItems.map((rel: any) => {
                const src = pictureSrc(rel.pictures?.[0]);
                return (
                  <Link key={rel.id} href={`/items/${rel.id}`} className="card !p-0 overflow-hidden hover:shadow-md transition-all">
                    <div className="h-24 w-full flex items-center justify-center" style={{ background: 'var(--forest-100)' }}>
                      {src ? (
                        <img src={src} alt={rel.name} className="h-full w-full object-cover" />
                      ) : (
                        <svg className="w-7 h-7" style={{ color: 'var(--forest-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs font-semibold truncate px-2 py-2" style={{ color: 'var(--ink-900)' }}>
                      {rel.name}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
