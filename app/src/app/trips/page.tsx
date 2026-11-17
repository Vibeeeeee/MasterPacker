'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/ui/Header';

const statusMeta: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planning', color: 'var(--status-planning)' },
  packing: { label: 'Packing', color: 'var(--status-packing)' },
  ready: { label: 'Ready to go', color: 'var(--status-ready)' },
  active: { label: 'On the trail', color: 'var(--status-active)' },
  completed: { label: 'Completed', color: 'var(--status-completed)' },
};

export default function TripsPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTrips = async () => {
    try {
      const response = await fetch('/api/trips');
      if (!response.ok) throw new Error('Failed to fetch trips');
      const data = await response.json();
      setTrips(data.trips || []);
    } catch (err) {
      setError('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await fetchTrips();
    })();
  }, []);

  const formatDate = (date: string) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen">
      <Header />

      <section className="topo-bg border-b" style={{ borderColor: 'var(--paper-200)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-xs font-bold uppercase tracking-[0.25em] mb-3" style={{ color: 'var(--forest-500)' }}>
            Expeditions
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight" style={{ color: 'var(--ink-900)' }}>
            Pack for a <span style={{ color: 'var(--forest-600)' }}>trip</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base" style={{ color: 'var(--ink-500)' }}>
            Pick the storage boxes to bring, drop items into boxes on the packing board, and track your progress.
          </p>
          <div className="mt-6">
            <Link href="/trips/new" className="btn btn-primary">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Trip
            </Link>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="text-center py-12">
            <div
              className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"
              style={{ borderColor: 'var(--forest-500)', borderTopColor: 'transparent' }}
            />
            <p className="mt-2 text-sm" style={{ color: 'var(--ink-500)' }}>Loading trips...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {!loading && !error && trips.length === 0 && (
          <div className="card text-center py-12">
            <p style={{ color: 'var(--ink-500)' }}>No trips yet</p>
            <Link href="/trips/new" className="inline-block mt-4 btn btn-primary btn-sm">
              Plan your first trip
            </Link>
          </div>
        )}

        {!loading && !error && trips.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trips.map((trip: any) => {
              const total = trip.tripItems.length;
              const packed = trip.tripItems.filter((ti: any) => ti.packedBoxId).length;
              const pct = total > 0 ? Math.round((packed / total) * 100) : 0;
              const meta = statusMeta[trip.status] || statusMeta.planning;
              return (
                <Link key={trip.id} href={`/trips/${trip.id}`} className="card hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-lg" style={{ color: 'var(--ink-900)' }}>
                        {trip.name}
                      </h3>
                      {trip.location && (
                        <p className="text-sm flex items-center gap-1 mt-0.5" style={{ color: 'var(--ink-500)' }}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {trip.location}
                        </p>
                      )}
                    </div>
                    <span className="badge shrink-0" style={{ backgroundColor: `color-mix(in srgb, ${meta.color} 13%, transparent)`, color: meta.color }}>
                      {meta.label}
                    </span>
                  </div>

                  {(trip.startDate || trip.endDate) && (
                    <p className="text-xs font-semibold mt-2" style={{ color: 'var(--ink-400)' }}>
                      {formatDate(trip.startDate)}
                      {trip.startDate && trip.endDate && ' → '}
                      {formatDate(trip.endDate)}
                    </p>
                  )}

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: 'var(--ink-500)' }}>
                      <span>{trip.tripBoxes.length} box{trip.tripBoxes.length === 1 ? '' : 'es'}</span>
                      <span>{packed}/{total} packed</span>
                    </div>
                    <div className="progress-track h-2 w-full">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
