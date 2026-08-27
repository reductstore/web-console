import React from "react";
import { Client, TokenPermissions } from "reduct-js";
import QueryPanel from "../../Components/QueryPanel/QueryPanel";
import "../BucketPanel/EntryDetail.css";

interface Props {
  client: Client;
  apiUrl: string;
  permissions?: TokenPermissions;
}

export default function QueryPanelPage(props: Readonly<Props>) {
  return (
    <div className="entryDetail">
      <QueryPanel
        client={props.client}
        apiUrl={props.apiUrl}
        permissions={props.permissions}
        showSelectionControls
        title="Data Explorer"
      />
    </div>
  );
}
