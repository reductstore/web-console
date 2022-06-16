import React from "react";
import {Button, Card, Form} from "antd";
import Password from "antd/lib/input/Password";
import {IBackendAPI} from "../../BackendAPI";

import "./TokenForm.css" ;

interface Props {
    backendApi: IBackendAPI;
}


export default function TokenForm(props: Readonly<Props>) {
    const onFinish = (values: { token?: string }) => {
        // if (values.token) {
        //     props.onOk(values.token);
        // }
    };

    return <Card title="Enter API token for authentication" className="TokenForm" bordered>
        <Form onFinish={onFinish}>
            <Form.Item label="API Token" name="token">
                <Password/>
            </Form.Item>
            <Button type="primary">Login</Button>
        </Form>
    </Card>;
}
