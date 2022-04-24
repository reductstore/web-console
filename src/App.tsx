import React from "react";
import "./App.css";
import Dashboard from "./Views/Dashboard";
import {Client} from "reduct-js";

import {Container} from "semantic-ui-react";

function App() {
    let url = process.env.REACT_APP_STORAGE_URL;
    if (url === undefined) {
        let path = window.location.pathname;
        path = path.replace(process.env.PUBLIC_URL, "");
        url = `${window.location.protocol}//${window.location.host}${path}`;
    }

    const client = new Client(url);
    return (
        <div className="App">
            <Container>
                <Dashboard client={client}/>
            </Container>
        </div>
    );
}

export default App;
