import React from "react";
import { ConfigProvider, Divider, Image, Layout, Menu } from "antd";
import { RouteComponentProps } from "react-router-dom";

import logo from "./main_logo.png";
import "./App.css";
import { IBackendAPI } from "./BackendAPI";
import { Routes } from "./Components/Routes";
import {
  BorderOuterOutlined,
  DatabaseOutlined,
  LockOutlined,
  LogoutOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { TokenPermissions } from "reduct-js";

interface Props extends RouteComponentProps {
  backendApi: IBackendAPI;
}

type State = {
  permissions?: TokenPermissions;
};

const primaryColor = "#231b49";

export default class App extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { permissions: { fullAccess: false } };
  }

  componentDidMount() {
    this.props.backendApi
      .isAllowed()
      .then((isAllowed) => {
        return isAllowed ? this.props.backendApi.me() : undefined;
      })
      .then((token) =>
        this.setState({
          permissions: (token && token.permissions) ?? undefined,
        }),
      )
      .catch((err) => console.error(err));
  }

  render() {
    const { backendApi, history } = this.props;
    const onLogout = async () => {
      backendApi.logout();
      this.setState({ permissions: undefined });
    };

    const onLogin = async () => {
      this.setState({
        permissions: (await this.props.backendApi.me()).permissions,
      });
      this.props.history.push("/");
    };

    const version = process.env.REACT_APP_VERSION;
    const { permissions } = this.state;

    return (
      <div className="App">
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: primaryColor,
              colorLink: primaryColor,
            },
            components: {
              Menu: {
                colorBgContainer: primaryColor,
                colorText: "#cccccc",
                colorLink: primaryColor,
                colorLinkHover: "#111",
              },
            },
          }}
        >
          <Layout style={{ minHeight: "100vh" }}>
            <Layout.Sider
              className="Sider"
              style={{ backgroundColor: primaryColor }}
            >
              <Menu
                className="MenuItem"
                selectable={false}
                triggerSubMenuAction="click"
              >
                <a
                  href="https://www.reduct.store"
                  title="https://www.reduct.store"
                >
                  <Image src={logo} preview={false} />
                </a>
                <Divider />
                {permissions && (
                  <>
                    <Menu.Item
                      icon={<BorderOuterOutlined />}
                      onClick={() => history.push("/dashboard")}
                    >
                      Dashboard
                    </Menu.Item>
                    <Menu.Item
                      id="Buckets"
                      icon={<DatabaseOutlined />}
                      onClick={() => history.push("/buckets")}
                    >
                      Buckets
                    </Menu.Item>
                    {permissions.fullAccess && (
                      <>
                        <Menu.Item
                          id="Replications"
                          icon={<ShareAltOutlined />}
                          onClick={() => history.push("/replications")}
                        >
                          Replications
                        </Menu.Item>
                        <Menu.Item
                          id="Security"
                          icon={<LockOutlined />}
                          onClick={() => history.push("/tokens")}
                        >
                          Security
                        </Menu.Item>
                      </>
                    )}
                    <Divider style={{ borderColor: "white" }} />
                    <Menu.Item onClick={onLogout} icon={<LogoutOutlined />}>
                      Logout
                    </Menu.Item>
                  </>
                )}
              </Menu>
              <div className="Meta">
                <div className="MetaItem">Web Console: v{version}</div>
              </div>
            </Layout.Sider>

            <Layout>
              <Layout.Content>
                <Routes
                  {...this.props}
                  permissions={this.state.permissions}
                  onLogin={onLogin}
                />
              </Layout.Content>
            </Layout>
          </Layout>
        </ConfigProvider>
      </div>
    );
  }
}
