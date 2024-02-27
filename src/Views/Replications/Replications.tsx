import React, {useEffect, useState} from "react";
import {ReplicationInfo, Client, TokenPermissions, BucketInfo} from "reduct-js";
import {Button, Modal, Table, Tag, Typography} from "antd";

import "../../App.css";
import {Link} from "react-router-dom";
import {PlusOutlined} from "@ant-design/icons";
import CreateOrUpdate from "../../Components/Replication/CreateOrUpdate";


interface Props {
    client: Client;
    permissions?: TokenPermissions;
}


/**
 * Replications View
 */
export default function Replications(props: Readonly<Props>) {
    const [replications, setReplications] = useState<ReplicationInfo[]>([]);
    const [buckets, setBuckets] = useState<BucketInfo[]>([]);

    const [creatingReplication, setCreatingReplication] = useState(false);

    const getReplications = async () => {
        try {
            const {client} = props;
            const replicationList: ReplicationInfo[] = await client.getReplicationList();
            setReplications(replicationList);
        } catch (err) {
            console.error(err);
        }
    };

    const getBuckets = async () => {
        try {
            const {client} = props;
            const bucketList: BucketInfo[] = await client.getBucketList();
            setBuckets(bucketList);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        getReplications().then();
        const interval = setInterval(() => getReplications(), 5000);
        return () => clearInterval(interval);
    }, [creatingReplication]);


    useEffect(() => {
        getBuckets().then();
        const interval = setInterval(() => getBuckets(), 5000);
        return () => clearInterval(interval);
    }, []);


    const data = replications.map((replication, index) => {
        return {
            key: `replication-${index}`,
            name: replication.name,
            isActive: replication.isActive,
            isProvisioned: replication.isProvisioned,
            pendingRecords: replication.pendingRecords.toString(),
        };
    });

    const columns = [
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
            render: (text: string) => <Link to={`replications/${text}`}><b>{text}</b></Link>
        },
        {
            title: "Active",
            dataIndex: "isActive",
            key: "isActive",
            render: (isActive: boolean) => {
                if (isActive) {
                    return <Tag color="success">Active</Tag>;
                } else {
                    return <Tag color="error">Inactive</Tag>;
                }
            }
        },
        {
            title: "Provisioned",
            dataIndex: "isProvisioned",
            key: "isProvisioned",
            render: (isProvisioned: boolean) => {
                if (isProvisioned) {
                    return <Tag color="processing">Provisioned</Tag>;
                } else {
                    return <div />;
                }
            }
        },
        {title: "Pending Records", dataIndex: "pendingRecords", key: "pendingRecords"},
    ];

    return <div style={{margin: "2em"}}>
        <Typography.Title level={3}>
            Replications
            {props.permissions?.fullAccess ?
                <Button style={{float: "right"}} icon={<PlusOutlined />}
                    onClick={() => setCreatingReplication(true)} title="Add" /> : null}

            <Modal title="Add a new replication" open={creatingReplication} footer={null}
                onCancel={() => setCreatingReplication(false)}>
                <CreateOrUpdate client={props.client}
                    onCreated={async () => {
                        setCreatingReplication(false);
                    }}
                    sourceBuckets={buckets.map((bucket) => bucket.name)}
                />
            </Modal>

        </Typography.Title>
        <Table columns={columns} dataSource={data} loading={replications.length == 0} />
    </div>;
}
