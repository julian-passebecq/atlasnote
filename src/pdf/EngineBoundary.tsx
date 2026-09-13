import React from '../vendor/react.mjs';
interface BoundaryProps { children?:any; fallback:(reason:string)=>any;onError?:(reason:string)=>void }
/** A chunk/render failure must not take down notes or the other Compare pane. */
class Boundary extends React.Component {
 declare props:BoundaryProps;
 state={error:''};
 static getDerivedStateFromError(error:Error){return {error:error?.message||'The integrated PDF engine could not render this document.'};}
 componentDidCatch(error:Error){this.props.onError?.(error?.message||'Integrated PDF render failed.');}
 render(){return this.state.error?this.props.fallback(this.state.error):this.props.children;}
}
export function EngineBoundary(props:BoundaryProps){return React.createElement(Boundary,props);}
