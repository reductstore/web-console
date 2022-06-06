import React from "react";
import Dashboard from "./Views/Dashboard/Dashboard";
import {Client} from "reduct-js";
import {Image, Layout, Menu} from "antd";

import logo from "./main_logo.png";
import "antd/dist/antd.variable.min.css";
import "./App.css";

import {ConfigProvider} from "antd";

ConfigProvider.config({
    theme: {
        primaryColor: "#231b49",
    },
});


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
            <Layout>
                <Layout.Sider className="Sider">
                    <Menu className="MenuItem">
                        <a href="https://reduct-storage.dev">
                            <Image src={logo} preview={false}/>
                        </a>
                    </Menu>
                </Layout.Sider>
                <Layout.Content>
                    <Dashboard client={client}/>
                </Layout.Content>

            </Layout>
        </div>
    );
}

export default App;
