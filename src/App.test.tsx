import React from "react";
import { mount } from "enzyme";
import { makeRouteProps, mockJSDOM } from "./Helpers/TestHelpers";
import { MemoryRouter } from "react-router-dom";

import App from "./App";
import { IBackendAPI } from "./BackendAPI";
import { Client, Token } from "reduct-js";

describe("App", () => {
  const client = new Client("");
  const backendAPI: IBackendAPI = {
    client: client,
    logout: jest.fn(),
    login: jest.fn(),
    isAllowed: jest.fn(),
    me: jest.fn(),
  };

  const routeProps = makeRouteProps();

  beforeEach(() => {
    jest.clearAllMocks();
    mockJSDOM();
  });

  it("should have a link to bucket panel", async () => {
    backendAPI.isAllowed = jest.fn().mockResolvedValue(true);
    backendAPI.me = jest
      .fn()
      .mockResolvedValue({ permissions: { fullAccess: false } } as Token);
    routeProps.history.push = jest.fn();

    const app = mount(
      <MemoryRouter>
        <App {...routeProps} backendApi={backendAPI} />
      </MemoryRouter>,
    );

    await new Promise(process.nextTick);
    app.update();

    const bucketItem = app.find('li[data-menu-id$="buckets"]');
    bucketItem.simulate("click");
    expect(routeProps.history.push).toBeCalledWith("/buckets");
  });

  it("should have a link to security panel", async () => {
    backendAPI.isAllowed = jest.fn().mockResolvedValue(true);
    backendAPI.me = jest
      .fn()
      .mockResolvedValue({ permissions: { fullAccess: true } } as Token);
    routeProps.history.push = jest.fn();

    const app = mount(
      <MemoryRouter>
        <App {...routeProps} backendApi={backendAPI} />
      </MemoryRouter>,
    );

    await new Promise(process.nextTick);
    app.update();

    const securityItem = app.find('li[data-menu-id$="security"]');
    securityItem.simulate("click");
    expect(routeProps.history.push).toBeCalledWith("/tokens");
  });

  it("should hide security panel", async () => {
    backendAPI.isAllowed = jest.fn().mockResolvedValue(true);
    backendAPI.me = jest
      .fn()
      .mockResolvedValue({ permissions: { fullAccess: false } } as Token);

    const app = mount(
      <MemoryRouter>
        <App {...routeProps} backendApi={backendAPI} />
      </MemoryRouter>,
    );

    await new Promise(process.nextTick);
    app.update();

    expect(app.find('li[data-menu-id$="security"]').exists()).toBeFalsy();
  });
});
