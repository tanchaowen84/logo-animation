import { continueRender, delayRender } from 'remotion';
import { useEffect, useMemo, useState } from 'react';
import { loadSvgSource } from './loadSvgSource';
import { parseSvgToLayers } from './parseSvgToLayers';
import type { ParsedSvgDocument, SvgLayer, SvgLayerCollection } from './types';
import { createSvgRuntime } from './createSvgRuntime';

interface UseSvgLayersOptions {
  vectorizedSvgUrl: string;
}

type LayerStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseSvgLayersResult {
  status: LayerStatus;
  error: Error | null;
  collection: SvgLayerCollection;
  runtime: ReturnType<typeof createSvgRuntime> | null;
}

const emptyCollection: SvgLayerCollection = {
  document: null,
  layers: [],
  byId: () => undefined,
  byLabel: () => [],
  all: () => [],
};

export function useSvgLayers({ vectorizedSvgUrl }: UseSvgLayersOptions): UseSvgLayersResult {
  const [status, setStatus] = useState<LayerStatus>(() => (vectorizedSvgUrl ? 'loading' : 'idle'));
  const [error, setError] = useState<Error | null>(null);
  const [document, setDocument] = useState<ParsedSvgDocument | null>(null);
  useEffect(() => {
    if (!vectorizedSvgUrl) {
      setStatus('idle');
      setDocument(null);
      setError(new Error('vectorizedSvgUrl is required'));
      return;
    }

    let cancelled = false;
    let finished = false;
    const handle = delayRender(`loadSvg:${vectorizedSvgUrl}`);

    async function load() {
      try {
        setStatus('loading');
        const svg = await loadSvgSource(vectorizedSvgUrl);
        if (cancelled) return;
        const parsed = await parseSvgToLayers(svg);
        if (cancelled) return;
        setDocument(parsed);
        setStatus('success');
        setError(null);
        continueRender(handle);
        finished = true;
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setDocument(null);
        setError(err instanceof Error ? err : new Error('Failed to parse SVG'));
        continueRender(handle);
        finished = true;
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (!finished) {
        continueRender(handle);
        finished = true;
      }
    };
  }, [vectorizedSvgUrl]);

  const collection = useMemo<SvgLayerCollection>(() => {
    if (!document) {
      return emptyCollection;
    }

    const { layers } = document;
    const byIdMap = new Map<string, SvgLayer>();
    const byLabelMap = new Map<string, SvgLayer[]>();

    const traverse = (layer: SvgLayer) => {
      byIdMap.set(layer.id, layer);
      if (layer.label) {
        const current = byLabelMap.get(layer.label) ?? [];
        current.push(layer);
        byLabelMap.set(layer.label, current);
      }
      if (layer.children) {
        layer.children.forEach(traverse);
      }
    };

    layers.forEach(traverse);

    return {
      document,
      layers,
      byId: (id: string) => byIdMap.get(id),
      byLabel: (...labels: string[]) => {
        if (labels.length === 0) return [];
        const referenced = labels.flatMap((label) => byLabelMap.get(label) ?? []);
        return referenced.length > 0 ? referenced : [];
      },
      all: () => [...layers],
    };
  }, [document]);

  const runtime = useMemo(() => {
    if (!document) {
      return null;
    }
    return createSvgRuntime(collection);
  }, [collection, document]);

  return {
    status,
    error,
    collection,
    runtime,
  };
}
