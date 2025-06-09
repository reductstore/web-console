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
      <RoutableApp backendApi={backendApi} publicUrl={uiUrl} />
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById("root") as HTMLElement,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
