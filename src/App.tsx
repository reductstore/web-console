import React, { useCallback, useEffect, useState } from "react";
import { ConfigProvider, Image, Layout, Menu } from "antd";
import { useNavigate } from "react-router-dom";
import type { MenuProps } from "antd";

import logo from "./logo.png";
import "./App.css";
import { IBackendAPI } from "./BackendAPI";
import { AppRoutes } from "./Components/Routes";
import {
  BorderOuterOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  LockOutlined,
  LogoutOutlined,
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

  const [permissions, setPermissions] = useState<TokenPermissions | undefined>({
    fullAccess: false,
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [siderCollapsed, setSiderCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );

  const handleResize = useCallback(() => {
    setWindowWidth(window.innerWidth);
  }, []);

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

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  const handleSiderCollapse = (collapsed: boolean) => {
    setSiderCollapsed(collapsed);
  };

  const handleToggleSider = () => {
    setSiderCollapsed((prev) => !prev);
  };

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
          label: "Query",
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

  let marginLeft = 0;
  if (windowWidth <= 768) {
    marginLeft = !siderCollapsed ? 220 : 60;
  }

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
      <Layout style={{ minHeight: "100vh" }}>
        {/* Overlay for mobile menu */}
        {siderCollapsed === false ? null : (
          <div
            className="SiderOverlay"
            onClick={handleToggleSider}
            aria-label="Close menu overlay"
          />
        )}
        <Layout.Sider
          className="Sider"
          collapsible
          collapsed={siderCollapsed}
          onCollapse={handleSiderCollapse}
          breakpoint="md"
          collapsedWidth={60}
          width={220}
          trigger={null}
          style={{ position: "relative" }}
        >
          {/* Hide logo and meta on mobile via CSS */}
          <div className="LogoContainer">
            {!siderCollapsed && (
              <Image src={normalizeStaticUrl(logo)} preview={false} />
            )}
          </div>
          {/* Mobile menu toggle button */}
          <button
            className="MobileMenuToggle"
            aria-label="Toggle menu"
            onClick={handleToggleSider}
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
            marginLeft,
            transition: "margin-left 0.2s",
          }}
        >
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
