import React from "react";
import {
  APIError,
  Client,
  FullReplicationInfo,
  ReplicationSettings,
} from "reduct-js"; // Adjust import paths as necessary
import {
  Alert,
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Tooltip,
  Typography,
} from "antd";
import { DeleteOutlined, InfoCircleOutlined } from "@ant-design/icons";
import "./ReplicationSettingsForm.css";
import { Controlled as CodeMirror } from "react-codemirror2";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";

const isTestEnvironment = process.env.NODE_ENV === "test";

interface Props {
  client: Client;
  onCreated: () => void;
  sourceBuckets: string[];
  replicationName?: string;
  readOnly?: boolean;
}

interface State {
  settings?: ReplicationSettings;
  formattedWhen: string;
  entries: string[];
  error?: string;
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
  when?: string;
  eachN?: bigint;
  eachS?: number;
}

const convertWhenToString = (when: any): string => {
  return typeof when === "string" ? when : JSON.stringify(when || {});
};

/**
 * A form to create or update a replication
 */
export default class ReplicationSettingsFormReplication extends React.Component<
  Props,
  State
> {
  state: State = {
    settings: undefined,
    formattedWhen: "",
    entries: [],
  };

  refreshInterval: NodeJS.Timeout | null = null;

  codeMirrorInstance: any;

  /**
   * Called when Create/Update button is pressed
   * @param values
   */
  onFinish = async (values: FormValues) => {
    const { replicationName, client, onCreated } = this.props;
    const { srcBucket, dstBucket, dstHost, dstToken, entries, eachN, eachS } =
      values;
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

    try {
      let parsedWhen: Record<string, any> | undefined;
      if (this.state.formattedWhen && this.state.formattedWhen.trim()) {
        try {
          parsedWhen = JSON.parse(this.state.formattedWhen);
          // Validate that parsedWhen is an object
          if (typeof parsedWhen !== "object" || parsedWhen === null) {
            this.setState({ error: "When Condition must be a JSON object" });
            return;
          }
        } catch (err) {
          this.setState({ error: "Invalid JSON in When Condition" });
          return;
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
        when: parsedWhen,
        eachN:
          eachN == undefined || eachN.toString().length == 0
            ? undefined
            : BigInt(eachN),
        eachS:
          eachS == undefined || eachS.toString().length == 0
            ? undefined
            : Number(eachS),
      };
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

  // Force re-fetching data from the server
  loadReplicationData = async () => {
    const { replicationName, client } = this.props;
    if (replicationName) {
      try {
        // Force request with no cache to ensure latest data
        const replication: FullReplicationInfo =
          await client.getReplication(replicationName);
        const { settings } = replication;

        // Use the utility function and format properly
        let whenString = convertWhenToString(settings.when);

        // Ensure it's properly formatted JSON
        try {
          whenString = JSON.stringify(JSON.parse(whenString), null, 2);
        } catch {
          // If parsing fails, keep original string
        }

        // Always update state with fresh data when loaded

        this.setState(
          {
            settings,
            formattedWhen: whenString,
            entries: settings.entries || [],
          },
          () => {
            // After state update, refresh the code mirror instance
            if (this.codeMirrorInstance) {
              this.codeMirrorInstance.refresh();
            }
          },
        );
      } catch (err) {
        this.handleError(err);
      }
    }
  };

  handleSourceBucketChange = async (selectedBucket: string) => {
    try {
      const { client } = this.props;
      const bucket = await client.getBucket(selectedBucket);
      const entries = await bucket.getEntryList();

      // Update entries and update settings if they exist
      if (this.state.settings) {
        this.setState({
          entries: entries.map((entry) => entry.name),
          settings: {
            ...this.state.settings,
            srcBucket: selectedBucket,
          },
        });
      } else {
        this.setState({ entries: entries.map((entry) => entry.name) });
      }
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

  async componentDidMount() {
    await this.loadReplicationData();
  }

  getInitialFormValues = () => {
    const { settings, formattedWhen, entries } = this.state;
    const { replicationName: name } = this.props;

    if (!settings) {
      return { name };
    }

    const include = settings.include || {};
    const exclude = settings.exclude || {};

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
      srcBucket: settings.srcBucket,
      dstBucket: settings.dstBucket,
      dstHost: settings.dstHost,
      dstToken: settings.dstToken,
      entries: settings.entries || entries,
      recordSettings,
      when: formattedWhen,
      eachN: settings.eachN,
      eachS: settings.eachS,
    };
  };

  handleWhenConditionChange = (value: string) => {
    if (this.props.readOnly) {
      return;
    }
    this.setState((prevState) => ({ ...prevState, formattedWhen: value }));
  };

  formatJSON = (jsonString: string): string => {
    try {
      return JSON.stringify(JSON.parse(jsonString), null, 2);
    } catch {
      return jsonString;
    }
  };

  render() {
    const { error } = this.state;
    const { replicationName, readOnly, sourceBuckets } = this.props;
    if (this.state.settings === undefined && replicationName) {
      // If settings are not loaded yet for update
      return <div></div>;
    }

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
          name="replicationForm"
          onFinish={this.onFinish}
          layout="vertical"
          initialValues={this.getInitialFormValues()}
          labelCol={{ span: 22 }}
          wrapperCol={{ span: 22 }}
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

          <Row>
            <Col span={12}>
              <b>Source</b>
              <Form.Item
                label={
                  <span>
                    Bucket&nbsp;
                    <Tooltip title="Select the bucket from which data will be replicated.">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </span>
                }
                name="srcBucket"
                rules={[
                  {
                    required: true,
                    message: "Please select the source bucket!",
                  },
                ]}
                className="ReplicationField"
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
                    Entries&nbsp;
                    <Tooltip title="Select the entries to be replicated. If empty, all entries are replicated.">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </span>
                }
                name="entries"
                className="ReplicationField"
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
            </Col>

            <Col span={12}>
              <b>Destination</b>
              <Form.Item
                label={
                  <span>
                    Bucket&nbsp;
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
                className="ReplicationField"
              >
                <Input disabled={readOnly} />
              </Form.Item>
              <Form.Item
                label={
                  <span>
                    Host&nbsp;
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
                className="ReplicationField"
              >
                <Input disabled={readOnly} />
              </Form.Item>

              <Form.Item
                label={
                  <span>
                    Token&nbsp;
                    <Tooltip title="Enter the token with write access to the destination bucket.">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </span>
                }
                name="dstToken"
              >
                <Input disabled={readOnly} />
              </Form.Item>
            </Col>
          </Row>

          <b>Conditions</b>
          <Row>
            <Col span={12}>
              <Form.Item
                label={
                  <span>
                    Every N-th record&nbsp;
                    <Tooltip title="If set, only every N-th record is replicated.">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </span>
                }
                name="eachN"
              >
                <InputNumber disabled={readOnly} min={1} precision={0} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label={
                  <span>
                    Every S seconds&nbsp;
                    <Tooltip title="If set, only one record is replicated every S seconds. Can be float.">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </span>
                }
                name="eachS"
              >
                <InputNumber disabled={readOnly} min={0.000001} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label={<span>When Condition</span>}>
            {!isTestEnvironment ? (
              <CodeMirror
                className="jsonEditor"
                value={this.state.formattedWhen}
                options={{
                  mode: { name: "javascript", json: true },
                  theme: "default",
                  lineNumbers: true,
                  lineWrapping: true,
                  viewportMargin: Infinity,
                  matchBrackets: true,
                  autoCloseBrackets: true,
                  readOnly: readOnly || false,
                }}
                onBeforeChange={(editor: any, data: any, value: string) => {
                  this.handleWhenConditionChange(value);
                }}
                onBlur={(editor: any) => {
                  this.handleWhenConditionChange(
                    this.formatJSON(editor.getValue()),
                  );
                }}
                editorDidMount={(editor) => {
                  this.codeMirrorInstance = editor;
                  // Format content in the editor
                  const value = editor.getValue();
                  try {
                    const formatted = this.formatJSON(value);
                    if (formatted !== value) {
                      editor.setValue(formatted);
                    }
                  } catch {
                    // If formatting fails, keep the original value
                  }
                  editor.refresh();
                }}
              />
            ) : (
              <></>
            )}
            <Typography.Text type="secondary" className="jsonExample">
              {'Example: {"&label_name": { "$gt": 10 }}'}
              <br />
              <a
                href="https://www.reduct.store/docs/conditional-query"
                target="_blank"
                rel="noopener noreferrer"
              >
                Query Reference Documentation
              </a>
            </Typography.Text>
          </Form.Item>

          {/* Show Filter Records section only for existing tasks AND if they are already set */}
          {this.props.replicationName &&
          this.state.settings &&
          ((this.state.settings.include &&
            Object.keys(this.state.settings.include).length > 0) ||
            (this.state.settings.exclude &&
              Object.keys(this.state.settings.exclude).length > 0)) ? (
            <Form.Item
              label={
                <span>
                  Filter Records&nbsp;
                  <Tooltip title="Set the labels a record should include/exclude to be replicated. If empty, all records are replicated.">
                    <InfoCircleOutlined />
                  </Tooltip>
                </span>
              }
              className="ReplicationField"
            >
              <Form.List name="recordSettings">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field, index) => (
                      <Form.Item key={`recordSettings-${field.key}-${index}`}>
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
                          rules={[
                            { required: true, message: "Key is required" },
                          ]}
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
                    {/* Only show Add Rule button for existing tasks */}
                    {this.props.replicationName && (
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
                    )}
                  </>
                )}
              </Form.List>
            </Form.Item>
          ) : null}
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
