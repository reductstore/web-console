import { getHelpMenuItems } from "./HelpMenu";

describe("HelpMenu", () => {
  it("should return help menu as submenu when collapsed", () => {
    const items = getHelpMenuItems(true);

    expect(items).toHaveLength(1);
    expect(items[0]?.key).toBe("help");
    expect(items[0]?.className).toBe("help-menu-item");
  });

  it("should return help menu items directly when not collapsed", () => {
    const items = getHelpMenuItems(false);

    expect(items).toHaveLength(5);
    expect(items.map((item) => item?.key)).toEqual([
      "getting-started",
      "Guides",
      "cli",
      "community",
      "github",
    ]);
  });

  it("should have correct URLs for all menu items", () => {
    const items = getHelpMenuItems(false);
    const expectedUrls = {
      "getting-started": "https://www.reduct.store/docs/getting-started",
      Guides: "https://www.reduct.store/docs/guides",
      cli: "https://github.com/reductstore/reduct-cli",
      community: "https://community.reduct.store/signup",
      github: "https://github.com/reductstore/reductstore",
    };

    items.forEach((item) => {
      if (!item || !("label" in item)) return;
      const link = item.label as JSX.Element;
      expect(link.props.href).toBe(
        expectedUrls[item.key as keyof typeof expectedUrls],
      );
    });
  });
});
