import React from "react";
import {BucketInfo, Client} from "reduct-js";
import {Table, Typography} from "antd";
// @ts-ignore
import prettierBytes from "prettier-bytes";

import "../../App.css";
import {getHistory} from "../../Components/Bucket/BucketCard";
import {Link} from "react-router-dom";


interface Props {
    client: Client;
}

type State = {
    buckets: BucketInfo[]
};

/**
 * Bucket View
 */
export default class BucketPanel extends React.Component<Props, State> {
    constructor(props: Readonly<Props>) {
        super(props);
        this.state = {buckets: []};
    }

    componentDidMount() {
        const {client} = this.props;
        client.getBucketList().then((buckets: BucketInfo[]) => {
            this.setState({buckets});
        });
    }

    render() {
        const {buckets} = this.state;
        const data = buckets.map(bucket => {
            const printIsoDate = (timestamp: bigint) => bucket.entryCount !== 0n ?
                new Date(Number(bucket.oldestRecord / 1000n)).toISOString() :
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
            {title: "Name", dataIndex: "name", key: "name", render: (text: string) => <Link to={`buckets/${text}`}><b>{text}</b></Link>},
            {title: "Entries", dataIndex: "entryCount", key: "entryCount"},
            {title: "Size", dataIndex: "size", key: "size"},
            {title: "History", dataIndex: "history", key: "history"},
            {title: "Oldest Record (UTC)", dataIndex: "oldestRecord", key: "oldestRecord"},
            {title: "Latest Record (UTC)", dataIndex: "latestRecord", key: "latestRecord"}
        ];

        return <div style={{margin: "2em"}}>
            <Typography.Title level={3}>Buckets</Typography.Title>
            <Table columns={columns} dataSource={data} loading={buckets.length == 0}/>
        </div>;
    }
}
