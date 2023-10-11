import React, {useEffect, useState} from "react";
import {Bucket, BucketInfo, EntryInfo, Client, TokenPermissions} from "reduct-js";
import {useHistory, useParams} from "react-router-dom";
import BucketCard, {getHistory} from "../../Components/Bucket/BucketCard";
// @ts-ignore
import prettierBytes from "prettier-bytes";
import {Table, Typography} from "antd";
import {DeleteOutlined} from "@ant-design/icons";
import RemoveConfirmationByName from "../../Components/RemoveConfirmationByName";

interface Props {
    client: Client;
    permissions?: TokenPermissions;
}


export default function BucketDetail(props: Readonly<Props>) {
    const {name} = useParams() as { name: string };
    const history = useHistory();

    const [info, setInfo] = useState<BucketInfo>();
    const [entries, setEntries] = useState<EntryInfo[]>([]);
    const [entryToRemove, setEntryToRemove] = useState<string>("");

    const getEntries = async () => {
        try {
            const {client} = props;
            const bucket: Bucket = await client.getBucket(name);
            setInfo(await bucket.getInfo());
            setEntries(await bucket.getEntryList());
        } catch (err) {
            console.error(err);
        }

    };

    const removeEntry = async (name: string) => {
        if (!info) {
            console.error("No bucket info");
            return;
        }

        const {client} = props;
        const bucket: Bucket = await client.getBucket(info.name);
        await bucket.removeEntry(name);
        setEntryToRemove("");
        getEntries().then();
    };

    useEffect(() => {
        getEntries().then();
        const interval = setInterval(() => getEntries(), 5000);
        return () => clearInterval(interval);
    }, []);


    const data = entries.map(entry => {
        const printIsoDate = (timestamp: bigint) => entry.recordCount !== 0n ?
            new Date(Number(timestamp / 1000n)).toISOString() :
            "---";
        return {
            name: entry.name,
            recordCount: entry.recordCount.toString(),
            blockCount: entry.blockCount.toString(),
            size: prettierBytes(Number(entry.size)),
            history: entry.recordCount !== 0n ? getHistory(entry) : "---",
            oldestRecord: printIsoDate(entry.oldestRecord),
            latestRecord: printIsoDate(entry.latestRecord)
        };
    });

    const columns = [
        {title: "Name", dataIndex: "name", key: "name"},
        {title: "Records", dataIndex: "recordCount", key: "recordCount"},
        {title: "Blocks", dataIndex: "blockCount", key: "blockCount"},
        {title: "Size", dataIndex: "size", key: "size"},
        {title: "History", dataIndex: "history", key: "history"},
        {title: "Oldest Record (UTC)", dataIndex: "oldestRecord", key: "oldestRecord"},
        {title: "Latest Record (UTC)", dataIndex: "latestRecord", key: "latestRecord"},
        {
            title: "",
            render: (_: any, entry: { name: string; }) => {
                if (props.permissions?.fullAccess || (props.permissions?.write && info && props.permissions?.write?.indexOf(info?.name) !== -1)) {
                    return <DeleteOutlined key={entry.name} style={{color: "red"}} title={"Remove entry"}
                                           onClick={() => setEntryToRemove(entry.name)}
                    />;
                }
                return <div/>;
            }
        }
    ];


    return <div style={{margin: "1.4em"}}>
        {info ? <BucketCard bucketInfo={info} index={0} {...props}
                            showPanel
                            onRemoved={() => history.push("/buckets")}
                            onShow={() => null}/> : <div/>}

        <Typography.Title level={3}>Entries</Typography.Title>
        <Table style={{margin: "0.6em"}} columns={columns} dataSource={data} loading={entries.length == 0}/>
        <RemoveConfirmationByName name={entryToRemove} onRemoved={() => removeEntry(entryToRemove)}
                                  onCanceled={() => setEntryToRemove("")} resourceType="entry"
                                  confirm={entryToRemove !== ""}/>
    </div>;
}
