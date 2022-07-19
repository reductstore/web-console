import React from "react";
import {mount, ReactWrapper} from "enzyme";
import waitUntil from "async-wait-until";
import {mockJSDOM} from "../../Helpers/TestHelpers";
import BucketPanel from "./BucketPanel";
import {BucketInfo, Client} from "reduct-js";

describe("BucketPanel", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockJSDOM();
    });

    it("should print table with information about buckets", async () => {
        const client = new Client("");
        client.getBucketList = jest.fn().mockResolvedValue([
            {
                name: "BucketWithData",
                entryCount: 2n,
                size: 10220n,
                oldestRecord: 0n,
                latestRecord: 10000n
            } as BucketInfo,
            {
                name: "EmptyBucket",
                entryCount: 0n,
                size: 0n,
                oldestRecord: 0n,
                latestRecord: 0n
            } as BucketInfo,
        ]);

        const panel = mount(<BucketPanel client={client}/>);
        await waitUntil(() => panel.update().find(".ant-table-row").length > 0);

        const rows = panel.find(".ant-table-row");
        expect(rows.length).toEqual(2);
        expect(rows.at(0).render().text())
            .toEqual("BucketWithData210 KB0 seconds1970-01-01T00:00:00.000Z1970-01-01T00:00:00.000Z");
        expect(rows.at(1).render().text())
            .toEqual("EmptyBucket00 B---------");

    });
});
