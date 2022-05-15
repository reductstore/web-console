import React from "react";
import Dashboard from "./Views/Dashboard/Dashboard";
import {Client} from "reduct-js";
import {Image, Layout, Menu} from "antd";

import logo from "./main_logo.png";
import "antd/dist/antd.css";
import "./App.css";

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
            <Layout style={{height: "100%"}}>
                <Layout>
                    <Layout.Sider>
                        <Menu mode="inline" style={{display: "flex", flexDirection: "column", height: "100%"}}
                              theme="dark">
                            <a href="https://reduct-storage.dev">
                                <Image src={logo} preview={false}/>
                            </a>
                            <Menu.Item style={{marginTop: "auto", display: "hidden"}}
                            >
                                <a href="https://docs.reduct-storage.dev/http-api">API Documentation</a>
                            </Menu.Item>
                        </Menu>
                    </Layout.Sider>
                    <Layout.Content>
                        <Dashboard client={client}/>
                    </Layout.Content>
                </Layout>
            </Layout>
        </div>
    );
}

export default App;
