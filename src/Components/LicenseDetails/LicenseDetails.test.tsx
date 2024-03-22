import React from "react";
import {render, screen} from "@testing-library/react";
import LicenseDetails from "./LicenseDetails";
import {LicenseInfo} from "reduct-js";
import {mockJSDOM} from "../../Helpers/TestHelpers";

describe("LicenseDetails", () => {
  const mockLicenseInfo: LicenseInfo = {
    plan: "Pro",
    licensee: "Acme Corp",
    invoice: "INV-123",
    expiryDate: 1735689600000,
    deviceNumber: 100,
    diskQuota: 1024,
    fingerprint: "unique-fingerprint"
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockJSDOM();
  });

  it("renders without crashing", () => {
    render(<LicenseDetails license={mockLicenseInfo} />);
    expect(screen.getByText("Plan")).toBeInTheDocument();
  });

  it("renders license details correctly", () => {
    render(<LicenseDetails license={mockLicenseInfo} />);
    const expiryDate = new Date(mockLicenseInfo.expiryDate).toLocaleDateString();

    expect(screen.getByText("Plan")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();

    expect(screen.getByText("Licensee")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();

    expect(screen.getByText("Invoice")).toBeInTheDocument();
    expect(screen.getByText("INV-123")).toBeInTheDocument();

    expect(screen.getByText("Expiry Date")).toBeInTheDocument();
    expect(screen.getByText(expiryDate)).toBeInTheDocument();

    expect(screen.getByText("Device Number")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();

    expect(screen.getByText("Disk Quota")).toBeInTheDocument();
    expect(screen.getByText("1024")).toBeInTheDocument();

    expect(screen.getByText("Fingerprint")).toBeInTheDocument();
    expect(screen.getByText("unique-fingerprint")).toBeInTheDocument();
  });
});
