export type HoleyShapeKey =
  | 'disc'
  | 'round-block'
  | 'hex'
  | 'capsule'
  | 'prism'
  | 'cross'
  | 'triangle'
  | 'diamond'
  | 'sunburst'
  | 'octagon'
  | 'chevron'
  | 'long-bar'
  | 'flower-star'
  | 'bowtie';

export interface HoleyOptions {
  /** Hand-drawn outline and fixed ink shadow. */
  doodle?: boolean;
  /** Unique, stable prefix when inserting multiple SVG strings in one document. */
  idPrefix?: string;
  shape?: HoleyShapeKey;
  color?: `#${string}`;
  shadowColor?: `#${string}`;
  holes?: number;
  seed?: number;
  /** Quarter turns of the face: 0, 90, 180 or 270. Other values snap to the nearest. The extrusion keeps its direction. */
  turn?: number;
  /** Flip the face left to right. The extrusion keeps its direction. */
  mirror?: boolean;
  animated?: boolean;
  duration?: number;
  shadowX?: number;
  shadowY?: number;
  shadowSteps?: number;
}

export interface HoleyShapeInfo {
  readonly key: HoleyShapeKey;
  readonly name: string;
  readonly color: string;
}

export interface HoleyMount {
  readonly element: Element;
  update(options?: Partial<HoleyOptions>): void;
  shuffle(): void;
  destroy(): void;
}

export const shapeNames: readonly HoleyShapeInfo[];
export interface HoleyShape extends HoleyShapeInfo {
  readonly bg: string;
  readonly initial: number;
  readonly path: string;
  readonly holes: readonly { cx: number; cy: number; rx: number; ry: number; rotate: number }[];
}
export const shapes: readonly HoleyShape[];
/** FNV-1a 64 hash of the UTF-8 ID as 16 lowercase hex digits. `seededHoleyOptions` starts from it. */
export function identityHash(identity: string): string;
/** Options derived from an identity. Swift and Kotlin derive the same values. */
export interface SeededHoleyOptions {
  shape: HoleyShapeKey;
  holes: number;
  seed: number;
  turn: 0 | 90 | 180 | 270;
  mirror: boolean;
  color: `#${string}`;
  shadowColor: `#${string}`;
  animated: boolean;
}
export function seededHoleyOptions(identity: string, animated?: boolean): SeededHoleyOptions;
export function createHoleySvg(options?: HoleyOptions): string;
export function mountHoleyShape(target: string | Element, options?: HoleyOptions): HoleyMount;
