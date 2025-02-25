import { mockJSDOM, waitUntilFind } from "../../Helpers/TestHelpers";
import { mount } from "enzyme";
import BucketCard from "./BucketCard";
import { BucketInfo, Client } from "reduct-js";

describe("BucketCard", () => {
  beforeEach(() => mockJSDOM());

  const info: BucketInfo = {
    name: "bucket",
    entryCount: 5n,
    size: 50000n,
    oldestRecord: 0n,
    latestRecord: 1000000n,
    isProvisioned: false,
  };

  const client = new Client("");
  const onRemove = jest.fn();

  it("should call a callback when settings is pressed", async () => {
    const wrapper = mount(
      <BucketCard
        bucketInfo={info}
        permissions={{ fullAccess: true }}
        showPanel
        client={client}
        index={0}
        onRemoved={onRemove}
        onShow={() => null}
      />,
    );
    const button = await waitUntilFind(wrapper, { title: "Settings" });

    button.hostNodes().simulate("click");
    /* TODO: How to test modal? */
  });

  it("should call a callback when remove is pressed", async () => {
    const wrapper = mount(
      <BucketCard
        bucketInfo={info}
        permissions={{ fullAccess: true }}
        showPanel
        client={client}
        index={0}
        onRemoved={onRemove}
        onShow={() => null}
      />,
    );
    const button = await waitUntilFind(wrapper, { title: "Remove" });

    button.hostNodes().simulate("click");
    /* TODO: How to test modal? */
  });

  it("should show a tag if provisioned", async () => {
    const wrapper = mount(
      <BucketCard
        bucketInfo={{ ...info, isProvisioned: true }}
        permissions={{ fullAccess: true }}
        showPanel
        client={client}
        index={0}
        onRemoved={onRemove}
        onShow={() => null}
      />,
    );
    const tag = await waitUntilFind(wrapper, ".ant-tag");
    expect(tag.hostNodes().render().text()).toEqual("Provisioned");
  });

  it("should not show remove button if provisioned", async () => {
    const wrapper = mount(
      <BucketCard
        bucketInfo={{ ...info, isProvisioned: true }}
        permissions={{ fullAccess: true }}
        showPanel
        client={client}
        index={0}
        onRemoved={onRemove}
        onShow={() => null}
      />,
    );
    const button = wrapper.find({ title: "Remove" });
    expect(button.length).toEqual(0);
  });
});
