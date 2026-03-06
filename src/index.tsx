import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { BackendAPI } from "./BackendAPI";
import { BrowserRouter, withRouter } from "react-router-dom";
import { parseLocation } from "./Helpers/ApiUrlParser";

let apiUrl = process.env.REACT_APP_STORAGE_URL;
let uiUrl = process.env.PUBLIC_URL;
if (apiUrl === undefined) {
  [apiUrl, uiUrl] = parseLocation(window.location, process.env.PUBLIC_URL);
}

const backendApi = new BackendAPI(apiUrl);
const RoutableApp = withRouter(App);

ReactDOM.render(
  <React.StrictMode>
    {/* @ts-ignore*/}
    <BrowserRouter basename={uiUrl}>
      <RoutableApp backendApi={backendApi} publicUrl={uiUrl} apiUrl={apiUrl} />
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById("root") as HTMLElement,
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
      // eslint-disable-next-line no-constant-condition
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
