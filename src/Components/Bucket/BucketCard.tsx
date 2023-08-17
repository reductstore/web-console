import React, {useState} from "react";
import {Card, Col, Modal, Row, Statistic} from "antd";
import humanizeDuration from "humanize-duration";
import {Bucket, BucketInfo, Client, TokenPermissions} from "reduct-js";

// @ts-ignore
import prettierBytes from "prettier-bytes";
import {DeleteOutlined, SettingOutlined} from "@ant-design/icons";

import "./BucketCard.css";
import CreateOrUpdate from "./CreateOrUpdate";
import RemoveConfirmationByName from "../RemoveConfirmationByName";

interface Props {
    bucketInfo: BucketInfo;
    client: Client;
    index: number;
    enablePanel?: boolean;
    onRemoved: (name: string) => void;
    onShow: (name: string) => void;
    permissions?: TokenPermissions
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
        props.onRemoved(bucketInfo.name);
    };

    const actions = [];
    if (props.enablePanel) {
        actions.push(<SettingOutlined title="Settings" key="setting" onClick={() => setChangeSettings(true)}/>);

        if (props.permissions?.fullAccess) {
            actions.push(<DeleteOutlined title="Remove" key="delete" style={{color: "red"}}
                                         onClick={() => setConfirmRemove(true)}/>);
        }
    }

    return (<Card className="BucketCard" key={index} id={bucketInfo.name} title={bucketInfo.name}
                  hoverable={props.enablePanel != true}
                  onClick={() => props.onShow(bucketInfo.name)}
                  actions={actions}>
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
        <RemoveConfirmationByName name={bucketInfo.name} onRemoved={onRemoved}
                                  onCanceled={() => setConfirmRemove(false)} confirm={confirmRemove}
                                  resourceType="bucket"/>
        <Modal title="Settings" open={changeSettings} footer={null}
               onCancel={() => setChangeSettings(false)}>
            <CreateOrUpdate client={client} key={bucketInfo.name}
                            bucketName={bucketInfo.name}
                            onCreated={() => setChangeSettings(false)}/>
        </Modal>
    </Card>);

}
