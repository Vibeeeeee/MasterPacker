'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/ui/Header';
import { useThemeContext } from '@/components/ThemeProvider';

export default function SettingsPage() {
  const { theme, setThemePreference, resolvedTheme } = useThemeContext();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [autoSnapshotInterval, setAutoSnapshotInterval] = useState(24);
  const [maxSnapshots, setMaxSnapshots] = useState(30);
  const [readOnlyMode, setReadOnlyMode] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchSnapshots();
  }, []);

  useEffect(() => {
    if (config) {
      setBaseUrl(config.baseUrl || '');
      setAutoSnapshotInterval(config.autoSnapshotInterval || 24);
      setMaxSnapshots(config.maxSnapshots || 30);
      setReadOnlyMode(config.readOnlyMode || false);
    }
  }, [config]);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) throw new Error('Failed to fetch config');
      const data = await response.json();
      setConfig(data);
    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchSnapshots = async () => {
    try {
      const response = await fetch('/api/snapshots');
      if (!response.ok) throw new Error('Failed to fetch snapshots');
      const data = await response.json();
      setSnapshots(data.snapshots || []);
    } catch (err) {
      console.error('Failed to load snapshots:', err);
    }
  };

  const handleSave = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl,
          autoSnapshotInterval,
          maxSnapshots,
          readOnlyMode,
          theme,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to save settings');
        return;
      }

      const data = await response.json();
      setConfig(data.config);
      alert('Settings saved successfully!');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSnapshot = async () => {
    setSnapshotLoading(true);
    setError('');

    try {
      const response = await fetch('/api/snapshots', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to create snapshot');
        return;
      }

      fetchSnapshots();
      alert('Snapshot created successfully!');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSnapshotLoading(false);
    }
  };

  const handleRestoreSnapshot = async (snapshotId: string) => {
    if (!confirm('Are you sure you want to restore this snapshot? The application will need to be restarted for changes to take effect.')) {
      return;
    }

    try {
      const response = await fetch(`/api/snapshots/${snapshotId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to restore snapshot');
        return;
      }

      const data = await response.json();
      alert(data.message || 'Snapshot restored! Please restart the server.');
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string, filename: string) => {
    if (!confirm('Are you sure you want to delete this snapshot?')) {
      return;
    }

    try {
      const response = await fetch(`/api/snapshots/${snapshotId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to delete snapshot');
        return;
      }

      fetchSnapshots();
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const formatDate = (filename: string) => {
    // Extract date from filename: snapshot_2024-10-16T12-00-00.000Z.db
    const match = filename.match(/snapshot_(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return match[1];
    }
    return 'Unknown';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Configure your MasterPacker application
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm mb-6">
            {error}
          </div>
        )}

        {/* Theme Settings */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Theme
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <input
                  id="light"
                  type="radio"
                  checked={theme === 'light'}
                  onChange={() => setThemePreference('light')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                />
                <label htmlFor="light" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Light
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="dark"
                  type="radio"
                  checked={theme === 'dark'}
                  onChange={() => setThemePreference('dark')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                />
                <label htmlFor="dark" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Dark
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="system"
                  type="radio"
                  checked={theme === 'system'}
                  onChange={() => setThemePreference('system')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                />
                <label htmlFor="system" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  System
                </label>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Current theme: {resolvedTheme === 'light' ? 'Light' : 'Dark'}
            </p>
          </div>
        </div>

        {/* General Settings */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            General Settings
          </h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Base URL (for QR codes)
              </label>
              <input
                id="baseUrl"
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://192.168.1.100:3000"
                className="input"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                This is used to generate QR codes that link back to your items and boxes
              </p>
            </div>

            <div>
              <label htmlFor="readOnlyMode" className="flex items-center">
                <input
                  id="readOnlyMode"
                  type="checkbox"
                  checked={readOnlyMode}
                  onChange={(e) => setReadOnlyMode(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Enable read-only mode
                </span>
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                When enabled, all users will only be able to view data, not modify it
              </p>
            </div>
          </div>
        </div>

        {/* Snapshot Settings */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Automatic Snapshots
          </h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="autoSnapshotInterval" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Snapshot Interval (hours)
              </label>
              <input
                id="autoSnapshotInterval"
                type="number"
                value={autoSnapshotInterval}
                onChange={(e) => setAutoSnapshotInterval(parseInt(e.target.value) || 0)}
                min={1}
                className="input"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                How often to automatically create snapshots (0 to disable)
              </p>
            </div>

            <div>
              <label htmlFor="maxSnapshots" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Maximum Snapshots
              </label>
              <input
                id="maxSnapshots"
                type="number"
                value={maxSnapshots}
                onChange={(e) => setMaxSnapshots(parseInt(e.target.value) || 0)}
                min={1}
                className="input"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Maximum number of snapshots to keep (oldest will be deleted automatically)
              </p>
            </div>
          </div>
        </div>

        {/* Snapshot Management */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Snapshot Management
            </h2>
            <button
              onClick={handleCreateSnapshot}
              disabled={snapshotLoading}
              className="btn btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {snapshotLoading ? 'Creating...' : 'Create Snapshot Now'}
            </button>
          </div>
          
          {snapshots.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No snapshots yet. Create one to start versioning your data.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Size</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((snapshot: any) => (
                    <tr key={snapshot.id || snapshot.filename}>
                      <td>
                        {formatDate(snapshot.filename)}
                      </td>
                      <td>
                        {formatSize(snapshot.size || 0)}
                      </td>
                      <td>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleRestoreSnapshot(snapshot.id || snapshot.filename)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                            title="Restore"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteSnapshot(snapshot.id || snapshot.filename, snapshot.filename)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </main>
    </div>
  );
}
