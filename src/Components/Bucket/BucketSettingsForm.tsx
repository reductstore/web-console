import React from "react";
import {
  APIError,
  Bucket,
  BucketSettings,
  Client,
  QuotaType,
  ServerInfo,
} from "reduct-js";
import {
  Alert,
  Button,
  Collapse,
  Form,
  Input,
  InputNumber,
  Select,
  Spin,
} from "antd";
import { useHistory } from "react-router-dom";

const { Option } = Select;

interface Props {
  client: Client;
  bucketName?: string; // if set we update a bucket
  onCreated: () => void;
  showAll?: boolean; // show all settings
  readOnly?: boolean; // now allowed to change settings
  history?: any;
}

interface State {
  maxBlockSizeFactor: string;
  quotaSizeFactor: string;
  error?: string;
  settings?: BucketSettings;
}

const DEFAULT_FACTOR = "MB";
const FACTOR_MAP: Record<string, bigint> = {
  B: 1n,
  KB: 1000n,
  MB: 1000_000n,
  GB: 1000_000_000n,
};

/**
 * A form to create or update a bucket
 */
class BucketSettingsForm extends React.Component<
  Props & { history: any },
  State
> {
  constructor(props: Readonly<Props & { history: any }>) {
    super(props);
    this.state = {
      maxBlockSizeFactor: DEFAULT_FACTOR,
      quotaSizeFactor: DEFAULT_FACTOR,
    };
    this.onFinish = this.onFinish.bind(this);
  }

  /**
   * Called when Create/Update button is pressed
   * @param values
   */
  async onFinish(values: {
    maxBlockSize?: string;
    maxBlockRecords?: string;
    quotaType: string;
    quotaSize?: string;
    name: string;
  }): Promise<void> {
    const { history } = this.props;

    console.log(values);
    let maxBlockSize = undefined;
    if (values.maxBlockSize) {
      maxBlockSize =
        BigInt(values.maxBlockSize) * FACTOR_MAP[this.state.maxBlockSizeFactor];
    }

    let maxBlockRecords = undefined;
    if (values.maxBlockRecords) {
      maxBlockRecords = BigInt(values.maxBlockRecords);
    }

    // @ts-ignore
    const quotaType = QuotaType[values.quotaType];

    let quotaSize = undefined;
    if (values.quotaSize) {
      quotaSize =
        BigInt(values.quotaSize) * FACTOR_MAP[this.state.quotaSizeFactor];
    }
    const settings: BucketSettings = {
      maxBlockSize,
      quotaType,
      quotaSize,
      maxBlockRecords,
    };
    console.log(settings);
    const { bucketName, client } = this.props;
    try {
      // We create a new bucket if the bucket name wasn't set in properties
      if (bucketName === undefined) {
        await client.createBucket(values.name, settings);
      } else {
        const bucket = await client.getBucket(bucketName);
        await bucket.setSettings(settings);
        if (bucketName !== values.name) await bucket.rename(values.name);
      }
      this.props.onCreated();
      history.push(`/buckets/${values.name}`);
    } catch (err) {
      if (err instanceof APIError) {
        this.setState({ error: err.message });
      } else {
        console.error("Unexpected error: ", err);
      }
    }
  }

  async componentDidMount() {
    const { bucketName, client } = this.props;
    let settings = null;

    try {
      // If bucket name isn't in props, then create a new bucket
      if (bucketName === undefined) {
        const info: ServerInfo = await client.getInfo();
        settings = info.defaults.bucket;
      } else {
        const bucket: Bucket = await client.getBucket(bucketName);
        settings = await bucket.getSettings();
      }
      this.setState({
        settings,
        maxBlockSizeFactor: this.calcBestFactor(settings.maxBlockSize),
        quotaSizeFactor: this.calcBestFactor(settings.quotaSize),
      });
    } catch (err) {
      if (err instanceof APIError) {
        this.setState({ error: err.message });
      } else {
        console.error("Unexpected error: ", err);
      }
    }
  }

  calcBestFactor(value?: bigint): string {
    let result = DEFAULT_FACTOR;
    if (!value) {
      return result;
    }

    for (const factor in FACTOR_MAP) {
      const divisor = FACTOR_MAP[factor];
      if ((value / divisor) * divisor == value) {
        result = factor;
      } else {
        break;
      }
    }

    return result;
  }

  render() {
    const { error, settings, maxBlockSizeFactor, quotaSizeFactor } = this.state;
    if (settings === undefined) {
      return (
        <>
          {error ? (
            <Alert
              message={error}
              type="error"
              onClose={() => this.setState({ error: undefined })}
            />
          ) : (
            <div />
          )}
          <Spin size="large" />
        </>
      );
    }

    const sizeSelector = (
      initValue: string,
      onChange?: (value: string) => void,
    ) => (
      <Select
        defaultValue={initValue}
        style={{ width: 70 }}
        onChange={onChange}
      >
        <Option value="B">B</Option>
        <Option value="KB">KB</Option>
        <Option value="MB">MB</Option>
        <Option value="GB">GB</Option>
      </Select>
    );

    const { bucketName, showAll } = this.props;
    const initValueFromDefault = (factor: string, value?: bigint) =>
      value !== undefined ? (value / FACTOR_MAP[factor]).toString() : "";

    const validateBucketName = (name: string) => {
      name = name.trim();
      if (name.length == 0) {
        this.setState({ error: "Can't be empty" });
      } else if (!/^[A-Za-z0-9_-]*$/.test(name)) {
        this.setState({
          error: "Bucket name can contain only letters and digests",
        });
      } else {
        this.setState({ error: undefined });
      }
    };

    return (
      <Form
        name="bucketForm"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 15 }}
        onFinish={this.onFinish}
      >
        {error ? (
          <Alert
            message={error}
            type="error"
            closable
            onClose={() => this.setState({ error: undefined })}
          />
        ) : (
          <div />
        )}
        <Input.Group style={{ padding: "15px" }} size="small">
          <Form.Item
            label="Name"
            name="name"
            initialValue={bucketName ? bucketName : "new_bucket"}
          >
            <Input
              id="InputName"
              disabled={this.props.readOnly}
              onChange={(event) => validateBucketName(event.target.value)}
            />
          </Form.Item>
          <Form.Item
            label="Quota Type"
            name="quotaType"
            initialValue={
              settings.quotaType ? QuotaType[settings.quotaType] : "NONE"
            }
          >
            <Select>
              <Option value="NONE">NONE</Option>
              <Option value="FIFO">FIFO</Option>
              <Option value="HARD">HARD</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="Quota Size"
            initialValue={initValueFromDefault(
              quotaSizeFactor,
              settings.quotaSize,
            )}
            name="quotaSize"
          >
            <InputNumber
              controls={false}
              stringMode
              addonAfter={sizeSelector(quotaSizeFactor, (value) =>
                this.setState({ quotaSizeFactor: value }),
              )}
            />
          </Form.Item>
        </Input.Group>
        <Collapse
          bordered={true}
          ghost={true}
          style={{ padding: "0px" }}
          defaultActiveKey={showAll ? ["1"] : []}
        >
          <Collapse.Panel header="Advanced Settings" key="1">
            <Input.Group size="small">
              <Form.Item
                label="Max. Records"
                initialValue={settings.maxBlockRecords}
                name="maxBlockRecords"
              >
                <InputNumber controls={false} precision={0} stringMode />
              </Form.Item>
              <Form.Item
                label="Max. Block Size"
                initialValue={initValueFromDefault(
                  maxBlockSizeFactor,
                  settings.maxBlockSize,
                )}
                name="maxBlockSize"
              >
                <InputNumber
                  controls={false}
                  precision={0}
                  stringMode
                  addonAfter={sizeSelector(maxBlockSizeFactor, (value) =>
                    this.setState({ maxBlockSizeFactor: value }),
                  )}
                />
              </Form.Item>
            </Input.Group>
          </Collapse.Panel>
        </Collapse>

        <Form.Item wrapperCol={{ offset: 17, span: 17 }}>
          <Button
            type="primary"
            htmlType="submit"
            name="submit"
            disabled={error !== undefined || this.props.readOnly}
          >
            {bucketName ? "Update" : "Create"}
          </Button>
        </Form.Item>
      </Form>
    );
  }
}

const BucketSettingsFormWrapper: React.FC<Props> = (props) => {
  const history = props.history || useHistory();
  return <BucketSettingsForm {...props} history={history} />;
};

export default BucketSettingsFormWrapper;
