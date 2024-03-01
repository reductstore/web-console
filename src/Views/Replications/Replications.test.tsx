import React from "react";
import {ReactWrapper, mount} from "enzyme";
import {Modal, Table} from "antd";
import {MemoryRouter} from "react-router-dom";

import Replications from "./Replications";
import {Client} from "reduct-js";
import {mockJSDOM, waitUntilFind} from "../../Helpers/TestHelpers";

describe("Replications", () => {
  const client = new Client("dummyURL");
  let wrapper: ReactWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJSDOM();

    client.getReplicationList = jest.fn().mockResolvedValue([
      {name: "Replication1", isActive: true, isProvisioned: false, pendingRecords: 100n},
      {name: "Replication2", isActive: false, isProvisioned: true, pendingRecords: 50n},
    ]);

    wrapper = mount(
      <MemoryRouter>
        <Replications client={client} permissions={{fullAccess: true}} />
      </MemoryRouter>
    );
  });

  afterEach(() => {
    if (wrapper && wrapper.length) {
      wrapper.unmount();
    }
  });

  it("renders without crashing", () => {
    expect(wrapper.find(Table).exists()).toBeTruthy();
  });

  it("fetches and displays replication data correctly", async () => {
    await waitUntilFind(wrapper, "tr.ant-table-row");
    const rows = wrapper.find("tr.ant-table-row");

    expect(rows.length).toEqual(2);

    expect(rows.at(0).find("a").text()).toEqual("Replication1");
    expect(rows.at(0).find("span.ant-tag-success").text()).toEqual("Active");
    expect(rows.at(0).find("span.ant-tag-processing").exists()).toBeFalsy();
    expect(rows.at(0).find("td").at(2).text()).toEqual("100");

    expect(rows.at(1).find("a").text()).toEqual("Replication2");
    expect(rows.at(1).find("span.ant-tag-error").text()).toEqual("Inactive");
    expect(rows.at(1).find("span.ant-tag-processing").text()).toEqual("Provisioned");
    expect(rows.at(1).find("td").at(2).text()).toEqual("50");
  });

  it("shows the add replication button", () => {
    expect(wrapper.find("button").exists()).toBeTruthy();
  });

  it("does not show the add replication button if the user does not have full access", () => {
    wrapper = mount(
      <MemoryRouter>
        <Replications client={client} permissions={{fullAccess: false}} />
      </MemoryRouter>
    );
    expect(wrapper.find("button").exists()).toBeFalsy();
  });

  it("opens the create replication modal", async () => {
    wrapper.find("button").simulate("click");
    await waitUntilFind(wrapper, {name: "replicationForm"});
    expect(wrapper.find(Modal).prop("open")).toBeTruthy();
  });

  it("closes the create replication modal", async () => {
    wrapper.find("button").simulate("click");
    await waitUntilFind(wrapper, {name: "replicationForm"});
    wrapper.find(".ant-modal-close-x").simulate("click");
    expect(wrapper.find(Modal).prop("open")).toBeFalsy();
  });
});
