import React from "react";
import { render, screen } from "@testing-library/react";
import LicenseAlert from "./LicenseAlert";

describe("LicenseAlert", () => {
  it("renders without crashing", () => {
    render(<LicenseAlert />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("contains the correct links", () => {
    render(<LicenseAlert />);
    const buslLink = screen.getByRole("link", {
      name: /Business Source License \(BUSL\)/i,
    });
    expect(buslLink).toHaveAttribute(
      "href",
      "https://github.com/reductstore/reductstore/blob/main/LICENSE",
    );
    expect(buslLink).toHaveAttribute("target", "_blank");
    expect(buslLink).toHaveAttribute("rel", "noopener noreferrer");

    const pricingPageLink = screen.getByRole("link", { name: /pricing page/i });
    expect(pricingPageLink).toHaveAttribute(
      "href",
      "https://www.reduct.store/pricing",
    );
    expect(pricingPageLink).toHaveAttribute("target", "_blank");
    expect(pricingPageLink).toHaveAttribute("rel", "noopener noreferrer");
  });
});
