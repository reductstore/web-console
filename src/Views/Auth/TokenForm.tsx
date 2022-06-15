import React from "react";
import {Form} from "antd";
import Password from "antd/lib/input/Password";
import {IBackendAPI} from "../../BackendAPI";

interface Props {
    backendApi: IBackendAPI;
}


export default function TokenForm(props: Readonly<Props>) {
    const onFinish = (values: { token?: string }) => {
        // if (values.token) {
        //     props.onOk(values.token);
        // }
    };

    return <Form onFinish={onFinish}>
        <Form.Item style={{display: "inline-block", width: "calc(50% - 8px)"}} label="API Token" name="token"
                   rules={[{required: true, message: "Can't be empty"}]}>
            <Password/>
        </Form.Item>
    </Form>;
}
