import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import {BackendAPI} from "./BackendAPI";
import {BrowserRouter} from "react-router-dom";

let url = process.env.REACT_APP_STORAGE_URL;
if (url === undefined) {
    let path = window.location.pathname;
    path = path.replace(process.env.PUBLIC_URL, "");
    url = `${window.location.protocol}//${window.location.host}${path}`;
}

const backendApi = new BackendAPI(url);

ReactDOM.render(
    <React.StrictMode>
        {/* @ts-ignore*/}
        <BrowserRouter basename="/ui">
            <App backendApi={backendApi}/>

        </BrowserRouter>
    </React.StrictMode>,
    document.getElementById("root") as HTMLElement
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
