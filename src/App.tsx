import React, { useEffect, useState } from "react";
import { Button, ConfigProvider, Dropdown, Layout, Menu, Tooltip } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import type { MenuProps } from "antd";

import "./App.css";
import { IBackendAPI } from "./BackendAPI";
import { AppRoutes } from "./Components/Routes";
import {
  AppstoreOutlined,
  BookOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  CommentOutlined,
  DatabaseOutlined,
  GithubOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  LineChartOutlined,
  LinkedinOutlined,
  LockOutlined,
  LogoutOutlined,
  ReadOutlined,
  RightOutlined,
  ShareAltOutlined,
  YoutubeOutlined,
} from "@ant-design/icons";
import { TokenPermissions } from "reduct-js";

interface Props {
  backendApi: IBackendAPI;
  publicUrl: string;
  apiUrl: string;
}

const PRIMARY_COLOR = "#231b49";

const FONT_FAMILY =
  'system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, Cantarell, "Noto Sans", sans-serif';

const socialLinks = [
  {
    label: "Discourse",
    href: "https://community.reduct.store",
    icon: <CommentOutlined />,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/reductstore",
    icon: <LinkedinOutlined />,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@ReductStore",
    icon: <YoutubeOutlined />,
  },
  {
    label: "GitHub",
    href: "https://github.com/reductstore/reductstore",
    icon: <GithubOutlined />,
  },
];

export default function App(props: Readonly<Props>) {
  const { backendApi, publicUrl } = props;
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [permissions, setPermissions] = useState<TokenPermissions>();
  const [tokenName, setTokenName] = useState<string>();
  const [authLoading, setAuthLoading] = useState(true);
  const [siderCollapsed, setSiderCollapsed] = useState(false);

  useEffect(() => {
    backendApi.onUnauthorized = () => {
      setPermissions(undefined);
      setTokenName(undefined);
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
      .then((token) => {
        setPermissions(token?.permissions);
        setTokenName(token?.name);
      })
      .catch((err) => console.error(err))
      .finally(() => setAuthLoading(false));
  }, [backendApi]);

  const onLogout = () => {
    backendApi.logout();
    setPermissions(undefined);
    setTokenName(undefined);
  };

  const onLogin = async () => {
    const token = await backendApi.me();
    setPermissions(token.permissions);
    setTokenName(token.name);
    navigate("/");
  };

  const version = process.env.REACT_APP_VERSION || "development";

  const getMenuItems = (): MenuProps["items"] => {
    const items: MenuProps["items"] = [
      {
        key: "dashboard",
        icon: <HomeOutlined />,
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
    ];

    if (permissions?.fullAccess) {
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

    return items;
  };

  const selectedKey = pathname === "/" ? "dashboard" : pathname.split("/")[1];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: PRIMARY_COLOR,
          colorLink: PRIMARY_COLOR,
          fontFamily: FONT_FAMILY,
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
        {permissions && (
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
                  src={`${publicUrl}/logo.svg`}
                />
                {!siderCollapsed && (
                  <span className="BrandName">ReductStore</span>
                )}
              </button>
            </div>
            <nav aria-label="Main navigation" className="Navigation">
              <Menu
                className="MenuItem MainMenu"
                inlineCollapsed={siderCollapsed}
                items={getMenuItems()}
                mode="inline"
                selectedKeys={[selectedKey]}
              />
            </nav>
            <footer
              className={`SidebarFooter ${siderCollapsed ? "SidebarFooterCollapsed" : ""}`}
            >
              {permissions && (
                <div className="ConsoleMenu">
                  <Dropdown
                    classNames={{ root: "ConsoleDropdown" }}
                    menu={{
                      items: [
                        {
                          key: "token",
                          className: "TokenMenuItem",
                          label: (
                            <span>{tokenName ?? "Current API token"}</span>
                          ),
                          disabled: true,
                        },
                        {
                          key: "documentation",
                          icon: <BookOutlined />,
                          label: (
                            <a
                              href="https://www.reduct.store/docs"
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              Documentation
                            </a>
                          ),
                        },
                        {
                          key: "guides",
                          icon: <ReadOutlined />,
                          label: (
                            <a
                              href="https://www.reduct.store/docs/guides"
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              Guides
                            </a>
                          ),
                        },
                        {
                          key: "cli",
                          icon: <CodeOutlined />,
                          label: (
                            <a
                              href="https://github.com/reductstore/reduct-cli"
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              CLI
                            </a>
                          ),
                        },
                        {
                          key: "version",
                          icon: <InfoCircleOutlined />,
                          label: (
                            <a
                              href={`https://github.com/reductstore/web-console/releases/tag/v${version}`}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              Web Console v{version}
                            </a>
                          ),
                        },
                        { type: "divider" },
                        {
                          key: "logout",
                          icon: <LogoutOutlined />,
                          label: <span>Sign out</span>,
                        },
                      ],
                      onClick: ({ key }) => {
                        if (key === "logout") onLogout();
                      },
                    }}
                    placement="topLeft"
                    trigger={["click"]}
                  >
                    <Tooltip
                      placement="right"
                      title={siderCollapsed ? "Console" : undefined}
                    >
                      <Button
                        aria-label="Console menu"
                        className="ConsoleTrigger"
                        icon={<AppstoreOutlined />}
                        type="text"
                      >
                        {!siderCollapsed && "Console"}
                      </Button>
                    </Tooltip>
                  </Dropdown>
                </div>
              )}
              <div className="SidebarFooterBottom">
                {!siderCollapsed && (
                  <div className="Socials">
                    {socialLinks.map((social) => (
                      <a
                        key={social.label}
                        aria-label={social.label}
                        className="SocialLink"
                        href={social.href}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {social.icon}
                      </a>
                    ))}
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
        )}
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
