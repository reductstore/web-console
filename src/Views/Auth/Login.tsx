import React, { useState } from "react";
import { RouteComponentProps } from "react-router-dom";
import { Alert, Button, Card, Form } from "antd";
import Password from "antd/lib/input/Password";
import { IBackendAPI } from "../../BackendAPI";

import "./Login.css";
import { APIError } from "reduct-js";

interface Props extends RouteComponentProps {
  backendApi: IBackendAPI;
  onLogin: () => void;
}

export default function Login(props: Props) {
  const [error, setError] = useState<string | undefined>();
  const onFinish = async (values: { token: string }) => {
    try {
      await props.backendApi.login(values.token);
      props.onLogin();
    } catch (err) {
      console.error(err);
      if (err instanceof APIError) {
        if (err.status == 401) {
          setError("Wrong API token");
        } else {
          setError(err.message);
        }
      }
    }
  };

  return (
    <Card
      title="Enter API token for authentication"
      className="LoginForm"
      bordered
    >
      <p>
        {error ? (
          <Alert
            message={error}
            type="error"
            closable
            onClose={() => setError(undefined)}
          />
        ) : (
          <div />
        )}
      </p>
      <Form onFinish={onFinish}>
        <Form.Item label="API Token" name="token">
          <Password />
        </Form.Item>
        <Button type="primary" htmlType="submit">
          Login
        </Button>
      </Form>
    </Card>
  );
}
