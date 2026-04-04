import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import EntryBreadcrumb, { encodeEntryPath } from "./EntryBreadcrumb";
import { mockJSDOM } from "../../Helpers/TestHelpers";

// Helper component to capture current location for assertions
let testLocation: { pathname: string };
function LocationCapture() {
  testLocation = useLocation();
  return null;
}

describe("EntryBreadcrumb", () => {
  beforeEach(() => {
    mockJSDOM();
    testLocation = { pathname: "/" };
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <MemoryRouter>
        {component}
        <LocationCapture />
      </MemoryRouter>,
    );
  };

  describe("Rendering", () => {
    it("should render bucket name as a link", () => {
      const { container } = renderWithRouter(
        <EntryBreadcrumb bucketName="test-bucket" entryName="entry1" />,
      );

      const links = container.querySelectorAll("a");
      expect(links[0].textContent).toBe("test-bucket");
    });

    it("should render single segment entry name without link", () => {
      const { container } = renderWithRouter(
        <EntryBreadcrumb bucketName="test-bucket" entryName="entry1" />,
      );

      expect(screen.getByText("entry1")).toBeInTheDocument();
      // entry1 should not be a link
      const links = container.querySelectorAll("a");
      const linkTexts = Array.from(links).map((l) => l.textContent);
      expect(linkTexts).not.toContain("entry1");
    });

    it("should render multi-segment path with intermediate links", () => {
      const { container } = renderWithRouter(
        <EntryBreadcrumb
          bucketName="test-bucket"
          entryName="folder/subfolder/file"
        />,
      );

      const links = container.querySelectorAll("a");
      expect(links).toHaveLength(3);
      expect(links[0].textContent).toBe("test-bucket");
      expect(links[1].textContent).toBe("folder");
      expect(links[2].textContent).toBe("subfolder");

      expect(screen.getByText("file")).toBeInTheDocument();
    });

    it("should include separators between segments", () => {
      const { container } = renderWithRouter(
        <EntryBreadcrumb bucketName="test-bucket" entryName="folder/file" />,
      );

      const text = container.textContent;
      expect(text).toContain("test-bucket / folder / file");
    });
  });

  describe("Navigation", () => {
    it("should navigate to bucket when bucket name is clicked", () => {
      renderWithRouter(
        <EntryBreadcrumb bucketName="test-bucket" entryName="entry1" />,
      );

      fireEvent.click(screen.getByText("test-bucket"));

      expect(testLocation.pathname).toBe("/buckets/test-bucket");
    });

    it("should navigate to intermediate path when segment is clicked", () => {
      renderWithRouter(
        <EntryBreadcrumb
          bucketName="test-bucket"
          entryName="folder/subfolder/file"
        />,
      );

      fireEvent.click(screen.getByText("folder"));

      expect(testLocation.pathname).toBe("/buckets/test-bucket/entries/folder");
    });

    it("should navigate to nested path when clicking deeper segment", () => {
      renderWithRouter(
        <EntryBreadcrumb
          bucketName="test-bucket"
          entryName="folder/subfolder/file"
        />,
      );

      fireEvent.click(screen.getByText("subfolder"));

      expect(testLocation.pathname).toBe(
        "/buckets/test-bucket/entries/folder/subfolder",
      );
    });
  });

  describe("encodeEntryPath", () => {
    it("should encode special characters in path segments", () => {
      expect(encodeEntryPath("folder/file name")).toBe("folder/file%20name");
    });

    it("should preserve slashes as separators", () => {
      expect(encodeEntryPath("a/b/c")).toBe("a/b/c");
    });

    it("should encode multiple special characters", () => {
      expect(encodeEntryPath("folder/file#1?test")).toBe(
        "folder/file%231%3Ftest",
      );
    });

    it("should handle single segment", () => {
      expect(encodeEntryPath("simple")).toBe("simple");
    });
  });
});
