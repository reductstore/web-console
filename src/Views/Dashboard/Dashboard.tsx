import React from "react";
import {Client, ServerInfo, BucketInfo} from "reduct-js";
import humanizeDuration from "humanize-duration";
// @ts-ignore
import prettierBytes from "prettier-bytes";
import {Button, Card, Col, Divider, Row, Statistic} from "antd";
import "./Dashboard.css";

interface Props {
    client: Client;
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
    }

    async componentDidMount(): Promise<void> {
        try {
            const info = await this.props.client.getInfo();
            const buckets = await this.props.client.getBucketList();
            this.setState({info, buckets});
        } catch (err) {
            console.error(err);
        }
    }

    render() {
        const {info, buckets} = this.state;
        if (info === undefined) {
            return <Card bordered className="Panel" id="ServerInfo" title="Server (no connection)">
            </Card>;
        }

        const n = (big: BigInt) => {
            return Number(big.valueOf());
        };

        const renderBucket = () => {
            return buckets.map((bucket, index) => {
                return <Card key={index} id={bucket.name} title={bucket.name}>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Statistic title="Size" value={prettierBytes(n(bucket.size))}/>
                        </Col>
                        <Col span={8}>
                            <Statistic title="Entries" value={n(bucket.entryCount)}/>
                        </Col>
                        <Col span={8}>
                            <Statistic title="History" value={humanizeDuration(
                                n(bucket.latestRecord.valueOf() - bucket.oldestRecord.valueOf()) / 1000,
                                {largest: 1})}/>
                        </Col>
                    </Row>
                </Card>;
            });
        };

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const createBucketButton = () => {
            return (
                <Button>
                    Add
                </Button>
            );
        };

        return <div className="Panel">
            <Card bordered={true} id="ServerInfo" title={`Server v${info.version}`}>
                {/*<Modal trigger={createBucketButton()} open={this.state.creatingBucket}*/}
                {/*       onOpen={() => this.setState({creatingBucket: true})}>*/}
                {/*    <CreateBucket client={this.props.client}*/}
                {/*                  onCreated={() => this.setState({creatingBucket: false})}*/}
                {/*                  onCanceled={() => this.setState({creatingBucket: false})}/>*/}
                {/*</Modal>*/}

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
            {renderBucket()}
        </div>;
    }
}
