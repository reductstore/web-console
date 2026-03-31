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
    const apacheLicenseLink = screen.getByRole("link", {
      name: /Apache License 2\.0/i,
    });
    expect(apacheLicenseLink).toHaveAttribute(
      "href",
      "https://github.com/reductstore/reductstore/blob/main/LICENSE",
    );
    expect(apacheLicenseLink).toHaveAttribute("target", "_blank");
    expect(apacheLicenseLink).toHaveAttribute("rel", "noopener noreferrer");

    const pricingPageLink = screen.getByRole("link", {
      name: /ReductStore Pro/i,
    });
    expect(pricingPageLink).toHaveAttribute(
      "href",
      "https://www.reduct.store/pricing",
    );
    expect(pricingPageLink).toHaveAttribute("target", "_blank");
    expect(pricingPageLink).toHaveAttribute("rel", "noopener noreferrer");
  });
});
