import React, {useEffect, useState} from "react";
import {IBackendAPI} from "../../BackendAPI";
import {ServerInfo, BucketInfo, TokenPermissions} from "reduct-js";
import humanizeDuration from "humanize-duration";
// @ts-ignore
import prettierBytes from "prettier-bytes";
import {Card, Col, Divider, Modal, Row, Statistic, Typography} from "antd";
import "./Dashboard.css";
import BucketCard from "../../Components/Bucket/BucketCard";
import CreateOrUpdate from "../../Components/Bucket/CreateOrUpdate";

import {PlusOutlined} from "@ant-design/icons";
import {useHistory} from "react-router-dom";
import {History} from "history";

interface Props {
    backendApi: IBackendAPI;
    permissions?: TokenPermissions;
}

/**
 * Dashboard with information about the server and list of buckets
 */
export default function Dashboard(props: Readonly<Props>) {
    const history = useHistory();

    const [info, setInfo] = useState<ServerInfo | undefined>();
    const [buckets, setBuckets] = useState<BucketInfo[]>([]);
    const [creatingBucket, setCreatingBucket] = useState(false);

    const getInfo = async () => {
        try {
            const {client} = props.backendApi;
            setInfo(await client.getInfo());
            setBuckets((await client.getBucketList())
                .sort((a, b) => Number(b.latestRecord - a.latestRecord)));
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        getInfo().catch(err => console.error(err));
    }, [creatingBucket]);


    const removeBucket = async (name: string) => {
        try {
            await getInfo();
        } catch (err) {
            console.error("Failed to remove %s : %s", name, err);
        }
    };

    const showBucket = async (name: string, history: History<unknown>) => {
        history.push(`/buckets/${name}`);
    };

    console.log(info);
    if (info === undefined) {
        return <Card bordered title="Server (no connection)"/>;
    }

    const n = (big: BigInt) => {
        return Number(big.valueOf());
    };

    const renderBucket = (numberInRow = 2) => {
        const fillRow = (row: number) => {
            const cards = [];
            for (let j = 0; j < numberInRow; ++j) {
                const index = row * numberInRow + j;
                if (index >= buckets.length) {
                    break;
                }

                const bucket = buckets[index];
                cards.push(
                    <Col span={24 / numberInRow} key={index}>
                        <BucketCard bucketInfo={bucket} index={index} key={index}
                                    client={client}
                                    onRemoved={removeBucket}
                                    onShow={(name) => showBucket(name, history)}/>
                    </Col>);
            }
            return cards;
        };

        const rows = [];
        for (let i = 0; i < buckets.length / numberInRow; ++i) {
            rows.push(
                <Row key={i}> {fillRow(i)}</Row>
            );
        }
        return rows;
    };

    const allowedActions = [];
    if (props.permissions && props.permissions.fullAccess) {
        allowedActions.push(<PlusOutlined key="create" onClick={() => setCreatingBucket(true)}/>);
    }

    const {client} = props.backendApi;
    return <div className="Panel">
        <Card bordered={true} id="ServerInfo" title={`Server v${info.version}`}
              actions={allowedActions}>

            <Modal title="Add a new bucket" visible={creatingBucket} footer={null}
                   onCancel={() => setCreatingBucket(false)}>
                <CreateOrUpdate client={client}
                                onCreated={async () => {
                                    setCreatingBucket(false);
                                }}/>
            </Modal>

            <Row gutter={16}>
                <Col span={8}>
                    <Statistic title="Usage" value={prettierBytes(n(info.usage))}/>
                </Col>
                <Col span={8}>
                    <Statistic title="Buckets" value={buckets.length}/>
                </Col>
                <Col span={8}>
                    <Statistic title="Uptime" value={humanizeDuration(n(info.uptime) * 1000, {largest: 1})}/>
                </Col>
            </Row>
        </Card>
        <Divider/>
        <Typography.Title level={3}>Buckets</Typography.Title>
        {renderBucket()}
    </div>;
}

