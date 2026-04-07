import React from "react";
import { Button, Card, Form, Input, message } from "antd";
import { IBackendAPI } from "../../BackendAPI";

import "./Login.css";
import { APIError } from "reduct-js";

interface Props {
  backendApi: IBackendAPI;
  onLogin: () => void;
}

export default function Login(props: Props) {
  const onFinish = async (values: { token: string }) => {
    try {
      await props.backendApi.login(values.token);
      props.onLogin();
    } catch (err) {
      console.error(err);
      if (err instanceof APIError) {
        message.error(err.message);
      }
    }
  };

  return (
    <Card
      title="Enter API token for authentication"
      className="LoginForm"
      variant="outlined"
    >
      <Form onFinish={onFinish}>
        <Form.Item label="API Token" name="token">
          <Input.Password />
        </Form.Item>
        <Button type="primary" htmlType="submit">
          Login
        </Button>
      </Form>
    </Card>
  );
}
