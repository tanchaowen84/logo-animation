declare module 'svg-path-bounds' {
  import type { SvgBBox } from './types';
  function svgPathBounds(path: string): [number, number, number, number];
  export default svgPathBounds;
}
