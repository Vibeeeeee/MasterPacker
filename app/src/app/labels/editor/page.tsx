'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/ui/Header';
import {
  LABEL_SIZES,
  DEFAULT_LAYOUTS,
  ITEM_FIELDS,
  BOX_FIELDS,
  type LabelSizeKey,
  type LayoutElement,
} from '@/lib/label-sizes';

const MM_TO_PX = 10; // internal canvas scale: 10px = 1mm
const PT_TO_PX = 3.52777;

export default function LabelEditorPage() {
  const [size, setSize] = useState<LabelSizeKey>('MP_ITEM_MM24');
  const [elements, setElements] = useState<LayoutElement[]>([]);
  const [widthMm, setWidthMm] = useState(50);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const meta = LABEL_SIZES.find(s => s.key === size)!;
  const fields = meta.kind === 'box' ? BOX_FIELDS : ITEM_FIELDS;

  // Drag state
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ w: 0, h: 0, fontSizePt: 0 });
  const [activeAction, setActiveAction] = useState<{ type: 'move' | 'resize' | 'ghost'; id: string } | null>(null);
  const [snapLines, setSnapLines] = useState<{ x?: number; y?: number } | null>(null);
  const [ghostField, setGhostField] = useState<string | null>(null);
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });

  // Load saved layout for the selected size
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/label-layouts');
        const data = await res.json();
        const saved = (data.layouts || []).find((l: any) => l.size === size);
        if (cancelled) return;
        if (saved) {
          setElements(JSON.parse(saved.layoutJson));
          setWidthMm(saved.widthMm || meta.widthMm);
          setIsCustom(true);
        } else {
          setElements(JSON.parse(DEFAULT_LAYOUTS[size]));
          setWidthMm(meta.widthMm);
          setIsCustom(false);
        }
      } catch {
        if (!cancelled) {
          setElements(JSON.parse(DEFAULT_LAYOUTS[size]));
          setWidthMm(meta.widthMm);
          setIsCustom(false);
        }
      }
      if (!cancelled) setSelectedId(null);
    })();
    return () => { cancelled = true; };
  }, [size]);

  const updateElement = useCallback((id: string, updates: Partial<LayoutElement>) => {
    setElements(prev => prev.map(el => {
      if (el.id !== id) return el;
      const next = { ...el };
      if (updates.x !== undefined && isFinite(updates.x)) next.x = updates.x;
      if (updates.y !== undefined && isFinite(updates.y)) next.y = updates.y;
      if (updates.w !== undefined && isFinite(updates.w)) next.w = updates.w;
      if (updates.h !== undefined && isFinite(updates.h)) next.h = updates.h;
      if (updates.fontSizePt !== undefined && isFinite(updates.fontSizePt)) next.fontSizePt = updates.fontSizePt;
      return next;
    }));
    setIsCustom(true);
  }, []);

  // Live preview (debounced)
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/labels/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: meta.kind,
            size,
            layoutJson: JSON.stringify(elements),
          }),
        });
        if (!res.ok) return;
        const blob = await res.blob();
        setPreviewUrl(URL.createObjectURL(blob));
      } catch { /* ignore preview errors */ }
    }, 400);
    return () => clearTimeout(t);
  }, [elements, size, meta.kind]);

  // ----- Pointer drag machinery (ported from LabelGenerator) -----
  const handleToolboxPointerDown = (e: React.PointerEvent, field: string) => {
    if (activeAction) return;
    setGhostField(field);
    setGhostPos({ x: e.clientX, y: e.clientY });
    setActiveAction({ type: 'ghost', id: 'toolbox' });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  useEffect(() => {
    if (!activeAction) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scale = Math.max(0.1, rect.width / (widthMm * MM_TO_PX));

      if (activeAction.type === 'ghost') {
        setGhostPos({ x: e.clientX, y: e.clientY });
      } else if (activeAction.type === 'move') {
        const el = elements.find(i => i.id === activeAction.id);
        if (!el) return;
        const newX = (e.clientX - rect.left - dragOffsetRef.current.x) / scale / MM_TO_PX;
        const newY = (e.clientY - rect.top - dragOffsetRef.current.y) / scale / MM_TO_PX;

        let finalX = newX;
        let finalY = newY;
        const snapThreshold = 0.5;
        let snappedX: number | undefined;
        let snappedY: number | undefined;

        // Canvas center snapping
        if (Math.abs((newX + el.w / 2) - (widthMm / 2)) < snapThreshold) {
          finalX = widthMm / 2 - el.w / 2;
          snappedX = widthMm / 2;
        }
        if (Math.abs((newY + el.h / 2) - (meta.heightMm / 2)) < snapThreshold) {
          finalY = meta.heightMm / 2 - el.h / 2;
          snappedY = meta.heightMm / 2;
        }

        // Element-to-element snapping
        for (const other of elements) {
          if (other.id === el.id) continue;
          if (Math.abs(newX - other.x) < snapThreshold) { finalX = other.x; snappedX = other.x; }
          else if (Math.abs((newX + el.w) - (other.x + other.w)) < snapThreshold) { finalX = other.x + other.w - el.w; snappedX = other.x + other.w; }
          else if (Math.abs((newX + el.w / 2) - (other.x + other.w / 2)) < snapThreshold) { finalX = other.x + other.w / 2 - el.w / 2; snappedX = other.x + other.w / 2; }

          if (Math.abs(newY - other.y) < snapThreshold) { finalY = other.y; snappedY = other.y; }
          else if (Math.abs((newY + el.h) - (other.y + other.h)) < snapThreshold) { finalY = other.y + other.h - el.h; snappedY = other.y + other.h; }
          else if (Math.abs((newY + el.h / 2) - (other.y + other.h / 2)) < snapThreshold) { finalY = other.y + other.h / 2 - el.h / 2; snappedY = other.y + other.h / 2; }
        }

        setSnapLines({ x: snappedX, y: snappedY });
        updateElement(activeAction.id, {
          x: parseFloat(finalX.toFixed(2)),
          y: parseFloat(finalY.toFixed(2)),
        });
      } else if (activeAction.type === 'resize') {
        const el = elements.find(i => i.id === activeAction.id);
        if (!el) return;
        const rawX = (e.clientX - rect.left) / scale;
        const rawY = (e.clientY - rect.top) / scale;
        const newW = Math.max(2, Math.round((rawX / MM_TO_PX - el.x) * 2) / 2);
        const newH = Math.max(2, Math.round((rawY / MM_TO_PX - el.y) * 2) / 2);

        const startH = dragStartRef.current.h || el.h;
        const startFontSize = dragStartRef.current.fontSizePt || el.fontSizePt;
        const ratio = newH / startH;
        let newFontSizePt = Math.round(startFontSize * ratio * 10) / 10;
        if (newFontSizePt < 4) newFontSizePt = 4;
        if (newFontSizePt > 100) newFontSizePt = 100;

        updateElement(activeAction.id, {
          w: isNaN(newW) ? el.w : newW,
          h: isNaN(newH) ? el.h : newH,
          fontSizePt: isNaN(newFontSizePt) ? el.fontSizePt : newFontSizePt,
        });
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (activeAction.type === 'ghost' && ghostField && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const isInside =
          e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top && e.clientY <= rect.bottom;

        if (isInside) {
          const scale = Math.max(0.1, rect.width / (widthMm * MM_TO_PX));
          const defaultW = ghostField === 'QR Code' ? 10 : 15;
          const defaultH = ghostField === 'QR Code' ? 10 : 6;
          const rawX = (e.clientX - rect.left) / scale;
          const rawY = (e.clientY - rect.top) / scale;
          const xMm = (rawX - (defaultW * MM_TO_PX / 2)) / MM_TO_PX;
          const yMm = (rawY - (defaultH * MM_TO_PX / 2)) / MM_TO_PX;

          const newEl: LayoutElement = {
            id: Date.now().toString(),
            field: ghostField,
            x: parseFloat(xMm.toFixed(2)),
            y: parseFloat(yMm.toFixed(2)),
            w: defaultW,
            h: defaultH,
            fontSizePt: ghostField === 'QR Code' ? 10 : 14,
          };
          setElements(prev => [...prev, newEl]);
          setSelectedId(newEl.id);
          setIsCustom(true);
        }
      }
      setActiveAction(null);
      setGhostField(null);
      setSnapLines(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [activeAction, ghostField, elements, widthMm, meta.heightMm, updateElement]);

  const handlePointerDownElement = (e: React.PointerEvent, id: string, type: 'move' | 'resize') => {
    e.stopPropagation();
    setSelectedId(id);
    setActiveAction({ type, id });
    const el = elements.find(i => i.id === id);
    if (el) dragStartRef.current = { w: el.w, h: el.h, fontSizePt: el.fontSizePt };
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/label-layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size, layoutJson: JSON.stringify(elements), widthMm }),
      });
      setIsCustom(true);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset this layout to the default? Your customizations will be lost.')) return;
    await fetch(`/api/label-layouts?size=${size}`, { method: 'DELETE' });
    setElements(JSON.parse(DEFAULT_LAYOUTS[size]));
    setWidthMm(meta.widthMm);
    setIsCustom(false);
    setSelectedId(null);
  };

  const selectedEl = elements.find(e => e.id === selectedId);
  const px = (mm: number) => mm * MM_TO_PX;
  const safeVal = (val: number) => (isNaN(val) ? '' : val.toString());

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/settings" className="text-xs font-semibold inline-flex items-center gap-1 mb-3" style={{ color: 'var(--accent)' }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Settings
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--ink-900)' }}>
              Label editor
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-500)' }}>
              Design your label blueprints — drag fields onto the canvas, resize, and save per label size.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {savedFlash && (
              <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.14)', color: 'var(--success)' }}>Saved ✓</span>
            )}
            <button onClick={handleReset} className="btn btn-secondary btn-sm" disabled={!isCustom}>Reset</button>
            <button onClick={handleSave} disabled={isSaving} className="btn btn-primary btn-sm">
              {isSaving ? 'Saving…' : 'Save layout'}
            </button>
          </div>
        </div>

        {/* Size pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {LABEL_SIZES.map(s => (
            <button
              key={s.key}
              onClick={() => setSize(s.key)}
              className="chip"
              style={size === s.key ? {
                background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                color: '#fff',
                borderColor: 'transparent',
                boxShadow: '0 4px 14px var(--accent-glow)',
              } : undefined}
            >
              {s.name} · {s.widthMm}×{s.heightMm}mm
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canvas + preview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card !p-6 overflow-x-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="section-title !mb-0">Canvas</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-400)' }}>Width (mm)</span>
                  <input
                    type="number"
                    value={widthMm}
                    onChange={(e) => { setWidthMm(parseFloat(e.target.value) || meta.widthMm); setIsCustom(true); }}
                    className="!w-20 !py-1 !text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-center py-4" style={{ touchAction: activeAction ? 'none' : 'auto' }}>
                <div
                  ref={canvasRef}
                  className="relative"
                  style={{
                    width: px(widthMm),
                    height: px(meta.heightMm),
                    transform: 'scale(2.5)',
                    transformOrigin: 'top center',
                    background: '#fff',
                    borderRadius: 4,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                    touchAction: 'none',
                    marginBottom: px(meta.heightMm) * 1.5,
                  }}
                  onClick={(e) => { if (e.target === canvasRef.current) setSelectedId(null); }}
                >
                  {elements.map(el => {
                    const isSelected = selectedId === el.id;
                    return (
                      <div
                        key={el.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); }}
                        onPointerDown={(e) => handlePointerDownElement(e, el.id, 'move')}
                        className="absolute cursor-move"
                        style={{
                          left: px(el.x), top: px(el.y), width: px(el.w), height: px(el.h),
                          outline: isSelected ? '2px solid var(--accent)' : '1px dashed rgba(0,0,0,0.25)',
                          outlineOffset: 2,
                          zIndex: isSelected ? 10 : 1,
                        }}
                      >
                        <div style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                          {el.field === 'QR Code' ? (
                            <div style={{ backgroundColor: '#000', width: '90%', height: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '4px' }}>QR</span>
                            </div>
                          ) : (
                            <span style={{ color: '#000', fontWeight: 700, whiteSpace: 'nowrap', padding: '0 2px', lineHeight: 1, fontSize: `${el.fontSizePt * PT_TO_PX}px`, fontFamily: 'Roboto Condensed, sans-serif' }}>
                              [{el.field}]
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <div
                            onPointerDown={(e) => handlePointerDownElement(e, el.id, 'resize')}
                            className="absolute"
                            style={{
                              right: -6, bottom: -6, width: 12, height: 12,
                              background: 'var(--accent)', border: '2px solid #fff',
                              borderRadius: 2, cursor: 'nwse-resize',
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                  {snapLines?.x !== undefined && (
                    <div style={{ position: 'absolute', left: px(snapLines.x), top: 0, bottom: 0, width: 1, backgroundColor: 'red', zIndex: 100, pointerEvents: 'none' }} />
                  )}
                  {snapLines?.y !== undefined && (
                    <div style={{ position: 'absolute', top: px(snapLines.y), left: 0, right: 0, height: 1, backgroundColor: 'red', zIndex: 100, pointerEvents: 'none' }} />
                  )}
                </div>
              </div>
            </div>

            {/* Live preview */}
            <div className="card !p-6">
              <span className="section-title">Live preview ({meta.name})</span>
              <div className="mt-2 flex justify-center">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Label preview"
                    className="rounded-lg shadow-lg"
                    style={{ width: '100%', maxWidth: 420, background: '#fff' }}
                  />
                ) : (
                  <div className="w-full max-w-[420px] h-24 flex items-center justify-center rounded-lg" style={{ background: 'var(--surface-glass-strong)' }}>
                    <span className="text-sm" style={{ color: 'var(--ink-400)' }}>Rendering preview…</span>
                  </div>
                )}
              </div>
              <p className="text-xs mt-3 text-center" style={{ color: 'var(--ink-400)' }}>
                Preview uses sample data. Saved layouts apply to every label you export.
              </p>
            </div>
          </div>

          {/* Toolbox + properties */}
          <div className="space-y-4">
            <div className="card !p-5">
              <span className="section-title">Toolbox — {meta.kind === 'box' ? 'box fields' : 'item fields'}</span>
              <p className="text-xs mb-3" style={{ color: 'var(--ink-400)' }}>Drag a field onto the canvas</p>
              <div className="grid grid-cols-2 gap-2">
                {fields.map(f => (
                  <div
                    key={f}
                    onPointerDown={(e) => handleToolboxPointerDown(e, f)}
                    className="chip !py-2 !px-3 cursor-grab select-none"
                    style={{ touchAction: 'none', justifyContent: 'center' }}
                  >
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {selectedEl && (
              <div className="card !p-5">
                <span className="section-title">Properties — {selectedEl.field}</span>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {(['x', 'y', 'w', 'h'] as const).map(k => (
                    <div key={k}>
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink-500)' }}>
                        {k === 'x' ? 'X (mm)' : k === 'y' ? 'Y (mm)' : k === 'w' ? 'Width (mm)' : 'Height (mm)'}
                      </label>
                      <input
                        type="text"
                        value={safeVal(selectedEl[k])}
                        onChange={e => updateElement(selectedEl.id, { [k]: parseFloat(e.target.value) } as Partial<LayoutElement>)}
                        className="!py-1.5 !text-sm"
                      />
                    </div>
                  ))}
                  {selectedEl.field !== 'QR Code' && (
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--ink-500)' }}>Font size (pt)</label>
                      <input
                        type="text"
                        value={safeVal(selectedEl.fontSizePt)}
                        onChange={e => updateElement(selectedEl.id, { fontSizePt: parseFloat(e.target.value) })}
                        className="!py-1.5 !text-sm"
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { setElements(prev => prev.filter(e => e.id !== selectedId)); setSelectedId(null); setIsCustom(true); }}
                  className="btn btn-danger btn-sm w-full mt-4"
                >
                  Remove element
                </button>
              </div>
            )}

            <div className="card !p-5">
              <span className="section-title">Tips</span>
              <ul className="text-xs space-y-1.5" style={{ color: 'var(--ink-500)' }}>
                <li>• Drag elements to move; use the orange corner handle to resize (font scales with height)</li>
                <li>• Elements snap to the canvas center and to each other</li>
                <li>• Save per size — each label size keeps its own blueprint</li>
                <li>• Reset restores the factory layout</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Ghost element while dragging from toolbox */}
      {ghostField && (
        <div
          className="fixed pointer-events-none z-50 badge"
          style={{
            left: ghostPos.x + 12,
            top: ghostPos.y + 12,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
            color: '#fff',
          }}
        >
          {ghostField}
        </div>
      )}
    </div>
  );
}
