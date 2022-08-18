import React, {useEffect, useState} from "react";
import {BucketInfo, Client} from "reduct-js";
import {Button, Modal, Table, Typography} from "antd";
// @ts-ignore
import prettierBytes from "prettier-bytes";

import "../../App.css";
import {getHistory} from "../../Components/Bucket/BucketCard";
import {Link} from "react-router-dom";
import {PlusOutlined} from "@ant-design/icons";
import CreateOrUpdate from "../../Components/Bucket/CreateOrUpdate";


interface Props {
    client: Client;
}


/**
 * Bucket View
 */
export default function BucketList(props: Readonly<Props>) {
    const [buckets, setBucckets] = useState<BucketInfo[]>([]);
    const [creatingBucket, setCreatingBucket] = useState(false);

    useEffect(() => {
        const {client} = props;
        client.getBucketList().then((buckets: BucketInfo[]) => {
            setBucckets(buckets);
        });
    }, [creatingBucket]);


    const data = buckets.map(bucket => {
        const printIsoDate = (timestamp: bigint) => bucket.entryCount !== 0n ?
            new Date(Number(timestamp / 1000n)).toISOString() :
            "---";
        return {
            name: bucket.name,
            entryCount: bucket.entryCount.toString(),
            size: prettierBytes(Number(bucket.size)),
            history: bucket.entryCount !== 0n ? getHistory(bucket) : "---",
            oldestRecord: printIsoDate(bucket.oldestRecord),
            latestRecord: printIsoDate(bucket.latestRecord),
        };
    });

    const columns = [
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
            render: (text: string) => <Link to={`buckets/${text}`}><b>{text}</b></Link>
        },
        {title: "Entries", dataIndex: "entryCount", key: "entryCount"},
        {title: "Size", dataIndex: "size", key: "size"},
        {title: "History", dataIndex: "history", key: "history"},
        {title: "Oldest Record (UTC)", dataIndex: "oldestRecord", key: "oldestRecord"},
        {title: "Latest Record (UTC)", dataIndex: "latestRecord", key: "latestRecord"}
    ];

    return <div style={{margin: "2em"}}>
        <Typography.Title level={3}>
            Buckets
            <Button style={{float: "right"}} icon={<PlusOutlined/>}
                    onClick={() => setCreatingBucket(true)} title="Add"/>
            <Modal title="Add a new bucket" visible={creatingBucket} footer={null}
                   onCancel={() => setCreatingBucket(false)}>
                <CreateOrUpdate client={props.client}
                                onCreated={async () => {
                                    setCreatingBucket(false);
                                }}/>
            </Modal>

        </Typography.Title>
        <Table columns={columns} dataSource={data} loading={buckets.length == 0}/>
    </div>;
}
