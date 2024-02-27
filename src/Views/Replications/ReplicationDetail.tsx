import React, {useEffect, useState} from "react";
import {Client, TokenPermissions, FullReplicationInfo, BucketInfo} from "reduct-js";
import {useHistory, useParams} from "react-router-dom";
import ReplicationCard from "../../Components/Replication/ReplicationCard";

interface Props {
    client: Client;
    permissions?: TokenPermissions;
}


export default function ReplicationDetail(props: Readonly<Props>) {
    const {name} = useParams() as {name: string};
    const history = useHistory();

    const [replication, setReplication] = useState<FullReplicationInfo>();
    const [buckets, setBuckets] = useState<BucketInfo[]>([]);

    const getReplication = async () => {
        try {
            const {client} = props;
            setReplication(await client.getReplication(name));
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
        getReplication().then();
        const interval = setInterval(() => getReplication(), 5000);
        return () => clearInterval(interval);
    }, []);


    useEffect(() => {
        getBuckets().then();
        const interval = setInterval(() => getBuckets(), 5000);
        return () => clearInterval(interval);
    }, []);

    return <div style={{margin: "1.4em"}}>
        {replication && <ReplicationCard replication={replication}
            sourceBuckets={buckets.map((bucket) => bucket.name)} index={0} {...props}
            showPanel
            onRemoved={() => history.push("/replications")}
            onShow={() => null} />}
    </div>;
}
