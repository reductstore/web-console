import React, {useEffect, useState} from "react";
import {Client, Token} from "reduct-js";
import {Link, useHistory} from "react-router-dom";
import {Alert, Button, Table, Typography} from "antd";
import {PlusOutlined} from "@ant-design/icons";

interface Props {
    client: Client;
}

export default function TokenList(props: Readonly<Props>) {
    const [tokens, setTokens] = useState<Token[]>([]);
    const [error, setError] = useState<string | null>(null);

    const history = useHistory();

    useEffect(() => {
        const {client} = props;
        client.getTokenList()
            .then(tokens => setTokens(tokens))
            .catch(err => setError(err.message));
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
            <Button style={{float: "right"}} icon={<PlusOutlined/>}
                    onClick={() => history.push("/tokens/new_token?isNew=true")} title="Add"/>


        </Typography.Title>
        {error ? <Alert message={error} type="error" closable onClose={() => setError(null)}/> :
            <div/>}
        <Table id="TokenTable" columns={columns} dataSource={tokens} loading={tokens.length == 0}/>
    </div>;
}
