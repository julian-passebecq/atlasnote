// One React instance for the app and React-PDF, including portals/flushSync.
export {default} from 'react';
export * from 'react';
import * as ReactDOMBase from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
export const ReactDOM={...ReactDOMBase,...ReactDOMClient};
