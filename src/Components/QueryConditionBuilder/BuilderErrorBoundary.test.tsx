import { render, screen, fireEvent } from "@testing-library/react";
import BuilderErrorBoundary from "./BuilderErrorBoundary";

function Boom(): never {
  throw new Error("boom");
}

describe("BuilderErrorBoundary", () => {
  it("renders children when nothing throws", () => {
    render(
      <BuilderErrorBoundary>
        <div>fine</div>
      </BuilderErrorBoundary>,
    );
    expect(screen.getByText("fine")).toBeTruthy();
  });

  it("shows a fallback message instead of crashing when a child throws", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    render(
      <BuilderErrorBoundary>
        <Boom />
      </BuilderErrorBoundary>,
    );
    expect(
      screen.getByText("Something went wrong in the query builder"),
    ).toBeTruthy();
    consoleError.mockRestore();
  });

  it("reloads the page when the reload button is clicked", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      value: { reload },
      writable: true,
    });
    render(
      <BuilderErrorBoundary>
        <Boom />
      </BuilderErrorBoundary>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reload page" }));
    expect(reload).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
