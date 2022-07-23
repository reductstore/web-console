import React, {useEffect, useState} from "react";
import {Bucket, BucketInfo, EntryInfo, Client} from "reduct-js";
import {useHistory, useParams} from "react-router-dom";
import BucketCard, {getHistory} from "../../Components/Bucket/BucketCard";
// @ts-ignore
import prettierBytes from "prettier-bytes";
import {Table, Typography} from "antd";

interface Props {
    client: Client;
}


export default function BucketDetail(props: Readonly<Props>) {
    const {name} = useParams() as { name: string };
    const history = useHistory();

    const [info, setInfo] = useState<BucketInfo>();
    const [entries, setEntries] = useState<EntryInfo[]>([]);

    useEffect(() => {
        props.client.getBucket(name)
            .then(async (bucket: Bucket) => {
                setInfo(await bucket.getInfo());
                setEntries(await bucket.getEntryList());
            })
            .catch(err => console.error(err));
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
            latestRecord: printIsoDate(entry.latestRecord),
        };
    });

    const columns = [
        {title: "Name", dataIndex: "name", key: "name"},
        {title: "Records", dataIndex: "recordCount", key: "recordCount"},
        {title: "Blocks", dataIndex: "blockCount", key: "blockCount"},
        {title: "Size", dataIndex: "size", key: "size"},
        {title: "History", dataIndex: "history", key: "history"},
        {title: "Oldest Record (UTC)", dataIndex: "oldestRecord", key: "oldestRecord"},
        {title: "Latest Record (UTC)", dataIndex: "latestRecord", key: "latestRecord"}
    ];

    return <div style={{margin: "1.4em"}}>
        {info ? <BucketCard bucketInfo={info} index={0} client={props.client}
                            onRemoved={() => history.push("/buckets")}/> : <div/>}

        <Typography.Title level={3}>Records</Typography.Title>
        <Table style={{margin: "0.6em"}} columns={columns} dataSource={data} loading={entries.length == 0}/>
    </div>;
}
