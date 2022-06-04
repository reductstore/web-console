import React from "react";
import {mount, ReactWrapper} from "enzyme";
import waitUntil from "async-wait-until";
import {mockJSDOM} from "../../mockJSDOM";

import Dashboard from "./Dashboard";
import {Client, ServerInfo} from "reduct-js";

describe("Dashboard", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockJSDOM();
    });

    const client = new Client("");

    const waitFor = async (wrapper: ReactWrapper, selector: string) => {
        await waitUntil(() => wrapper.update().find(selector).hostNodes().length > 0);
        return wrapper.render().find(selector);
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

        const wrapper = mount(<Dashboard client={client}/>);
        const html = await waitFor(wrapper, "#ServerInfo");

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

        const wrapper = mount(<Dashboard client={client}/>);
        const html = await waitFor(wrapper, "#bucket_1");
        expect(html.text()).toContain("bucket_1");
        expect(html.text()).toContain("1 KB");
        expect(html.text()).toContain("10 seconds");
    });
});
