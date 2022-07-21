import React from "react";
import {mount} from "enzyme";
import waitUntil from "async-wait-until";
import {mockJSDOM} from "./Helpers/TestHelpers";
import {MemoryRouter, RouteComponentProps} from "react-router-dom";
import {createLocation, createMemoryHistory} from "history";

import App from "./App";
import {IBackendAPI} from "./BackendAPI";
import {Client} from "reduct-js";


const makeRouteProps = (): RouteComponentProps => {
    return {
        match: {
            isExact: false,
            path: "",
            url: "",
            params: {id: "1"}
        },
        location: createLocation(""),
        history: createMemoryHistory()
    };
};

describe("App", () => {
    const client = new Client("");
    const backendAPI: IBackendAPI = {
        client: client,
        logout: jest.fn(),
        login: jest.fn(),
        isAllowed: jest.fn(),
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
        await waitUntil(() => app.update().find("#Buckets").length > 0);

        const bucketItem = app.find("#Buckets").hostNodes().at(0);
        // @ts-ignore
        bucketItem.props().onClick();
        expect(routeProps.history.push).toBeCalledWith("/buckets");
    });
});
