import React from "react";
import {mount} from "enzyme";
import waitUntil from "async-wait-until";
import {mockJSDOM} from "../../Helpers/TestHelpers";
import {Bucket, BucketInfo, Client, EntryInfo} from "reduct-js";

jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"), // use actual for all non-hook parts
    useParams: () => ({
        name: "testBucket"
    }),
}));


import BucketDetail from "./BucketDetail";

describe("BucketDetail", () => {
    const client = new Client("");
    const bucket = {} as Bucket;

    beforeEach(() => {
        jest.clearAllMocks();
        mockJSDOM();

        client.getBucket = jest.fn().mockResolvedValue(bucket);

        bucket.getInfo = jest.fn().mockResolvedValue({
            name: "BucketWithData",
            entryCount: 2n,
            size: 10220n,
            oldestRecord: 0n,
            latestRecord: 10000n
        } as BucketInfo);

        bucket.getEntryList = jest.fn().mockResolvedValue([
            {
                name: "EntryWithData",
                blockCount: 2n,
                recordCount: 100n,
                size: 10220n,
                oldestRecord: 0n,
                latestRecord: 10000n
            } as EntryInfo,
            {
                name: "EmptyEntry",
                blockCount: 0n,
                recordCount: 0n,
                size: 0n,
                oldestRecord: 0n,
                latestRecord: 10000n
            } as EntryInfo,
        ]);
    });


    it("should show bucket card ", async () => {
        const detail = mount(<BucketDetail client={client}/>);
        await waitUntil(() => detail.update().find(".BucketCard").length > 0);

        expect(client.getBucket).toBeCalledWith("testBucket");


        const card = detail.find(".BucketCard");
        expect(card.hostNodes().render().text()).toEqual("BucketWithDataSize10 KBEntries2History0 seconds");
    });

    it("should show entry table ", async () => {
        const detail = mount(<BucketDetail client={client}/>);
        await waitUntil(() => detail.update().find(".ant-table-row").length > 0);

        const rows = detail.find(".ant-table-row");
        expect(rows.length).toEqual(2);
        expect(rows.at(0).render().text())
            .toEqual("EntryWithData100210 KB0 seconds1970-01-01T00:00:00.000Z1970-01-01T00:00:00.000Z");
        expect(rows.at(1).render().text())
            .toEqual("EmptyEntry000 B---------");
    });
});
