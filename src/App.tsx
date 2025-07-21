import React from "react";
import { ConfigProvider, Image, Layout, Menu } from "antd";
import { RouteComponentProps } from "react-router-dom";
import type { MenuProps } from "antd";

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
import { getHelpMenuItems } from "./Components/HelpMenu";

interface Props extends RouteComponentProps {
  backendApi: IBackendAPI;
  publicUrl: string;
}

type State = {
  permissions?: TokenPermissions;
  siderCollapsed: boolean;
};

const PRIMARY_COLOR = "#231b49";

export default class App extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      permissions: { fullAccess: false },
      siderCollapsed: false,
    };
    this.handleSiderCollapse = this.handleSiderCollapse.bind(this);
    this.handleToggleSider = this.handleToggleSider.bind(this);
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

  handleSiderCollapse(collapsed: boolean) {
    this.setState({ siderCollapsed: collapsed });
  }

  handleToggleSider() {
    this.setState((prevState) => ({
      siderCollapsed: !prevState.siderCollapsed,
    }));
  }

  render() {
    const { backendApi, history } = this.props;
    const { siderCollapsed } = this.state;
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

    const getMenuItems = (): MenuProps["items"] => {
      const items: MenuProps["items"] = [];

      if (permissions) {
        items.push(
          {
            key: "dashboard",
            icon: <BorderOuterOutlined />,
            label: "Dashboard",
            onClick: () => history.push("/dashboard"),
          },
          {
            key: "buckets",
            icon: <DatabaseOutlined />,
            label: "Buckets",
            onClick: () => history.push("/buckets"),
          },
        );

        if (permissions.fullAccess) {
          items.push(
            {
              key: "replications",
              icon: <ShareAltOutlined />,
              label: "Replications",
              onClick: () => history.push("/replications"),
            },
            {
              key: "security",
              icon: <LockOutlined />,
              label: "Security",
              onClick: () => history.push("/tokens"),
            },
          );
        }
      }
      items.push(...getHelpMenuItems());

      return items;
    };

    return (
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: PRIMARY_COLOR,
            colorLink: PRIMARY_COLOR,
          },
          components: {
            Menu: {
              colorBgContainer: PRIMARY_COLOR,
              colorText: "#cccccc",
              colorLink: PRIMARY_COLOR,
            },
          },
        }}
      >
        <Layout style={{ minHeight: "100vh" }}>
          {/* Overlay for mobile menu */}
          {siderCollapsed === false ? null : (
            <div
              className="SiderOverlay"
              onClick={this.handleToggleSider}
              aria-label="Close menu overlay"
            />
          )}
          <Layout.Sider
            className="Sider"
            collapsible
            collapsed={siderCollapsed}
            onCollapse={this.handleSiderCollapse}
            breakpoint="md"
            collapsedWidth={60}
            width={220}
            trigger={null}
            style={{ position: "relative", zIndex: 1200 }}
          >
            {/* Hide logo and meta on mobile via CSS */}
            <div className="LogoContainer">
              {!siderCollapsed && (
                <Image src={this.normalizeStaticUrl(logo)} preview={false} />
              )}
            </div>
            {/* Mobile menu toggle button */}
            <button
              className="MobileMenuToggle"
              aria-label="Toggle menu"
              onClick={this.handleToggleSider}
            >
              <span className="MobileMenuIcon" />
            </button>
            <div className="MenuContainer">
              <Menu
                className="MenuItem MainMenu"
                selectable={false}
                mode="inline"
                items={getMenuItems()}
                defaultOpenKeys={["help"]}
              />
              <div className="Divider" />
              {permissions && (
                <Menu
                  className="MenuItem LogoutMenu"
                  selectable={false}
                  mode="inline"
                  items={[
                    {
                      key: "logout",
                      icon: <LogoutOutlined />,
                      label: "Logout",
                      onClick: onLogout,
                    },
                  ]}
                />
              )}
            </div>
            {!siderCollapsed && (
              <div className="Meta">
                <div className="MetaItem">
                  Web Console{" "}
                  <a
                    href={`https://github.com/reductstore/web-console/releases/tag/v${version}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    v{version}
                  </a>
                </div>
              </div>
            )}
          </Layout.Sider>
          <Layout
            style={{
              zIndex: 1,
              marginLeft:
                typeof window !== "undefined" && window.innerWidth <= 768
                  ? !siderCollapsed
                    ? 220
                    : 60
                  : 0,
              transition: "margin-left 0.2s",
            }}
          >
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
    );
  }

  /**
   * Normalizes static URLs to use in the embedded web console.
   * In the embedded context, the public URL may differ from the one used in the standalone version.
   * See RS_API_BASE_PATH in the ReductStore documentation.
   * @param url
   */
  normalizeStaticUrl = (url: string): string => {
    return url.replace(process.env.PUBLIC_URL, this.props.publicUrl);
  };
}
