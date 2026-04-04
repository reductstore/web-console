import React, { useState } from "react";
import { Alert, Button, Card, Form, Input } from "antd";
import { IBackendAPI } from "../../BackendAPI";

import "./Login.css";
import { APIError } from "reduct-js";

interface Props {
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
      variant="outlined"
    >
      <div>
        {error ? (
          <Alert
            title={error}
            type="error"
            closable={{
              onClose: () => setError(undefined),
            }}
            style={{ marginBottom: 16 }}
          />
        ) : (
          <div />
        )}
      </div>
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
