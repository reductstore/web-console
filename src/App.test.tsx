import React from "react";
import {mount} from "enzyme";
import waitUntil from "async-wait-until";
import {makeRouteProps, mockJSDOM, waitUntilFind} from "./Helpers/TestHelpers";
import {MemoryRouter} from "react-router-dom";

import App from "./App";
import {IBackendAPI} from "./BackendAPI";
import {Client, Token} from "reduct-js";


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
        routeProps.history.push = jest.fn();

        const app = mount(<MemoryRouter><App {...routeProps}
                                             backendApi={backendAPI}/></MemoryRouter>);

        const bucketItem = (await waitUntilFind(app, "#Buckets")).hostNodes().at(0);
        // @ts-ignore
        bucketItem.props().onClick();
        expect(routeProps.history.push).toBeCalledWith("/buckets");
    });

    it("should have a link to security panel", async () => {
        backendAPI.isAllowed = jest.fn().mockResolvedValue(true);
        backendAPI.me = jest.fn().mockResolvedValue({permissions: {fullAccess: true}} as Token);
        routeProps.history.push = jest.fn();

        const app = mount(<MemoryRouter><App {...routeProps}
                                             backendApi={backendAPI}/></MemoryRouter>);

        const bucketItem = (await waitUntilFind(app, "#Security")).hostNodes().at(0);
        // @ts-ignore
        bucketItem.props().onClick();
        expect(routeProps.history.push).toBeCalledWith("/tokens");
    });

    it("should hide security panel", async () => {
        backendAPI.isAllowed = jest.fn().mockResolvedValue(true);
        backendAPI.me = jest.fn().mockResolvedValue({permissions: {fullAccess: false}} as Token);

        const app = mount(<MemoryRouter><App {...routeProps}
                                             backendApi={backendAPI}/></MemoryRouter>);

        const bucketItem = (await waitUntilFind(app, "#Security"));
        expect(bucketItem).toBeUndefined();
    });
});
