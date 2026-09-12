export type ReactNode = any;
export type RefObject<T> = {current:T};
export type StateAction<T> = T | ((previous:T)=>T);
export type Dispatch<T> = (value:T)=>void;
export function useState<T>(value:T|(()=>T)): [T, Dispatch<StateAction<T>>];
export function useEffect(effect:()=>void|(()=>void),deps?:unknown[]):void;
export function useLayoutEffect(effect:()=>void|(()=>void),deps?:unknown[]):void;
export function useRef<T>(value:T):RefObject<T>;
export function useMemo<T>(f:()=>T,deps:unknown[]):T;
export function useCallback<T extends Function>(f:T,deps:unknown[]):T;
export function useSyncExternalStore<T>(subscribe:(f:()=>void)=>()=>void,getSnapshot:()=>T):T;
export function createElement(type:any,props?:any,...children:any[]):any;
export const Fragment:any;
export const ReactDOM:{createRoot:(el:HTMLElement)=>{render:(node:any)=>void};flushSync:(f:()=>void)=>void};
declare const React:{createElement:typeof createElement;Fragment:any;Component:any};
export default React;
declare global { namespace JSX { interface IntrinsicAttributes { key?:any } interface IntrinsicElements { [elemName:string]:any } interface ElementChildrenAttribute { children:{} } } interface Window { Prism:any; JSZip:any; atlasPdfLoader?:()=>Promise<any>; ATLAS_LOCAL_LIBRARY?:boolean; } }
