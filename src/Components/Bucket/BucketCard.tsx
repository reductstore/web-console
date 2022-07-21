import React, {useState} from "react";
import {Card, Col, Modal, Row, Statistic} from "antd";
import humanizeDuration from "humanize-duration";
import {Bucket, BucketInfo, Client} from "reduct-js";

// @ts-ignore
import prettierBytes from "prettier-bytes";
import {DeleteOutlined, SettingOutlined} from "@ant-design/icons";

import "./BucketCard.css";
import CreateOrUpdate from "./CreateOrUpdate";

interface Props {
    bucketInfo: BucketInfo;
    client: Client;
    index: number;
    onRemoved: (name: string) => void;
}

export const getHistory = (interval: { latestRecord: bigint, oldestRecord: bigint }) => {
    return humanizeDuration(
        Number((interval.latestRecord - interval.oldestRecord) / 1000n),
        {largest: 1, round: true});
};

export default function BucketCard(props: Readonly<Props>) {
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [changeSettings, setChangeSettings] = useState(false);

    const {client, bucketInfo, index} = props;

    const n = (big: BigInt) => {
        return Number(big.valueOf());
    };


    const onRemoved = async () => {
        const bucket: Bucket = await client.getBucket(bucketInfo.name);
        await bucket.remove();
        setConfirmRemove(false);
        props.onRemoved(bucketInfo.name);
    };


    return (<Card className="BucketCard" key={index} id={bucketInfo.name} title={bucketInfo.name}
                  actions={[
                      <SettingOutlined title="Settings" onClick={() => setChangeSettings(true)}/>,
                      <DeleteOutlined title="Remove" onClick={() => setConfirmRemove(true)}/>,
                  ]}>
        <Row gutter={24}>
            <Col span={8}>
                <Statistic title="Size" value={prettierBytes(n(bucketInfo.size))}/>
            </Col>
            <Col span={6}>
                <Statistic title="Entries" value={n(bucketInfo.entryCount)}/>
            </Col>
            <Col span={10}>
                <Statistic title="History" value={bucketInfo.entryCount > 0n ? getHistory(bucketInfo) : "---"}/>
            </Col>
        </Row>
        <Modal visible={confirmRemove} onOk={onRemoved} onCancel={() => setConfirmRemove(false)} closable={false}
               okText="Remove"
               okType="danger">Remove <b>{bucketInfo.name}</b>?</Modal>
        <Modal title="Settings" visible={changeSettings} footer={null}
               onCancel={() => setChangeSettings(false)}>
            <CreateOrUpdate client={client} key={bucketInfo.name}
                            bucketName={bucketInfo.name}
                            onCreated={() => setChangeSettings(false)}/>
        </Modal>
    </Card>);

}
