import React, {useEffect, useState} from "react";
import {Client, Token} from "reduct-js";
import {Link} from "react-router-dom";
import {Table, Typography} from "antd";

interface Props {
    client: Client;
}

export default function TokenList(props: Readonly<Props>) {
    const [tokens, setTokens] = useState<Token[]>([]);

    useEffect(() => {
        const {client} = props;
        client.getTokenList().then(tokens => setTokens(tokens));
    });


    const columns = [{
        title: "Name",
        dataIndex: "name",
        key: "name",
        render: (text: string) => <Link to={`tokens/${text}`}><b>{text}</b></Link>
    }, {
        title: "Created At",
        dataIndex: "createdAt",
        key: "createdAt",
        render: (time: number) => new Date(time).toISOString()
    },];

    return <div style={{margin: "2em"}}>
        <Typography.Title level={3}>
            Access Tokens
            {/*            <Button style={{float: "right"}} icon={<PlusOutlined/>}
                    onClick={() => setCreatingBucket(true)} title="Add"/>
            <Modal title="Add a new bucket" visible={creatingBucket} footer={null}
                   onCancel={() => setCreatingBucket(false)}>
                <CreateOrUpdate client={props.client}
                                onCreated={async () => {
                                    setCreatingBucket(false);
                                }}/>
            </Modal>*/}

        </Typography.Title>
        <Table columns={columns} dataSource={tokens} loading={tokens.length == 0}/>
    </div>;
}
