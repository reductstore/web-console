import React from "react";
import {Client, ServerInfo, BucketInfo} from "reduct-js";
import {Card, Icon} from "semantic-ui-react";
import humanizeDuration from "humanize-duration";
import prettyBytes from "pretty-bytes";

import "./Dashboard.css";

interface Props {
    client: Client;
}

interface State {
    info?: ServerInfo;
    buckets: BucketInfo[];
}

export default class Dashboard extends React.Component<Props, State> {
    constructor(props: Readonly<Props>) {
        super(props);

        this.state = {
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
            return <div/>;
        }

        console.log(info);

        const n = (big: BigInt) => {
            return Number(big.valueOf());
        };

        const renderBucket = () => {
            return buckets.map((bucket) => {
                return <Card fluid>
                    <Card.Content>
                        <Card.Header>{bucket.name}</Card.Header>
                        <Card.Meta> Size: {prettyBytes(n(bucket.size))}</Card.Meta>
                        <Card.Meta> Entries: {n(bucket.entryCount)}</Card.Meta>
                        <Card.Meta>History
                            for: {humanizeDuration(n(bucket.latestRecord.valueOf() - info.oldestRecord.valueOf()) * 1000, {largest: 2})}</Card.Meta>
                    </Card.Content>
                </Card>;
            });
        };

        return <div className="Panel">
            <Card fluid centered>
                <Card.Content>
                    <Icon style={{float: "left"}} name="circle" color="green"></Icon>
                    <Card.Header>Server</Card.Header>
                    <Card.Meta>Version: {info.version} </Card.Meta>
                    <Card.Meta>Uptime: {humanizeDuration(n(info.uptime) * 1000, {largest: 2})} </Card.Meta>
                    <Card.Meta>Usage: {prettyBytes(n(info.usage))}</Card.Meta>
                    <Card.Meta>History
                        for: {humanizeDuration(n(info.latestRecord.valueOf() - info.oldestRecord.valueOf()) * 1000, {largest: 2})}</Card.Meta>
                </Card.Content>
            </Card>
            <Card.Group>
                {renderBucket()}
            </Card.Group>
        </div>;
    }
}
