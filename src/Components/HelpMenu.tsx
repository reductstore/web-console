import { QuestionCircleOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";

type MenuItem = Required<MenuProps>["items"][number];

export const getHelpMenuItems = (collapsed?: boolean): MenuItem[] => {
  const helpItems: MenuItem[] = [
    {
      key: "getting-started",
      label: (
        <a
          href="https://www.reduct.store/docs/getting-started"
          target="_blank"
          rel="noopener noreferrer"
        >
          Getting Started
        </a>
      ),
    },
    {
      key: "Guides",
      label: (
        <a
          href="https://www.reduct.store/docs/guides"
          target="_blank"
          rel="noopener noreferrer"
        >
          Guides
        </a>
      ),
    },
    {
      key: "cli",
      label: (
        <a
          href="https://github.com/reductstore/reduct-cli"
          target="_blank"
          rel="noopener noreferrer"
        >
          CLI
        </a>
      ),
    },
    {
      key: "community",
      label: (
        <a
          href="https://community.reduct.store/signup"
          target="_blank"
          rel="noopener noreferrer"
        >
          Community
        </a>
      ),
    },
    {
      key: "github",
      label: (
        <a
          href="https://github.com/reductstore/reductstore"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      ),
    },
  ];

  return collapsed
    ? [
        {
          key: "help",
          icon: <QuestionCircleOutlined />,
          label: "Help",
          children: helpItems,
          className: "help-menu-item",
        },
      ]
    : helpItems;
};
