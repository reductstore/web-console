import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { BackendAPI } from "./BackendAPI";
import { BrowserRouter } from "react-router-dom";
import { parseLocation } from "./Helpers/ApiUrlParser";

let apiUrl = process.env.REACT_APP_STORAGE_URL;
let uiUrl = process.env.PUBLIC_URL;
if (apiUrl === undefined) {
  [apiUrl, uiUrl] = parseLocation(window.location, process.env.PUBLIC_URL);
}

// react-router v7 is strict about basename matching — redirect to basename
// if the current URL doesn't start with it (e.g. "/" → "/ui/" in dev).
if (uiUrl && !window.location.pathname.startsWith(uiUrl)) {
  window.location.replace(
    uiUrl + window.location.search + window.location.hash,
  );
}

const backendApi = new BackendAPI(apiUrl);

const resizeObserverMessages = new Set([
  "ResizeObserver loop completed with undelivered notifications.",
  "ResizeObserver loop limit exceeded",
]);

// Some responsive third-party components can trigger the browser's benign
// ResizeObserver loop warning during window resizes. Ignore only this
// specific browser-level error so responsive behavior remains enabled.
window.addEventListener("error", (event) => {
  if (resizeObserverMessages.has(event.message)) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
});

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <BrowserRouter basename={uiUrl}>
      <App backendApi={backendApi} publicUrl={uiUrl} apiUrl={apiUrl} />
    </BrowserRouter>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Check if browser supports ReadableStream as request body with duplex option
// Based on: https://developer.chrome.com/docs/capabilities/web-apis/fetch-streaming-requests#feature_detection
const supportsRequestStreams = (() => {
  let duplexAccessed = false;

  const hasContentType = new Request("", {
    body: new ReadableStream(),
    method: "POST",
    get duplex() {
      duplexAccessed = true;
      return "half";
    },
  } as RequestInit).headers.has("Content-Type");
  return duplexAccessed && !hasContentType;
})();

// Only apply polyfill if browser doesn't support streaming request bodies
// or in development environment because of proxy issues with webpack-dev-server
if (!supportsRequestStreams || process.env.NODE_ENV === "development") {
  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.body instanceof ReadableStream) {
      const reader = init.body.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const body = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.length;
      }
      const newInit = { ...init, body };
      delete (newInit as Record<string, unknown>).duplex;
      return originalFetch(input, newInit);
    }
    return originalFetch(input, init);
  };
}
