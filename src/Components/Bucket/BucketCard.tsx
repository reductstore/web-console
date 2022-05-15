import React, {useState} from "react";
import {Card, Col, Modal, Row, Statistic} from "antd";
import humanizeDuration from "humanize-duration";
import {BucketInfo} from "reduct-js";

// @ts-ignore
import prettierBytes from "prettier-bytes";
import {DeleteOutlined} from "@ant-design/icons";

interface Props {
    bucket: BucketInfo;
    index: number;
    onRemove: (name: string) => void;
}

export default function BucketCard(props: Readonly<Props>) {
    const [confirm, setConfirm] = useState(false);
    const {bucket, index} = props;

    const n = (big: BigInt) => {
        return Number(big.valueOf());
    };

    const getHistory = () => {
        return humanizeDuration(
            n(bucket.latestRecord.valueOf() - bucket.oldestRecord.valueOf()) / 1000,
            {largest: 1});
    };

    return (<Card key={index} id={bucket.name} title={bucket.name} style={{margin: "0.5em"}}
                  actions={[
                      <DeleteOutlined title="Remove" onClick={() => setConfirm(true)}/>
                  ]}>
        <Row gutter={16}>
            <Col span={8}>
                <Statistic title="Size" value={prettierBytes(n(bucket.size))}/>
            </Col>
            <Col span={8}>
                <Statistic title="Entries" value={n(bucket.entryCount)}/>
            </Col>
            <Col span={8}>
                <Statistic title="History" value={bucket.entryCount > 0n ? getHistory() : "---"}/>
            </Col>
        </Row>
        <Modal visible={confirm} onOk={()=> props.onRemove(bucket.name)} onCancel={() => setConfirm(false)} closable={false} okText="remove" okType="danger">Remove <b>{bucket.name}</b>?</Modal>
    </Card>);

}
