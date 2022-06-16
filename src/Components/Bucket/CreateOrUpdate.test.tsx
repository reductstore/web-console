import {mount} from "enzyme";
import waitUntil from "async-wait-until";
import {mockJSDOM} from "../../Helpers/TestHelpers";


import CreateOrUpdate from "./CreateOrUpdate";
import {Client, QuotaType} from "reduct-js";


describe("Bucket::Create", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockJSDOM();

    });

    const client = new Client("");

    it("should show default values for a new bucket", async () => {
        client.getInfo = jest.fn().mockResolvedValue(
            {
                defaults: {
                    bucket: {
                        maxBlockSize: 67108864n,
                        quotaSize: 0n,
                        quotaType: QuotaType.NONE
                    }
                }
            }
        );
        const wrapper = mount(<CreateOrUpdate client={client} onCreated={() => console.log("")}/>);

        await waitUntil(() => wrapper.update().find({name: "maxBlockSize"}).length > 0);
        expect(wrapper.find({name: "maxBlockSize"}).at(0).props().initialValue).toEqual("64");
        expect(wrapper.find({name: "quotaType"}).at(0).props().initialValue).toEqual("NONE");
        expect(wrapper.find({name: "quotaSize"}).at(0).props().initialValue).toEqual("0");
    });

    it("should show current settings for a updated bucket", async () => {
        client.getBucket = jest.fn().mockResolvedValue(
            {
                getSettings: jest.fn().mockResolvedValue({
                    maxBlockSize: 67108864n,
                    quotaSize: 1024n,
                    quotaType: QuotaType.FIFO
                }),
            }
        );

        const wrapper = mount(<CreateOrUpdate client={client} bucketName="bucket" onCreated={() => console.log("")}/>);


        await waitUntil(() => wrapper.update().find({name: "maxBlockSize"}).length > 0);
        expect(wrapper.find({name: "maxBlockSize"}).at(0).props().initialValue).toEqual("64");
        expect(wrapper.find({name: "quotaType"}).at(0).props().initialValue).toEqual("FIFO");
        expect(wrapper.find({name: "quotaSize"}).at(0).props().initialValue).toEqual("1");
    });

    it("should show error if don't get settings", async () => {
        client.getInfo = jest.fn().mockRejectedValue({status: 500, message: "Oops"});
        const wrapper = mount(<CreateOrUpdate client={client} onCreated={() => console.log("")}/>);

        await waitUntil(() => wrapper.update().find({type: "error"}).length > 0);
        expect(wrapper.render().text()).toContain("Oops");
    });
});
