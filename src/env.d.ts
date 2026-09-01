/// <reference path="../.astro/types.d.ts" />

type D1Database = import('@cloudflare/workers-types').D1Database;

type ENV = {
  DB?: D1Database;
};

type Runtime = import('@astrojs/cloudflare').Runtime<ENV>;

declare namespace App {
  interface Locals extends Runtime {}
}

// ─── Ambient Type Declarations for React & JSX ─────────────────────────────
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module 'react' {
  export type ReactNode = any;
  export type CSSProperties = Record<string, any>;
  export interface MouseEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    target: T;
  }
  export interface ChangeEvent<T = Element> {
    target: T & { value: string };
  }
  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  const React: any;
  export default React;
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

// ─── Ambient Type Declarations for @keystatic/core ──────────────────────────
declare module '@keystatic/core' {
  export function config(cfg: any): any;
  export function collection(schema: any): any;
  export function singleton(schema: any): any;
  export function component(options: {
    preview: (props: any) => any;
    label: string;
    schema: Record<string, any>;
  }): any;

  export namespace fields {
    export function text(opts?: any): any;
    export function slug(opts?: any): any;
    export function date(opts?: any): any;
    export function select(opts?: any): any;
    export function image(opts?: any): any;
    export function url(opts?: any): any;
    export function document(opts?: any): any;
    export function array(field: any, opts?: any): any;
    export function object(fields: Record<string, any>, opts?: any): any;
  }
}
