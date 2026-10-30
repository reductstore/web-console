import React, { useEffect, useState } from "react";
import { Button, ConfigProvider, Dropdown, Layout, Menu } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import type { MenuProps } from "antd";

import logo from "./logo.png";
import "./App.css";
import { IBackendAPI } from "./BackendAPI";
import { AppRoutes } from "./Components/Routes";
import {
  BorderOuterOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  LeftOutlined,
  LineChartOutlined,
  LockOutlined,
  LogoutOutlined,
  RightOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { TokenPermissions } from "reduct-js";
import { getHelpMenuItems } from "./Components/HelpMenu";

interface Props {
  backendApi: IBackendAPI;
  publicUrl: string;
  apiUrl: string;
}

const PRIMARY_COLOR = "#231b49";

export default function App(props: Readonly<Props>) {
  const { backendApi, publicUrl } = props;
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [permissions, setPermissions] = useState<TokenPermissions | undefined>({
    fullAccess: false,
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [siderCollapsed, setSiderCollapsed] = useState(false);

  useEffect(() => {
    backendApi.onUnauthorized = () => {
      setPermissions(undefined);
      navigate("/login");
    };
    return () => {
      backendApi.onUnauthorized = undefined;
    };
  }, [backendApi, navigate]);

  useEffect(() => {
    backendApi
      .isAllowed()
      .then((isAllowed) => {
        return isAllowed ? backendApi.me() : undefined;
      })
      .then((token) =>
        setPermissions((token && token.permissions) ?? undefined),
      )
      .catch((err) => console.error(err))
      .finally(() => setAuthLoading(false));
  }, [backendApi]);

  const onLogout = async () => {
    backendApi.logout();
    setPermissions(undefined);
  };

  const onLogin = async () => {
    setPermissions((await backendApi.me()).permissions);
    navigate("/");
  };

  const version = process.env.REACT_APP_VERSION;

  const getMenuItems = (): MenuProps["items"] => {
    const items: MenuProps["items"] = [];

    if (permissions) {
      items.push(
        {
          key: "dashboard",
          icon: <BorderOuterOutlined />,
          label: "Dashboard",
          onClick: () => navigate("/dashboard"),
        },
        {
          key: "query",
          icon: <LineChartOutlined />,
          label: "Data Explorer",
          onClick: () => navigate("/query"),
        },
        {
          key: "buckets",
          icon: <DatabaseOutlined />,
          label: "Buckets",
          onClick: () => navigate("/buckets"),
        },
      );

      if (permissions.fullAccess) {
        items.push(
          {
            key: "replications",
            icon: <ShareAltOutlined />,
            label: "Replications",
            onClick: () => navigate("/replications"),
          },
          {
            key: "lifecycles",
            icon: <ClockCircleOutlined />,
            label: "Lifecycles",
            onClick: () => navigate("/lifecycles"),
          },
          {
            key: "security",
            icon: <LockOutlined />,
            label: "Security",
            onClick: () => navigate("/tokens"),
          },
        );
      }
    }
    items.push(...getHelpMenuItems());

    return items;
  };

  const selectedKey = pathname === "/" ? "dashboard" : pathname.split("/")[1];

  const normalizeStaticUrl = (url: string): string => {
    return url.replace(process.env.PUBLIC_URL, publicUrl);
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
      <Layout className="AppShell">
        <Layout.Sider
          breakpoint="md"
          className="Sider"
          collapsed={siderCollapsed}
          collapsedWidth={60}
          onBreakpoint={setSiderCollapsed}
          trigger={null}
          width={220}
        >
          <div className={`Brand ${siderCollapsed ? "BrandCollapsed" : ""}`}>
            <button
              aria-label="ReductStore dashboard"
              className="BrandButton"
              onClick={() => navigate("/dashboard")}
              type="button"
            >
              <img
                alt=""
                className="BrandLogo"
                src={normalizeStaticUrl(logo)}
              />
            </button>
          </div>
          <nav aria-label="Main navigation" className="Navigation">
            <Menu
              className="MenuItem MainMenu"
              inlineCollapsed={siderCollapsed}
              items={getMenuItems()}
              mode="inline"
              openKeys={siderCollapsed ? [] : ["help"]}
              selectedKeys={[selectedKey]}
            />
          </nav>
          <footer
            className={`SidebarFooter ${siderCollapsed ? "SidebarFooterCollapsed" : ""}`}
          >
            {permissions && (
              <Dropdown
                classNames={{ root: "SessionDropdown" }}
                menu={{
                  items: [
                    {
                      key: "logout",
                      icon: <LogoutOutlined />,
                      label: <span>Sign out</span>,
                    },
                  ],
                  onClick: ({ key }) => {
                    if (key === "logout") void onLogout();
                  },
                }}
                placement="topLeft"
                trigger={["click"]}
              >
                <Button
                  aria-label="Session menu"
                  className="SessionTrigger"
                  icon={<LogoutOutlined />}
                  type="text"
                >
                  {!siderCollapsed && "Session"}
                </Button>
              </Dropdown>
            )}
            <div className="SidebarFooterBottom">
              {!siderCollapsed && (
                <div className="Meta">
                  Web Console{" "}
                  <a
                    href={`https://github.com/reductstore/web-console/releases/tag/v${version}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    v{version}
                  </a>
                </div>
              )}
              <Button
                aria-label={
                  siderCollapsed ? "Expand navigation" : "Collapse navigation"
                }
                className="CollapseToggle"
                icon={siderCollapsed ? <RightOutlined /> : <LeftOutlined />}
                onClick={() => setSiderCollapsed((collapsed) => !collapsed)}
                type="text"
              />
            </div>
          </footer>
        </Layout.Sider>
        <Layout className="AppContent">
          <Layout.Content>
            <AppRoutes
              backendApi={backendApi}
              apiUrl={props.apiUrl}
              permissions={permissions}
              authLoading={authLoading}
              onLogin={onLogin}
            />
          </Layout.Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
