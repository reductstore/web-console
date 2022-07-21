import React from "react";
import {mount} from "enzyme";
import {mockJSDOM, waitUntilFind} from "../../Helpers/TestHelpers";

import Dashboard from "./Dashboard";
import {Client, ServerInfo} from "reduct-js";


describe("Dashboard", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockJSDOM();
    });

    const client = new Client("");
    const backend = {
        get client() { return client; },
        login: jest.fn(),
        logout: jest.fn(),
        isAllowed: jest.fn(),
    };


    const serverInfo: ServerInfo = {
        version: "0.4.0",
        uptime: 1000n,
        usage: 2000n,
        bucketCount: 2n,
        oldestRecord: 10n,
        latestRecord: 10000010n,
        defaults: {
            bucket: {}
        }
    };


    it("should show server info", async () => {
        client.getInfo = jest.fn().mockResolvedValue(serverInfo);
        client.getBucketList = jest.fn().mockResolvedValue([]);

        const wrapper = mount(<Dashboard backendApi={backend}/>);
        const html = (await waitUntilFind(wrapper, "#ServerInfo")).hostNodes();

        expect(html.text()).toContain("0.4.0");
        expect(html.text()).toContain("16 minutes");
        expect(html.text()).toContain("2 KB");
    });

    it("should show bucket info", async () => {
        client.getInfo = jest.fn().mockResolvedValue(serverInfo);
        client.getBucketList = jest.fn().mockResolvedValue([{
            name: "bucket_1",
            entryCount: 2,
            size: 1000n,
            oldestRecord: 10n,
            latestRecord: 10000010n,
        }
        ]);

        const wrapper = mount(<Dashboard backendApi={backend}/>);
        const html = (await waitUntilFind(wrapper, "#bucket_1")).hostNodes();
        expect(html.text()).toContain("bucket_1");
        expect(html.text()).toContain("1 KB");
        expect(html.text()).toContain("10 seconds");
    });
});
