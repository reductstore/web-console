import React from "react";
import { ReactWrapper, mount } from "enzyme";
import { Modal, Table } from "antd";
import { MemoryRouter } from "react-router-dom";
import { act } from "react-dom/test-utils";
import Replications from "./Replications";
import { Client } from "reduct-js";
import { mockJSDOM, waitUntilFind } from "../../Helpers/TestHelpers";

describe("Replications", () => {
  const client = new Client("dummyURL");
  let wrapper: ReactWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJSDOM();

    client.getReplicationList = jest.fn().mockResolvedValue([
      {
        name: "Replication1",
        isActive: true,
        isProvisioned: false,
        pendingRecords: 100n,
      },
      {
        name: "Replication2",
        isActive: false,
        isProvisioned: true,
        pendingRecords: 50n,
      },
    ]);
  });

  afterEach(() => {
    if (wrapper && wrapper.length) {
      wrapper.unmount();
    }
  });

  const mountComponent = () => {
    wrapper = mount(
      <MemoryRouter>
        <Replications client={client} permissions={{ fullAccess: true }} />
      </MemoryRouter>,
    );
  };

  it("renders without crashing", () => {
    mountComponent();
    expect(wrapper.find(Table).exists()).toBeTruthy();
  });

  it("fetches and displays replication data correctly", async () => {
    mountComponent();
    await waitUntilFind(wrapper, "tr.ant-table-row");
    const rows = wrapper.find("tr.ant-table-row");

    expect(rows.length).toEqual(2);

    expect(rows.at(0).find("a").text()).toEqual("Replication1");
    expect(rows.at(0).find("span.ant-tag-success").text()).toEqual(
      "Target Reachable",
    );
    expect(rows.at(0).find("span.ant-tag-processing").exists()).toBeFalsy();
    expect(rows.at(0).find("td").at(2).text()).toEqual("100");
    expect(rows.at(0).find("td").at(3).text()).toEqual("Target Reachable");

    expect(rows.at(1).find("a").text()).toEqual("Replication2");
    expect(rows.at(1).find("span.ant-tag-error").text()).toEqual(
      "Target Unreachable",
    );
    expect(rows.at(1).find("span.ant-tag-processing").text()).toEqual(
      "Provisioned",
    );
    expect(rows.at(1).find("td").at(2).text()).toEqual("50");
    expect(rows.at(1).find("td").at(3).text()).toEqual(
      "Target UnreachableProvisioned",
    );
  });

  it("shows the add replication button", () => {
    mountComponent();
    expect(wrapper.find("button").exists()).toBeTruthy();
  });

  it("does not show the add replication button if the user does not have full access", () => {
    wrapper = mount(
      <MemoryRouter>
        <Replications client={client} permissions={{ fullAccess: false }} />
      </MemoryRouter>,
    );
    expect(wrapper.find("button").exists()).toBeFalsy();
  });

  it("opens the create replication modal", async () => {
    mountComponent();
    wrapper.find("button").simulate("click");
    await waitUntilFind(wrapper, { name: "replicationForm" });
    expect(wrapper.find(Modal).prop("open")).toBeTruthy();
  });

  it("closes the create replication modal", async () => {
    mountComponent();
    wrapper.find("button").simulate("click");
    await waitUntilFind(wrapper, { name: "replicationForm" });
    wrapper.find(".ant-modal-close-x").simulate("click");
    expect(wrapper.find(Modal).prop("open")).toBeFalsy();
  });

  it("should show loading state while fetching replications", async () => {
    let resolveGetReplications: (value: any) => void;
    const getReplicationsPromise = new Promise((resolve) => {
      resolveGetReplications = resolve;
    });

    client.getReplicationList = jest
      .fn()
      .mockReturnValue(getReplicationsPromise);

    wrapper = mount(
      <MemoryRouter>
        <Replications client={client} permissions={{ fullAccess: true }} />
      </MemoryRouter>,
    );

    expect(wrapper.find(".ant-spin").exists()).toBe(true);

    await act(async () => {
      resolveGetReplications([
        {
          name: "Replication1",
          isActive: true,
          isProvisioned: false,
          pendingRecords: 100n,
        },
      ]);
    });

    wrapper.update();
    expect(wrapper.find(".ant-spin").exists()).toBe(false);
  });
});
