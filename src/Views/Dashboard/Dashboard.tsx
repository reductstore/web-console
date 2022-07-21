import React from "react";
import {IBackendAPI} from "../../BackendAPI";
import {ServerInfo, BucketInfo} from "reduct-js";
import humanizeDuration from "humanize-duration";
// @ts-ignore
import prettierBytes from "prettier-bytes";
import {Card, Col, Divider, Modal, Row, Statistic, Typography} from "antd";
import "./Dashboard.css";
import BucketCard from "../../Components/Bucket/BucketCard";
import CreateOrUpdate from "../../Components/Bucket/CreateOrUpdate";

import {PlusOutlined} from "@ant-design/icons";

interface Props {
    backendApi: IBackendAPI;
}

interface State {
    info?: ServerInfo;
    creatingBucket: boolean;
    buckets: BucketInfo[];
}

/**
 * Dashboard with information about the server and list of buckets
 */
export default class Dashboard extends React.Component<Props, State> {
    constructor(props: Readonly<Props>) {
        super(props);

        this.state = {
            creatingBucket: false,
            buckets: []
        };

        this.getInfo = this.getInfo.bind(this);
        this.removeBucket = this.removeBucket.bind(this);
    }

    async componentDidMount(): Promise<void> {
        await this.getInfo();
    }

    private async getInfo() {
        try {
            const {client} = this.props.backendApi;
            const info = await client.getInfo();
            const buckets = await client.getBucketList();
            this.setState({info, buckets});
        } catch (err) {
            console.error(err);
        }
    }

    private async removeBucket(name: string) {
        try {
            await this.getInfo();
        } catch (err) {
            console.error(err);
        }
    }

    render() {
        console.log(this.state);
        const {info, buckets, creatingBucket} = this.state;
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
                                        onRemoved={this.removeBucket}/>
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

        const {client} = this.props.backendApi;
        return <div className="Panel">
            <Card bordered={true} id="ServerInfo" title={`Server v${info.version}`}
                  actions={[
                      <PlusOutlined title="Add a new bucket" onClick={() => this.setState({creatingBucket: true})}/>
                  ]}>

                <Modal title="Add a new bucket" visible={creatingBucket} footer={null}
                       onCancel={() => this.setState({creatingBucket: false})}>
                    <CreateOrUpdate client={client}
                                    onCreated={async () => {
                                        this.setState({creatingBucket: false});
                                        await this.getInfo();
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
}

