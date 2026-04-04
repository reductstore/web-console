import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import { Client } from "reduct-js";
import Login from "./Login";

describe("Auth::Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJSDOM();
  });

  const client = new Client("");
  const backend = {
    get client() {
      return client;
    },
    login: vi.fn(),
    logout: vi.fn(),
    isAllowed: vi.fn(),
    me: vi.fn(),
  };

  it("should login and call onlogin", async () => {
    backend.login.mockResolvedValue({});
    const onLogin = vi.fn();
    render(<Login backendApi={backend} onLogin={onLogin} />);

    const submitButton = screen.getByRole("button", { name: /login/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(backend.login).toHaveBeenCalled();
    });
    expect(onLogin).toHaveBeenCalled();
  });
});
