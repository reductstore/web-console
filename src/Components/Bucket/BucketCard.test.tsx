import {mockJSDOM} from "../../mockJSDOM";

mockJSDOM();

import {mount} from "enzyme";
import BucketCard from "./BucketCard";
import {BucketInfo} from "reduct-js";

describe("BucketCard", () => {
    const info: BucketInfo = {
        name: "bucket",
        entryCount: 5n,
        size: 50000n,
        oldestRecord: 0n,
        latestRecord: 1000000n,
    };

    const onRemove = jest.fn();
    const onSettings = jest.fn();
    const wrapper = mount(<BucketCard bucket={info} index={0} onRemove={onRemove} onSettings={onSettings}/>);

    it("should call a callback when settings is pressed", async () => {
        const button = wrapper.find({title: "Settings"}).at(0);
        button.simulate("click");

        expect(onSettings).toBeCalledWith("bucket");
    });
});
