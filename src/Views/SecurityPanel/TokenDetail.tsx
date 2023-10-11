import React, {useEffect, useState} from "react";
import {Client, Token} from "reduct-js";
import {useHistory, useParams} from "react-router-dom";
import {Alert, Button, Checkbox, Form, Input, Modal, Select, SelectProps, Space, Typography} from "antd";

interface Props {
    client: Client;
}

function useQueryParams() {
    const params = new URLSearchParams(
        window ? window.location.search : {}
    );

    return new Proxy(params, {
        get(target, prop) {
            // @ts-ignore
            return target.get(prop);
        },
    });
}

export default function TokenDetail(props: Readonly<Props>) {
    const {name} = useParams() as { name: string };
    // @ts-ignore
    const {isNew} = useQueryParams();

    const [token, setToken] = useState<Token>({
        createdAt: Date.now(), name: name, isProvisioned: false, permissions: {fullAccess: false}
    });
    const [bucketOptions, setBucketOptions] = useState<SelectProps[]>([]);
    const [tokenValue, setTokenValue] = useState<string>();

    const [error, setError] = useState<string>();
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [confirmName, setConfirmName] = useState(false);


    const history = useHistory();

    useEffect(() => {
        const {client} = props;

        if (isNew) {
            client.getBucketList()
                .then(buckets => setBucketOptions(buckets.map(b => {
                    return {value: b.name, label: b.name};
                })))
                .catch(err => setError(err.message));
            return;
        }

        client.getToken(name)
            .then(token => setToken(token))
            .catch(err => setError(err.message));
    });

    const removeToken = () => {
        const {client} = props;
        client.deleteToken(name)
            .then(() => history.push("/tokens"))
            .catch(err => setError(err.message));
    };

    const createToken = () => {
        if (token.permissions === undefined) {
            setError("Permissions must be set");
            return;
        }
        const {client} = props;
        client.createToken(token.name, token.permissions)
            .then((value) => setTokenValue(value))
            .catch(err => setError(err.message));
    };

    const setPermissions = (permissions?: { fullAccess?: boolean; read?: string[]; write?: string[] }) => {
        if (permissions === undefined) {
            return;
        }

        if (token.permissions === undefined) {
            return;
        }

        // eslint-disable-next-line prefer-const
        let {fullAccess, read, write} = permissions;
        fullAccess = fullAccess === undefined ? token.permissions.fullAccess : fullAccess;
        read = read === undefined ? token.permissions.read : read;
        write = write === undefined ? token.permissions.write : write;
        setToken({...token, permissions: {fullAccess, read, write}});
    };

    return <Space direction={"vertical"} size={"large"} style={{margin: "2em", width: "80%"}}>
        {error ? <Alert className="Alert" message={error} type="error" closable onClose={() => setError(undefined)}/> :
            <div/>}

        <Typography.Title level={3}>Access Token</Typography.Title>

        <Input name="name" disabled={!isNew} value={token.name}
               onChange={(event) => setToken({...token, name: event.target.value})}/>
        <Checkbox name="fullAccess"  disabled={!isNew} checked={token.permissions?.fullAccess}
                  onChange={(event) => setPermissions({fullAccess: event.target.checked})}>
            Full Access
        </Checkbox>
        <Space.Compact block direction={"vertical"}>
            Read Access:
            <Select id="ReadSelect" disabled={!isNew} mode="multiple" value={token.permissions?.read} options={bucketOptions}
                    onChange={value => setPermissions({read: value})}></Select>
        </Space.Compact>
        <Space.Compact block direction={"vertical"}>
            Write Access:
            <Select id="WriteSelect" disabled={!isNew} mode="multiple" value={token.permissions?.write} options={bucketOptions}
                    onChange={value => setPermissions({write: value})}></Select>
        </Space.Compact>
        <Space>
            <Button onClick={() => history.push("/tokens")}>Back</Button>
            {isNew ?
                <Button type={"primary"} onClick={() => createToken()}>Create</Button> :
                <Button className="RemoveButton" danger disabled={token.isProvisioned} type="primary" onClick={() => setConfirmRemove(true)}>Remove</Button>}

            <Modal open={confirmRemove} onOk={removeToken} onCancel={() => setConfirmRemove(false)} closable={false}
                   title={`Remove token "${token.name}"?`}
                   okText="Remove"
                   confirmLoading={!confirmName}
                   okType="danger">
                <p>
                    For confirmation type <b>{token.name}</b>
                </p>
                <Form.Item name="confirm">
                    <Input onChange={(e) => setConfirmName(token?.name === e.target.value)}></Input>
                </Form.Item>
            </Modal>

            <Modal open={tokenValue !== undefined}
                   okText="Copy To Clipboard And Close"
                   onOk={() => {
                       navigator.clipboard.writeText(tokenValue ? tokenValue : "");
                       history.push("/tokens");
                   }}
                   closable={false}>

                <Space direction="vertical" size="large">
                    <Alert type="success"
                           message="This is your token value. Please, save it somewhere, because it will not be shown again."/>
                    <Input.TextArea value={tokenValue ? tokenValue : ""} readOnly={true} rows={4}></Input.TextArea>
                </Space>
            </Modal>
        </Space>
    </Space>;
}
