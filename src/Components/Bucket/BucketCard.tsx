import React, {useState} from "react";
import {Card, Col, Modal, Row, Statistic} from "antd";
import humanizeDuration from "humanize-duration";
import {BucketInfo} from "reduct-js";

// @ts-ignore
import prettierBytes from "prettier-bytes";
import {DeleteOutlined, SettingOutlined} from "@ant-design/icons";

interface Props {
    bucket: BucketInfo;
    index: number;
    onRemove: (name: string) => void;
    onSettings: (name: string) => void;
}

export default function BucketCard(props: Readonly<Props>) {
    const [visible, setVisible] = useState(false);
    const {bucket, index} = props;

    const n = (big: BigInt) => {
        return Number(big.valueOf());
    };

    const getHistory = () => {
        return humanizeDuration(
            n(bucket.latestRecord.valueOf() - bucket.oldestRecord.valueOf()) / 1000,
            {largest: 1, round: true});
    };

    const onOk = () => {
        props.onRemove(bucket.name);
        setVisible(false);
    };

    return (<Card key={index} id={bucket.name} title={bucket.name} style={{margin: "0.5em"}}
                  actions={[
                      <SettingOutlined title="Settings" onClick={() => {
                          props.onSettings(bucket.name);
                      }}/>,
                      <DeleteOutlined title="Remove" onClick={() => setVisible(true)}/>,

                  ]}>
        <Row gutter={24}>
            <Col span={8}>
                <Statistic title="Size" value={prettierBytes(n(bucket.size))}/>
            </Col>
            <Col span={6}>
                <Statistic title="Entries" value={n(bucket.entryCount)}/>
            </Col>
            <Col span={10}>
                <Statistic title="History" value={bucket.entryCount > 0n ? getHistory() : "---"}/>
            </Col>
        </Row>
        <Modal visible={visible} onOk={onOk} onCancel={() => setVisible(false)} closable={false} okText="Remove"
               okType="danger">Remove <b>{bucket.name}</b>?</Modal>
    </Card>);

}
