'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/ui/Header';

export default function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [tripId, setTripId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    params.then(async p => {
      setTripId(p.id);
      try {
        const response = await fetch(`/api/trips/${p.id}`);
        const data = await response.json();
        if (data.trip) {
          setName(data.trip.name);
          setDescription(data.trip.description || '');
          setLocation(data.trip.location || '');
          setStartDate(data.trip.startDate ? data.trip.startDate.slice(0, 10) : '');
          setEndDate(data.trip.endDate ? data.trip.endDate.slice(0, 10) : '');
        }
      } catch (err) {
        setError('Failed to load trip');
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          location,
          startDate: startDate || null,
          endDate: endDate || null,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to update trip');
        return;
      }
      router.push(`/trips/${tripId}`);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href={`/trips/${tripId}`} className="text-sm font-semibold inline-flex items-center gap-1 mb-4" style={{ color: 'var(--forest-600)' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to trip
        </Link>

        <h1 className="text-3xl font-extrabold tracking-tight mb-6" style={{ color: 'var(--ink-900)' }}>
          Edit trip
        </h1>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--ink-700)' }}>Trip name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--ink-700)' }}>Location</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--ink-700)' }}>Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--ink-700)' }}>End date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--ink-700)' }}>Notes</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving || !name} className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <button type="button" onClick={() => router.push(`/trips/${tripId}`)} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
