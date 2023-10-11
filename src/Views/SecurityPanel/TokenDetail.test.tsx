import React from "react";
import {Client, Token} from "reduct-js";
import {mockJSDOM, waitUntilFind} from "../../Helpers/TestHelpers";
import {mount} from "enzyme";
import TokenDetail from "./TokenDetail";

jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useParams: () => ({
        name: "token-1",
    }),
}));

describe("TokenDetail", () => {
    const client = new Client("");

    beforeEach(() => {
        jest.clearAllMocks();
        mockJSDOM();

        client.getToken = jest.fn().mockResolvedValue({
            name: "token-1",
            createdAt: 100000,
            permissions: {
                fullAccess: true,
                read: ["bucket-1"],
                write: ["bucket-2"],
            }
        } as Token);
    });

    it("should show token details", async () => {
        const view = mount(<TokenDetail client={client}/>);

        const input = await waitUntilFind(view, {name: "name"});
        expect(input.hostNodes().props().value).toBe("token-1");
        expect(input.hostNodes().props().disabled).toBe(true);

        const fullAccess = await waitUntilFind(view, {name: "fullAccess"});
        expect(fullAccess.hostNodes().props().checked).toBe(true);
        expect(fullAccess.hostNodes().props().disabled).toBe(true);

        const read = await waitUntilFind(view, {id: "ReadSelect"});
        expect(read.at(1).props().value).toEqual(["bucket-1"]);
        expect(read.hostNodes().props().disabled).toBe(true);

        const write = await waitUntilFind(view, {id: "WriteSelect"});
        expect(write.at(1).props().value).toEqual(["bucket-2"]);
        expect(write.hostNodes().props().disabled).toBe(true);
    });

    it("should show error", async () => {
        client.getToken = jest.fn().mockRejectedValue(new Error("error"));
        const view = mount(<TokenDetail client={client}/>);

        const error = await waitUntilFind(view, ".Alert");
        expect(error.hostNodes().text()).toBe("error");
    });

    it("should remove a token", async () => {
        client.deleteToken = jest.fn().mockResolvedValue(undefined);
        const view = mount(<TokenDetail client={client}/>);

        const removeButton = await waitUntilFind(view, ".RemoveButton");
        removeButton.hostNodes().props().onClick();

        // No idea how to test modal with confirmation
    });

    it("should disable remove button if provisioned", async () => {
        client.getToken = jest.fn().mockResolvedValue({
            name: "token-1", createdAt: 100000, isProvisioned: true
        } as Token);
        const view = mount(<TokenDetail client={client}/>);

        const removeButton = await waitUntilFind(view, ".RemoveButton");
        expect(removeButton.hostNodes().props().disabled).toBeTruthy();
    });
});
