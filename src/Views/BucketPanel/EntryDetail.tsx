import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useHistory, useParams } from "react-router-dom";
import { Alert } from "antd";
import { Bucket, Client, EntryInfo, Status, TokenPermissions } from "reduct-js";
import EntryCard from "../../Components/Entry/EntryCard";
import EntryAttachmentsCard from "../../Components/Entry/EntryAttachmentsCard";
import QueryPanel from "../../Components/QueryPanel/QueryPanel";
import { checkWritePermission } from "../../Helpers/permissionUtils";
import "./EntryDetail.css";

interface CustomPermissions {
  write?: string[];
  fullAccess: boolean;
}

interface Props {
  client: Client;
  apiUrl: string;
  permissions?: CustomPermissions;
}

export default function EntryDetail(props: Readonly<Props>) {
  const { bucketName, entryName } = useParams() as {
    bucketName: string;
    entryName: string;
  };
  const decodedEntryName = useMemo(() => {
    try {
      return decodeURIComponent(entryName);
    } catch {
      return entryName;
    }
  }, [entryName]);
  const history = useHistory();
  const permissions = props.permissions || { write: [], fullAccess: false };
  const [entryInfo, setEntryInfo] = useState<EntryInfo>();
  const [availableEntries, setAvailableEntries] = useState<string[]>([]);
  const [allEntriesInfo, setAllEntriesInfo] = useState<EntryInfo[]>([]);
  const [isEntryInfoLoading, setIsEntryInfoLoading] = useState(false);

  useEffect(() => {
    const getEntryInfo = async () => {
      setIsEntryInfoLoading(true);
      try {
        const bucket: Bucket = await props.client.getBucket(bucketName);
        const entries = await bucket.getEntryList();
        setAllEntriesInfo(entries);
        setAvailableEntries(entries.map((entry) => entry.name));
        setEntryInfo(entries.find((entry) => entry.name === decodedEntryName));
      } catch (err) {
        console.error(err);
      } finally {
        setIsEntryInfoLoading(false);
      }
    };

    getEntryInfo().then();
  }, [bucketName, decodedEntryName, props.client]);

  const hasWritePermission = checkWritePermission(permissions, bucketName);
  const uploadTriggerRef = useRef<(() => void) | null>(null);

  const hasSubEntries = useMemo(
    () =>
      availableEntries.some((name) => name.startsWith(`${decodedEntryName}/`)),
    [availableEntries, decodedEntryName],
  );

  return (
    <div className="entryDetail">
      <EntryCard
        entryInfo={
          entryInfo ??
          ({
            name: decodedEntryName,
            size: 0n,
            recordCount: 0n,
            blockCount: 0n,
            oldestRecord: 0n,
            latestRecord: 0n,
            status: Status.READY,
          } as EntryInfo)
        }
        bucketName={bucketName}
        permissions={permissions as TokenPermissions}
        client={props.client}
        onRemoved={(removedEntryName) => {
          const prefix = `${removedEntryName}/`;
          setAvailableEntries((prev) =>
            prev.filter(
              (name) => name !== removedEntryName && !name.startsWith(prefix),
            ),
          );
          setAllEntriesInfo((prev) =>
            prev.filter(
              (entry) =>
                entry.name !== removedEntryName &&
                !entry.name.startsWith(prefix),
            ),
          );
          if (removedEntryName === decodedEntryName) {
            history.push(`/buckets/${bucketName}`);
          }
        }}
        hasWritePermission={hasWritePermission}
        onAddRecord={() => uploadTriggerRef.current?.()}
        allEntryNames={availableEntries}
        allEntries={allEntriesInfo}
        loading={isEntryInfoLoading || !entryInfo}
      />
      <EntryAttachmentsCard
        client={props.client}
        bucketName={bucketName}
        entryName={decodedEntryName}
        editable={hasWritePermission}
      />
      <QueryPanel
        client={props.client}
        apiUrl={props.apiUrl}
        permissions={permissions as TokenPermissions}
        initialBucketName={bucketName}
        initialEntries={[decodedEntryName]}
        title="Query"
        allowUpload={hasWritePermission}
        uploadTriggerRef={uploadTriggerRef}
        autoFetchOnSelectionChange
        warning={
          hasSubEntries ? (
            <Alert
              type="warning"
              showIcon
              message={
                <span>
                  This entry has sub-entries. Use the{" "}
                  <Link to="/query">
                    <strong>Query page</strong>
                  </Link>{" "}
                  to query them with a wildcard pattern.
                </span>
              }
              style={{ marginBottom: 16 }}
            />
          ) : undefined
        }
      />
    </div>
  );
}
