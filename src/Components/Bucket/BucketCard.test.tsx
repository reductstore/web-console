import {mockJSDOM, waitUntilFind} from "../../Helpers/TestHelpers";
import {mount} from "enzyme";
import BucketCard from "./BucketCard";
import {BucketInfo, Client} from "reduct-js";

describe("BucketCard", () => {
    beforeEach(() => mockJSDOM());
    it("should call a callback when settings is pressed", async () => {
        const info: BucketInfo = {
            name: "bucket",
            entryCount: 5n,
            size: 50000n,
            oldestRecord: 0n,
            latestRecord: 1000000n,
        };

        const client = new Client("");
        const onRemove = jest.fn();

        const wrapper = mount(<BucketCard bucketInfo={info} client={client} index={0} onRemoved={onRemove} onShow={()=>null}/>);
        const button = await waitUntilFind(wrapper, {title: "Settings"});

        button.hostNodes().simulate("click");
        /* TODO: How to test modal? */
    });
});
