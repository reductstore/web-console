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
    diskQuota: 1,
    fingerprint: "unique-fingerprint"
  };

  const mockLicenseInfoExpired: LicenseInfo = {
    plan: "Pro",
    licensee: "Acme Corp",
    invoice: "INV-123",
    expiryDate: 1614556800000,
    deviceNumber: 100,
    diskQuota: 1,
    fingerprint: "unique-fingerprint"
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockJSDOM();
  });

  it("renders without crashing", () => {
    render(<LicenseDetails license={mockLicenseInfo} usage={0n} />);
    expect(screen.getByText("Plan")).toBeInTheDocument();
  });

  it("renders license details correctly", () => {
    render(<LicenseDetails license={mockLicenseInfo} usage={0n} />);
    const expiryDate = new Date(mockLicenseInfo.expiryDate).toLocaleDateString(
      undefined,
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

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
    expect(screen.getByText(/^1 TB/)).toBeInTheDocument();

    expect(screen.getByText("Fingerprint")).toBeInTheDocument();
    expect(screen.getByText("unique-fingerprint")).toBeInTheDocument();
  });

  it("does not render license alert when license is valid and disk quota is not exceeded", () => {
    render(<LicenseDetails license={mockLicenseInfo} usage={0n} />);
    const regex = /Your license has expired\./i;
    expect(screen.queryByText(regex)).not.toBeInTheDocument();
  });

  it("renders license alert when license has expired", () => {
    render(<LicenseDetails license={mockLicenseInfoExpired} usage={0n} />);
    const regex = /Your license has expired\./i;
    expect(screen.getByText(regex)).toBeInTheDocument();
  });

  it("renders license alert when disk quota exceeded", () => {
    render(<LicenseDetails license={mockLicenseInfo} usage={BigInt(1e12 + 1)} />);
    const regex = /disk quota has been exceeded\./i;
    expect(screen.getByText(regex)).toBeInTheDocument();
  });

  it("renders license alert when license has expired and disk quota exceeded", () => {
    render(<LicenseDetails license={mockLicenseInfoExpired} usage={2n} />);
    const regex = /Your license has expired\./i;
    expect(screen.getByText(regex)).toBeInTheDocument();
  });
});
