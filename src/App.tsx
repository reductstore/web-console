import React from "react";
import {Image, Layout, Menu} from "antd";
import {RouteComponentProps, withRouter} from "react-router-dom";

import logo from "./main_logo.png";
import "antd/dist/antd.variable.min.css";
import "./App.css";

import {ConfigProvider} from "antd";
import {IBackendAPI} from "./BackendAPI";
import {Routes} from "./Components/Routes";

ConfigProvider.config({
    theme: {
        primaryColor: "#231b49",
    },
});


interface Props extends RouteComponentProps {
    backendApi: IBackendAPI;
}

type State = {
    isAllowed?: boolean;
}

class App extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        this.props.backendApi.isAllowed()
            .then((isAllowed) => this.setState({isAllowed}))
            .catch((err) => console.error(err));
    }

    render() {
        if (this.state.isAllowed === undefined) {
            return <div/>;
        }
        return <div className="App">
            <Layout>
                <Layout.Sider className="Sider">
                    <Menu className="MenuItem">
                        <a href="https://reduct-storage.dev">
                            <Image src={logo} preview={false}/>
                        </a>
                    </Menu>
                </Layout.Sider>
                <Layout.Content>
                    <Routes {...this.props} isAllowed={this.state.isAllowed}/>
                </Layout.Content>

            </Layout>
        </div>;
    }
}

// @ts-ignore
export default withRouter(App);
