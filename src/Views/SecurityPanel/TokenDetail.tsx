import React, {useEffect, useState} from "react";
import {Client, Token} from "reduct-js";
import {useParams} from "react-router-dom";
import {Button, Checkbox, Input, Select, Space, Typography} from "antd";

interface Props {
    client: Client;
}

export default function TokenDetail(props: Readonly<Props>) {
    const {name} = useParams() as { name: string };
    const [token, setToken] = useState<Token | null>(null);

    useEffect(() => {
        const {client} = props;
        client.getToken(name).then(token => setToken(token));
    });


    if (token == null) {
        return <div>Loading...</div>;
    }
    return <Space direction={"vertical"} size={"large"} style={{margin: "2em", width: "80%"}}>
        <Typography.Title level={3}>Access Token</Typography.Title>
        <Input disabled value={token.name}/>
        <Checkbox disabled checked={token.permissions?.fullAccess}>Full Access</Checkbox>
        <Space.Compact block direction={"vertical"}>
            Read Access:
            <Select disabled mode="multiple" value={token.permissions?.read}></Select>
        </Space.Compact>
        <Space.Compact block direction={"vertical"}>
            Write Access:
            <Select disabled mode="multiple" value={token.permissions?.write}></Select>
        </Space.Compact>
        <Space>
            <Button>Back</Button>
            <Button danger type="primary">Remove</Button>
        </Space>
    </Space>;
}
