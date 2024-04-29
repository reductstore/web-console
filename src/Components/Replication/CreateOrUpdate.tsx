import React from "react";
import {
  APIError,
  Client,
  FullReplicationInfo,
  ReplicationSettings,
} from "reduct-js"; // Adjust import paths as necessary
import { Alert, Button, Form, Input, Radio, Select, Tooltip } from "antd";
import { DeleteOutlined, InfoCircleOutlined } from "@ant-design/icons";

interface Props {
  client: Client;
  onCreated: () => void;
  sourceBuckets: string[];
  replicationName?: string;
  readOnly?: boolean;
}

interface State {
  srcBucket: string;
  dstBucket: string;
  dstHost: string;
  dstToken: string;
  entries: string[];
  include: Record<string, string>;
  exclude: Record<string, string>;
  error?: string;
  dataFetched: boolean;
}

enum FilterType {
  Include = "include",
  Exclude = "exclude",
}

interface FormValues {
  name: string;
  srcBucket: string;
  dstBucket: string;
  dstHost: string;
  dstToken: string;
  entries: string[];
  recordSettings: Array<{
    action: FilterType;
    key: string;
    value: string;
  }>;
}

/**
 * A form to create or update a replication
 */
export default class CreateOrUpdateReplication extends React.Component<
  Props,
  State
> {
  state: State = {
    srcBucket: "",
    dstBucket: "",
    dstHost: "",
    dstToken: "",
    entries: [],
    include: {},
    exclude: {},
    dataFetched: false,
  };

  /**
   * Called when Create/Update button is pressed
   * @param values
   */
  onFinish = async (values: FormValues) => {
    const { replicationName, client, onCreated } = this.props;
    const { srcBucket, dstBucket, dstHost, dstToken, entries } = values;
    const include: Record<string, string> = {};
    const exclude: Record<string, string> = {};
    if (values.recordSettings) {
      for (const recordSetting of values.recordSettings) {
        if (recordSetting.action === FilterType.Include) {
          include[recordSetting.key] = recordSetting.value;
        } else {
          exclude[recordSetting.key] = recordSetting.value;
        }
      }
    }
    const replicationSettings: ReplicationSettings = {
      srcBucket,
      dstBucket,
      dstHost,
      dstToken,
      entries,
      include,
      exclude,
    };
    try {
      if (replicationName) {
        await client.updateReplication(replicationName, replicationSettings);
      } else {
        await client.createReplication(values.name, replicationSettings);
      }
      onCreated();
    } catch (err) {
      this.handleError(err);
    }
  };

  async componentDidMount() {
    const { replicationName, client } = this.props;
    if (replicationName) {
      try {
        const replication: FullReplicationInfo =
          await client.getReplication(replicationName);
        const {
          srcBucket,
          dstBucket,
          dstHost,
          dstToken,
          entries,
          include,
          exclude,
        } = replication.settings;
        this.setState({
          srcBucket,
          dstBucket,
          dstHost,
          dstToken,
          entries,
          include,
          exclude,
          dataFetched: true,
        });
      } catch (err) {
        this.handleError(err);
      }
    }
  }

  handleSourceBucketChange = async (selectedBucket: string) => {
    try {
      const { client } = this.props;
      const bucket = await client.getBucket(selectedBucket);
      const entries = await bucket.getEntryList();

      this.setState({ entries: entries.map((entry) => entry.name) });
    } catch (err) {
      this.handleError(err);
    }
  };

  handleError = (err: unknown) => {
    if (err instanceof APIError) {
      this.setState({ error: err.message });
    } else {
      console.error("Unexpected error: ", err);
    }
  };

  getInitialFormValues = () => {
    const { srcBucket, dstBucket, dstHost, entries, include, exclude } =
      this.state;
    const { replicationName: name } = this.props;
    const recordSettings = [
      ...Object.keys(include).map((key) => ({
        action: FilterType.Include,
        key,
        value: include[key],
      })),
      ...Object.keys(exclude).map((key) => ({
        action: FilterType.Exclude,
        key,
        value: exclude[key],
      })),
    ];
    return {
      name,
      srcBucket,
      dstBucket,
      dstHost,
      entries,
      recordSettings,
    };
  };

  render() {
    const { error, dataFetched } = this.state;
    const { replicationName, readOnly, sourceBuckets } = this.props;

    return (
      <>
        {error && (
          <Alert
            message={error}
            type="error"
            closable
            onClose={() => this.setState({ error: undefined })}
          />
        )}
        <Form
          key={dataFetched ? "loaded" : "loading"}
          name="replicationForm"
          onFinish={this.onFinish}
          layout="vertical"
          initialValues={this.getInitialFormValues()}
        >
          <Form.Item
            label="Replication Name"
            name="name"
            rules={[
              { required: true, message: "Please input the replication name!" },
            ]}
          >
            <Input disabled={readOnly} />
          </Form.Item>

          <Form.Item
            label={
              <span>
                Source Bucket&nbsp;
                <Tooltip title="Select the bucket from which data will be replicated.">
                  <InfoCircleOutlined />
                </Tooltip>
              </span>
            }
            name="srcBucket"
            rules={[
              { required: true, message: "Please select the source bucket!" },
            ]}
          >
            <Select
              disabled={readOnly}
              placeholder="Select a source bucket"
              onChange={this.handleSourceBucketChange}
            >
              {sourceBuckets?.map((bucket) => (
                <Select.Option key={bucket} value={bucket}>
                  {bucket}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label={
              <span>
                Destination Bucket&nbsp;
                <Tooltip title="Select the bucket to which data will be replicated.">
                  <InfoCircleOutlined />
                </Tooltip>
              </span>
            }
            name="dstBucket"
            rules={[
              {
                required: true,
                message: "Please input the destination bucket name!",
              },
            ]}
          >
            <Input disabled={readOnly} />
          </Form.Item>

          <Form.Item
            label={
              <span>
                Destination Host&nbsp;
                <Tooltip title="Enter the URL of the destination host.">
                  <InfoCircleOutlined />
                </Tooltip>
              </span>
            }
            name="dstHost"
            rules={[
              {
                required: true,
                message: "Please input the destination host URL!",
              },
            ]}
          >
            <Input disabled={readOnly} />
          </Form.Item>

          <Form.Item
            label={
              <span>
                Destination Token&nbsp;
                <Tooltip title="Enter the token with write access to the destination bucket.">
                  <InfoCircleOutlined />
                </Tooltip>
              </span>
            }
            name="dstToken"
          >
            <Input disabled={readOnly} />
          </Form.Item>

          <Form.Item
            label={
              <span>
                Filter Entries&nbsp;
                <Tooltip title="Select the entries to be replicated. If empty, all entries are replicated.">
                  <InfoCircleOutlined />
                </Tooltip>
              </span>
            }
            name="entries"
          >
            <Select
              mode="tags"
              style={{ width: "100%" }}
              placeholder="Add entries"
              disabled={readOnly}
            >
              {this.state.entries.map((entry) => (
                <Select.Option key={entry} value={entry}>
                  {entry}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label={
              <span>
                Filter Records&nbsp;
                <Tooltip title="Set the labels a record should include/exclude to be replicated. If empty, all records are replicated.">
                  <InfoCircleOutlined />
                </Tooltip>
              </span>
            }
          >
            <Form.List name="recordSettings">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field, index) => (
                    <Form.Item
                      key={`recordSettings-${field.key}-${index}`}
                      style={{ marginBottom: "10px" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "10px",
                        }}
                      >
                        <Form.Item
                          {...field}
                          name={[field.name, "action"]}
                          rules={[
                            { required: true, message: "Action is required" },
                          ]}
                          style={{ marginBottom: 0 }}
                        >
                          <Radio.Group disabled={readOnly}>
                            <Radio value="include">Include</Radio>
                            <Radio value="exclude">Exclude</Radio>
                          </Radio.Group>
                        </Form.Item>
                        <Button
                          type="primary"
                          danger
                          icon={<DeleteOutlined />}
                          size="small"
                          onClick={() => remove(field.name)}
                          disabled={readOnly}
                        />
                      </div>

                      <Form.Item
                        {...field}
                        name={[field.name, "key"]}
                        rules={[{ required: true, message: "Key is required" }]}
                        style={{
                          display: "inline-block",
                          width: "calc(50% - 8px)",
                        }}
                        key={`recordSettings-${field.key}-${index}`}
                      >
                        <Input placeholder="Key" disabled={readOnly} />
                      </Form.Item>

                      <Form.Item
                        {...field}
                        name={[field.name, "value"]}
                        rules={[
                          { required: true, message: "Value is required" },
                        ]}
                        style={{
                          display: "inline-block",
                          width: "calc(50% - 8px)",
                          marginLeft: "16px",
                        }}
                        key={`recordSettings-${field.key}-${index}-value`}
                      >
                        <Input placeholder="Value" disabled={readOnly} />
                      </Form.Item>
                    </Form.Item>
                  ))}
                  <Form.Item name="addRule">
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      disabled={readOnly}
                    >
                      Add Rule
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              disabled={error !== undefined || readOnly}
            >
              {replicationName ? "Update Replication" : "Create Replication"}
            </Button>
          </Form.Item>
        </Form>
      </>
    );
  }
}
