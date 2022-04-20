import React from "react";
import "./App.css";
import Dashboard from "./Views/Dashboard";
import {Client} from "reduct-js";

import {Container} from "semantic-ui-react";

function App() {
    const client = new Client(process.env.REACT_APP_STORAGE_URL || window.location.toString());

    return (
        <div className="App">
            <Container>
                <Dashboard client={client}/>
            </Container>
        </div>
    );
}

export default App;
