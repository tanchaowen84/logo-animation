import type { ParsedSvgDocument, SvgLayer, SvgLayerCollection } from './types';

export function createSvgRuntime(collection: SvgLayerCollection) {
  return {
    document: collection.document,
    all: collection.all,
    byId: collection.byId,
    byLabel: collection.byLabel,
    mapLayers: <T>(mapper: (layer: SvgLayer) => T): T[] =>
      collection.all().map(mapper),
  };
}

