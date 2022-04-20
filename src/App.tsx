import React from "react";
import "./App.css";
import Dashboard from "./Views/Dashboard";
import {Client} from "reduct-js";

import {Container} from "semantic-ui-react";

function App() {
    const client = new Client("http://localhost:8383");
    return (
        <div className="App">
            <Container>
                <Dashboard client={client}/>
            </Container>
        </div>
    );
}

export default App;
