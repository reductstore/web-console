import React from "react";
import {Divider, Image, Layout, Menu} from "antd";
import {RouteComponentProps} from "react-router-dom";

import logo from "./main_logo.png";
import "antd/dist/antd.variable.min.css";
import "./App.css";

import {ConfigProvider} from "antd";
import {IBackendAPI} from "./BackendAPI";
import {Routes} from "./Components/Routes";
import {BorderOuterOutlined, DatabaseOutlined, LogoutOutlined} from "@ant-design/icons";

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

export default class App extends React.Component<Props, State> {
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

        const {backendApi, history} = this.props;
        const onLogout = async () => {
            backendApi.logout();
            this.setState({isAllowed: false});
        };

        const onLogin = async () => {
            this.setState({isAllowed: true});
            this.props.history.push("/");
        };

        console.log(this.state.isAllowed);

        return <div className="App">
            <Layout>
                <Layout.Sider className="Sider">
                    <Menu className="MenuItem" selectable={false} triggerSubMenuAction="click">
                        <a href="https://reduct-storage.dev" title="https://reduct-storage.dev">
                            <Image src={logo} preview={false}/>
                        </a>

                        <Divider/>
                        {this.state.isAllowed ? <>
                                <Menu.Item icon={<BorderOuterOutlined/>} onClick={() => history.push("/dashboard")}>
                                    Dashboard
                                </Menu.Item>
                                <Menu.Item id="Buckets" icon={<DatabaseOutlined/>}
                                           onClick={() => history.push("/buckets")}>Buckets</Menu.Item>

                                <Divider style={{borderColor: "white"}}/>

                                <Menu.Item onClick={onLogout} icon={<LogoutOutlined/>}>
                                    Logout
                                </Menu.Item> </> :
                            <div/>
                        }
                    </Menu>
                </Layout.Sider>
                <Layout.Content>
                    <Routes {...this.props} isAllowed={this.state.isAllowed} onLogin={onLogin}/>
                </Layout.Content>

            </Layout>
        </div>;
    }
}

