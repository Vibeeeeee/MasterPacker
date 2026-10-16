'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/ui/Header';

export default function BoxesPage() {
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tags, setTags] = useState([]);
  const [expandedBoxes, setExpandedBoxes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchBoxes();
    fetchTags();
  }, []);

  const fetchBoxes = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/boxes', window.location.origin);
      url.searchParams.set('parentId', 'root');
      url.searchParams.set('search', searchQuery);
      if (selectedTags.length > 0) {
        selectedTags.forEach(tagId => url.searchParams.append('tag', tagId));
      }

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch boxes');
      const data = await response.json();
      setBoxes(data.boxes || []);
    } catch (err) {
      setError('Failed to load boxes');
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags?includeUsage=true');
      if (!response.ok) throw new Error('Failed to fetch tags');
      const data = await response.json();
      setTags(data.tags || []);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBoxes();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedTags]);

  const toggleExpanded = (boxId: string) => {
    setExpandedBoxes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(boxId)) {
        newSet.delete(boxId);
      } else {
        newSet.add(boxId);
      }
      return newSet;
    });
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const renderBoxTree = (box: any, depth = 0) => (
    <div key={box.id} className={`ml-${depth * 4}`}>
      <div className="flex items-start">
        {box.childBoxes.length > 0 && (
          <button
            onClick={() => toggleExpanded(box.id)}
            className="mr-2 flex-shrink-0"
          >
            {expandedBoxes.has(box.id) ? (
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        )}
        
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="font-medium text-lg">
              <Link
                href={`/boxes/${box.id}`}
                className="hover:text-blue-600 dark:hover:text-blue-400"
              >
                {box.name}
              </Link>
            </h3>
            
            <div className="flex flex-wrap gap-1">
              {box.tags.slice(0, 2).map((tag: any) => (
                <span
                  key={tag.tag.id}
                  className="badge badge-default"
                  style={{ backgroundColor: tag.tag.color + '20', color: tag.tag.color }}
                >
                  {tag.tag.name}
                </span>
              ))}
              {box.tags.length > 2 && (
                <span className="badge badge-default">+{box.tags.length - 2}</span>
              )}
            </div>
          </div>
          
          {box.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {box.description}
            </p>
          )}
          
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {box.boxItems.length} items
            {box.childBoxes.length > 0 && `, ${box.childBoxes.length} sub-boxes`}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <Link
            href={`/boxes/${box.id}`}
            className="text-blue-600 dark:text-blue-400"
            title="View"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </Link>
          <Link
            href={`/boxes/${box.id}/edit`}
            className="text-gray-600 dark:text-gray-400"
            title="Edit"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Link>
        </div>
      </div>
      
      {/* Child boxes */}
      {expandedBoxes.has(box.id) && box.childBoxes.length > 0 && (
        <div className="mt-2 border-l border-gray-200 dark:border-gray-700 pl-4">
          {box.childBoxes.map((child: any) => renderBoxTree(child, depth + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Boxes</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Organize your items in nested boxes
            </p>
          </div>
          
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <Link
              href="/boxes/new"
              className="btn btn-primary btn-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Box
            </Link>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search boxes..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Tag filters */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag: any) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`badge transition-all ${selectedTags.includes(tag.id) ? 'ring-2 ring-blue-500' : ''}`}
                  style={{
                    backgroundColor: selectedTags.includes(tag.id) 
                      ? tag.color + '40'
                      : tag.color + '20',
                    color: tag.color,
                  }}
                >
                  {tag.name} <span className="text-xs opacity-70">({tag.usageCount || 0})</span>
                </button>
              ))}
            </div>
            
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="mt-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading boxes...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md text-sm">
            {error}
            <button
              onClick={fetchBoxes}
              className="ml-4 text-red-600 dark:text-red-400 hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Boxes Tree */}
        {!loading && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {boxes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No boxes found</p>
                <Link
                  href="/boxes/new"
                  className="inline-block mt-4 btn btn-primary btn-sm"
                >
                  Add your first box
                </Link>
              </div>
            ) : (
              <div className="p-4">
                {boxes.map((box: any) => renderBoxTree(box))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
