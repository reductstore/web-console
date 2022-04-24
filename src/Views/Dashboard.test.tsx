import React from "react";
import {mount} from "enzyme";
import waitUntil from "async-wait-until";

import Dashboard from "./Dashboard";
import {Client} from "reduct-js";

describe("Dashboard", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const client = new Client("");

    it("should show server info", async () => {
        client.getInfo = jest.fn().mockResolvedValue({
            version: "0.4.0",
            uptime: 1000n,
            usage: 2000n,
            bucketCount: 2,
            oldestRecord: 10n,
            latestRecord: 10010n,

        });
        client.getBucketList = jest.fn().mockResolvedValue([]);


        const wrapper = mount(<Dashboard client={client}/>);
        await waitUntil(() => wrapper.update().find("#ServerInfo").hostNodes().length > 0);
    });
});
