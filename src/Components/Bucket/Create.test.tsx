import {mount} from "enzyme";
import waitUntil from "async-wait-until";
import {mockJSDOM} from "../../mockJSDOM";

mockJSDOM();

import Create from "./Create";
import {BucketSettings, Client, QuotaType} from "reduct-js";


describe("Bucket::Create", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const client = new Client("");
    const defaults: BucketSettings = {
        maxBlockSize: 67108864n,
        quotaSize: 0n,
        quotaType: QuotaType.NONE,
    };

    const wrapper = mount(<Create client={client} defaults={defaults} onCreated={() => console.log("")}/>);
    it("should show default values", async () => {
        await waitUntil(() => wrapper.update().find({name: "maxBlockSize"}).length > 0);
        expect(wrapper.find({name: "maxBlockSize"}).at(0).props().initialValue).toEqual("64");
        expect(wrapper.find({name: "quotaType"}).at(0).props().children.props.defaultValue).toEqual("NONE");
        expect(wrapper.find({name: "quotaSize"}).at(0).props().initialValue).toEqual("0");
    });

});
