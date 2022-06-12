import React, {useState} from "react";
import {Client} from "reduct-js";
import {Form} from "antd";
import Password from "antd/lib/input/Password";

interface Props {
    client: Client;
}


export default function TokenForm(props: Readonly<Props>) {
    const {token, setToken} = useState();
    const onFinish = (values?: string[]) => {
        return 0;
    };

    return <Form onFinish={onFinish}>
        <Form.Item style={{display: "inline-block", width: "calc(50% - 8px)"}} label="Name" name="name"
                   rules={[{required: true, message: "Can't be empty"}]}>
            <Password/>
        </Form.Item>
    </Form>;
}
