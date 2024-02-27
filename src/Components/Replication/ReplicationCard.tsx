import React, {useState} from "react";
import {Card, Col, Modal, Row, Statistic, Tag} from "antd";
import humanizeDuration from "humanize-duration";
import {Client, FullReplicationInfo, TokenPermissions} from "reduct-js";
import {DeleteOutlined, SettingOutlined} from "@ant-design/icons";

import CreateOrUpdate from "./CreateOrUpdate";
import RemoveConfirmationByName from "../RemoveConfirmationByName";

interface Props {
    replication: FullReplicationInfo;
    client: Client;
    index: number;
    sourceBuckets: string[];
    showPanel?: boolean;
    onRemoved: (name: string) => void;
    onShow: (name: string) => void;
    permissions?: TokenPermissions
}

export const getHistory = (interval: {latestRecord: bigint, oldestRecord: bigint}) => {
    return humanizeDuration(
        Number((interval.latestRecord - interval.oldestRecord) / 1000n),
        {largest: 1, round: true});
};

export default function ReplicationCard(props: Readonly<Props>) {
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [changeSettings, setChangeSettings] = useState(false);
    const {client, replication, index} = props;
    const {info, settings, diagnostics} = replication;

    const n = (big: BigInt) => {
        return Number(big.valueOf());
    };

    const onRemoved = async () => {
        await client.deleteReplication(info.name);
        props.onRemoved(info.name);
    };

    const actions = [];
    const readOnly = !props.permissions?.fullAccess || info.isProvisioned;
    if (props.showPanel) {
        actions.push(<SettingOutlined title="Settings"
            key="setting"
            onClick={() => setChangeSettings(true)} />);

        if (!readOnly) {
            actions.push(<DeleteOutlined title="Remove"
                key="delete"
                style={{color: "red"}}
                onClick={() => setConfirmRemove(true)} />);
        }
    }

    console.log("replication: ", replication);
    console.log("info: ", info);
    console.log("settings: ", settings);
    console.log("diagnostics: ", diagnostics);
    return (<Card className="ReplicationCard" key={index} id={info.name} title={info.name}
        extra={
            info.isProvisioned ?
                <Tag color="processing">Provisioned</Tag>
                : <></>
        }
        hoverable={props.showPanel != true}
        onClick={() => props.onShow(info.name)}
        actions={actions}>
        <Card.Meta>


        </Card.Meta>
        <Row gutter={24}>
            <Col span={8}>
                <Statistic title="Records Awaiting Replication" value={n(info.pendingRecords)} />
            </Col>
            <Col span={8}>
                <Statistic title="Successfully Replicated (Past Hour)" value={n(diagnostics.hourly.ok)} />
            </Col>
            <Col span={8}>
                <Statistic title="Replication Errors (Past Hour)" value={n(diagnostics.hourly.errored)} />
            </Col>
        </Row>
        <RemoveConfirmationByName name={info.name} onRemoved={onRemoved}
            onCanceled={() => setConfirmRemove(false)} confirm={confirmRemove}
            resourceType="bucket" />
        <Modal title="Settings" open={changeSettings} footer={null}
            onCancel={() => setChangeSettings(false)}>
            <CreateOrUpdate
                key={info.name}
                client={client}
                readOnly={readOnly}
                onCreated={() => setChangeSettings(false)}
                sourceBuckets={props.sourceBuckets}
                replicationName={info.name}
            />
        </Modal>
    </Card>
    );

}
