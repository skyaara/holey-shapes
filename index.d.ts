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
  | 'flower'
  | 'bowtie';

export interface HoleyOptions {
  shape?: HoleyShapeKey;
  color?: `#${string}`;
  shadowColor?: `#${string}`;
  holes?: number;
  seed?: number;
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
export const shapes: readonly Record<string, unknown>[];
export function createHoleySvg(options?: HoleyOptions): string;
export function mountHoleyShape(target: string | Element, options?: HoleyOptions): HoleyMount;
