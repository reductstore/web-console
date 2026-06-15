import React from "react";
import {
  APIError,
  Client,
  FullLifecycleInfo,
  LifecycleMode,
  LifecycleSettings,
  LifecycleType,
} from "reduct-js";
import {
  Alert,
  Button,
  Checkbox,
  Col,
  Form,
  FormInstance,
  Input,
  Row,
  Select,
  Tooltip,
  Typography,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

import "./LifecycleSettingsForm.css";
import { JsonQueryEditor } from "../JsonEditor";
import { parseAndFormat, processWhenCondition } from "../../Helpers/json5Utils";
import { LIFECYCLE_TYPE_OPTIONS } from "./LifecycleModeUtils";

const isTestEnvironment = process.env.NODE_ENV === "test";

interface Props {
  client: Client;
  onCreated: () => void;
  sourceBuckets: string[];
  lifecycleName?: string;
  readOnly?: boolean;
}

interface State {
  settings?: LifecycleSettings;
  formattedWhen: string;
  entries: string[];
  error?: string;
  selectedBucket?: string;
  selectedEntries: string[];
  selectedLifecycleType?: LifecycleType;
}

interface FormValues {
  name: string;
  lifecycleType: LifecycleType;
  bucket: string;
  olderThan: string;
  interval?: string;
  entries: string[];
  dryRun?: boolean;
}

const convertWhenToString = (when: any): string => {
  return typeof when === "string" ? when : JSON.stringify(when || {});
};

export default class LifecycleSettingsForm extends React.Component<
  Props,
  State
> {
  private readonly formRef = React.createRef<FormInstance<FormValues>>();

  state: State = {
    settings: undefined,
    formattedWhen: "{}\n",
    entries: [],
    selectedBucket: undefined,
    selectedEntries: [],
  };

  onFinish = async (values: FormValues) => {
    const { lifecycleName, client, onCreated } = this.props;

    try {
      const supportsWhen = values.lifecycleType !== LifecycleType.COMPRESS;

      let parsedWhen: Record<string, any> | undefined;
      if (
        supportsWhen &&
        this.state.formattedWhen &&
        this.state.formattedWhen.trim()
      ) {
        const processResult = processWhenCondition(this.state.formattedWhen);
        if (!processResult.success) {
          this.setState({ error: processResult.error });
          return;
        }
        parsedWhen = processResult.value;
      }

      const mode =
        !lifecycleName && values.dryRun
          ? LifecycleMode.DRY_RUN
          : this.state.settings?.mode;

      const lifecycleSettings: LifecycleSettings = {
        lifecycleType: values.lifecycleType,
        bucket: values.bucket,
        entries: values.entries || [],
        olderThan: values.olderThan,
        interval: values.interval || undefined,
        when: supportsWhen ? (parsedWhen ?? {}) : undefined,
        mode,
      };

      if (lifecycleName) {
        await client.updateLifecycle(lifecycleName, lifecycleSettings);
      } else {
        await client.createLifecycle(values.name, lifecycleSettings);
      }

      onCreated();
    } catch (err) {
      this.handleError(err);
    }
  };

  loadLifecycleData = async () => {
    const { lifecycleName, client } = this.props;
    if (lifecycleName) {
      try {
        const lifecycle: FullLifecycleInfo =
          await client.getLifecycle(lifecycleName);
        const { settings } = lifecycle;
        const lifecycleType = settings.lifecycleType ?? lifecycle.info.type;

        let whenString = convertWhenToString(settings.when);
        const formatResult = parseAndFormat(whenString);
        whenString = formatResult.error ? whenString : formatResult.formatted;

        const formValues = {
          name: lifecycleName,
          lifecycleType,
          bucket: settings.bucket,
          olderThan: settings.olderThan,
          interval: settings.interval,
          entries: settings.entries || [],
        };

        this.setState(
          {
            settings: {
              ...settings,
              lifecycleType,
            },
            formattedWhen: whenString,
            entries: settings.entries || [],
            selectedBucket: settings.bucket,
            selectedEntries: settings.entries || [],
            selectedLifecycleType: lifecycleType,
          },
          () => {
            if (settings.bucket) {
              this.handleBucketChange(settings.bucket);
            }
            this.formRef.current?.setFieldsValue(formValues);
          },
        );
      } catch (err) {
        this.handleError(err);
      }
    }
  };

  handleBucketChange = async (selectedBucket: string) => {
    try {
      const bucket = await this.props.client.getBucket(selectedBucket);
      const entries = await bucket.getEntryList();

      if (this.state.settings) {
        this.setState({
          entries: entries.map((entry) => entry.name),
          settings: {
            ...this.state.settings,
            bucket: selectedBucket,
          },
        });
      } else {
        this.setState({ entries: entries.map((entry) => entry.name) });
      }
    } catch (err) {
      this.handleError(err);
    }
  };

  handleFormValuesChange = (
    _changed: Partial<FormValues>,
    values: FormValues,
  ) => {
    this.setState({
      selectedBucket: values.bucket,
      selectedEntries: Array.isArray(values.entries) ? values.entries : [],
      selectedLifecycleType: values.lifecycleType,
    });
  };

  handleError = (err: unknown) => {
    if (err instanceof APIError) {
      this.setState({ error: err.message });
    } else {
      console.error("Unexpected error: ", err);
    }
  };

  async componentDidMount() {
    await this.loadLifecycleData();
  }

  getInitialFormValues = () => {
    const { settings, formattedWhen, entries, selectedLifecycleType } =
      this.state;
    const { lifecycleName: name } = this.props;

    if (!settings) {
      return { name };
    }

    return {
      name,
      lifecycleType: selectedLifecycleType,
      bucket: settings.bucket,
      olderThan: settings.olderThan,
      interval: settings.interval,
      entries: settings.entries || entries,
      when: formattedWhen,
    };
  };

  handleWhenConditionChange = (value: string) => {
    if (this.props.readOnly) {
      return;
    }
    this.setState((prevState) => ({
      ...prevState,
      formattedWhen: value,
      error: undefined,
    }));
  };

  render() {
    const { error } = this.state;
    const { lifecycleName, readOnly, sourceBuckets } = this.props;

    if (this.state.settings === undefined && lifecycleName) {
      return <></>;
    }

    return (
      <>
        <Form
          ref={this.formRef}
          name="lifecycleForm"
          className="LifecycleForm"
          onFinish={this.onFinish}
          onValuesChange={this.handleFormValuesChange}
          layout="vertical"
          initialValues={this.getInitialFormValues()}
        >
          <Form.Item
            label="Lifecycle Name"
            name="name"
            rules={[
              { required: true, message: "Please input the lifecycle name!" },
            ]}
          >
            <Input
              disabled={readOnly || this.props.lifecycleName !== undefined}
            />
          </Form.Item>

          <Form.Item
            label={
              <span>
                Type&nbsp;
                <Tooltip title="Action applied to matching records.">
                  <InfoCircleOutlined />
                </Tooltip>
              </span>
            }
            name="lifecycleType"
            rules={[{ required: true, message: "Please select the type." }]}
          >
            <Select
              disabled={readOnly}
              placeholder="Select a type"
              options={LIFECYCLE_TYPE_OPTIONS}
            />
          </Form.Item>

          {this.state.selectedLifecycleType && (
            <>
              {!lifecycleName && (
                <Form.Item name="dryRun" valuePropName="checked">
                  <Checkbox disabled={readOnly}>
                    Start in dry run mode&nbsp;
                    <Tooltip title="Simulate the policy and report in the logs what it would do without applying any changes. You can enable it later.">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Checkbox>
                </Form.Item>
              )}

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label={
                      <span>
                        Bucket&nbsp;
                        <Tooltip title="Select the bucket where lifecycle policy is applied.">
                          <InfoCircleOutlined />
                        </Tooltip>
                      </span>
                    }
                    name="bucket"
                    rules={[
                      { required: true, message: "Please select the bucket!" },
                    ]}
                    className="LifecycleField"
                  >
                    <Select
                      disabled={readOnly}
                      placeholder="Select a bucket"
                      onChange={this.handleBucketChange}
                      options={sourceBuckets?.map((bucket) => ({
                        value: bucket,
                        label: bucket,
                      }))}
                    />
                  </Form.Item>

                  <Form.Item
                    label={
                      <span>
                        Entries&nbsp;
                        <Tooltip title="Select entries to be affected. If empty, all entries are affected.">
                          <InfoCircleOutlined />
                        </Tooltip>
                      </span>
                    }
                    name="entries"
                    className="LifecycleField"
                  >
                    <Select
                      mode="tags"
                      style={{ width: "100%" }}
                      placeholder="Add entries"
                      disabled={readOnly}
                      options={this.state.entries.map((entry) => ({
                        value: entry,
                        label: entry,
                      }))}
                    />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    label={
                      <span>
                        Older Than&nbsp;
                        <Tooltip title="Apply to records older than this age, e.g. 1h, 30d, 3600s.">
                          <InfoCircleOutlined />
                        </Tooltip>
                      </span>
                    }
                    name="olderThan"
                    rules={[
                      { required: true, message: "Please input the value!" },
                    ]}
                    className="LifecycleField"
                  >
                    <Input disabled={readOnly} />
                  </Form.Item>

                  <Form.Item
                    label={
                      <span>
                        Interval&nbsp;
                        <Tooltip title="Optional run interval, e.g. 10m, 1h.">
                          <InfoCircleOutlined />
                        </Tooltip>
                      </span>
                    }
                    name="interval"
                    className="LifecycleField"
                  >
                    <Input disabled={readOnly} />
                  </Form.Item>
                </Col>
              </Row>

              {this.state.selectedLifecycleType !== LifecycleType.COMPRESS && (
                <Form.Item
                  label={
                    <span>
                      When&nbsp;
                      <Tooltip title="Define JSON-based rules to match records for lifecycle processing.">
                        <InfoCircleOutlined />
                      </Tooltip>
                    </span>
                  }
                >
                  {!isTestEnvironment && (
                    <JsonQueryEditor
                      value={this.state.formattedWhen}
                      onChange={(value: string) =>
                        this.handleWhenConditionChange(value)
                      }
                      height={200}
                      readOnly={readOnly}
                      validationContext={{
                        client: this.props.client,
                        bucket: this.state.selectedBucket,
                        entries: this.state.selectedEntries,
                      }}
                    />
                  )}
                  <Typography.Text type="secondary" className="jsonExample">
                    Example: <code>{'{"&anomaly": { "$eq": 1 }}'}</code>
                    <br />
                    Use <code>&label</code> for standard labels and{" "}
                    <code>@label</code> for computed labels.
                    <br />
                    <strong>
                      <a
                        href="https://www.reduct.store/docs/conditional-query"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Conditional Query Reference →
                      </a>
                    </strong>
                  </Typography.Text>
                </Form.Item>
              )}
            </>
          )}

          {error && <Alert type="error" title={error} showIcon />}

          <Form.Item>
            <Button type="primary" htmlType="submit" disabled={readOnly}>
              {lifecycleName ? "Update Lifecycle" : "Create Lifecycle"}
            </Button>
          </Form.Item>
        </Form>
      </>
    );
  }
}
