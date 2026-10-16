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
  Space,
  Spin,
} from "antd";
import { useNavigate } from "react-router-dom";

interface Props {
  client: Client;
  bucketName?: string; // if set we update a bucket
  onCreated: () => void;
  showAll?: boolean; // show all settings
  readOnly?: boolean; // now allowed to change settings
  navigate?: (path: string) => void;
}

interface State {
  maxBlockSizeFactor: string;
  quotaSizeFactor: string;
  quotaType: string;
  saving: boolean;
  error?: string;
  settings?: BucketSettings;
}

const DEFAULT_BLOCK_SIZE_FACTOR = "MB";
const DEFAULT_QUOTA_FACTOR = "TB";
const FACTOR_MAP: Record<string, bigint> = {
  B: 1n,
  KB: 1000n,
  MB: 1000_000n,
  GB: 1000_000_000n,
  TB: 1000_000_000_000n,
};
const BLOCK_SIZE_FACTORS = ["B", "KB", "MB", "GB"];
const QUOTA_SIZE_FACTORS = [...BLOCK_SIZE_FACTORS, "TB"];

/**
 * A form to create or update a bucket
 */
class BucketSettingsForm extends React.Component<
  Props & { navigate: (path: string) => void },
  State
> {
  constructor(props: Readonly<Props & { navigate: (path: string) => void }>) {
    super(props);
    this.state = {
      maxBlockSizeFactor: DEFAULT_BLOCK_SIZE_FACTOR,
      quotaSizeFactor: DEFAULT_QUOTA_FACTOR,
      quotaType: "NONE",
      saving: false,
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
    const { navigate } = this.props;

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

    let quotaSize = 0n;
    if (values.quotaSize && quotaType !== QuotaType.NONE) {
      quotaSize =
        BigInt(values.quotaSize) * FACTOR_MAP[this.state.quotaSizeFactor];
    }
    const settings: BucketSettings = {
      maxBlockSize,
      quotaType,
      quotaSize,
      maxBlockRecords,
    };
    const { bucketName, client } = this.props;
    this.setState({ saving: true });
    try {
      if (bucketName === undefined) {
        await client.createBucket(values.name, settings);
      } else {
        const bucket = await client.getBucket(bucketName);
        await bucket.setSettings(settings);
        if (bucketName !== values.name) await bucket.rename(values.name);
      }
      this.setState({ saving: false }, () => {
        this.props.onCreated();
        navigate(`/buckets/${values.name}`);
      });
    } catch (err) {
      if (err instanceof APIError) {
        this.setState({ error: err.message, saving: false });
      } else {
        console.error("Unexpected error: ", err);
        this.setState({ saving: false });
      }
    }
  }

  async componentDidMount() {
    const { bucketName, client } = this.props;

    try {
      let settings;
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
        quotaType: settings.quotaType ? QuotaType[settings.quotaType] : "NONE",
        maxBlockSizeFactor: this.calcBestFactor(
          settings.maxBlockSize,
          BLOCK_SIZE_FACTORS,
          DEFAULT_BLOCK_SIZE_FACTOR,
        ),
        quotaSizeFactor: this.calcBestFactor(
          settings.quotaSize,
          QUOTA_SIZE_FACTORS,
          DEFAULT_QUOTA_FACTOR,
        ),
      });
    } catch (err) {
      if (err instanceof APIError) {
        this.setState({ error: err.message });
      } else {
        console.error("Unexpected error: ", err);
      }
    }
  }

  calcBestFactor(
    value: bigint | undefined,
    factors: string[],
    defaultFactor: string,
  ): string {
    let result = defaultFactor;
    if (!value) {
      return result;
    }

    for (const factor of factors) {
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
    const {
      error,
      settings,
      maxBlockSizeFactor,
      quotaSizeFactor,
      quotaType,
      saving,
    } = this.state;
    if (settings === undefined) {
      return (
        <>
          {error ? (
            <Alert
              title={error}
              type="error"
              closable={{ onClose: () => this.setState({ error: undefined }) }}
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
      factors: string[],
      onChange?: (value: string) => void,
    ) => (
      <Select
        defaultValue={initValue}
        style={{ width: 70 }}
        onChange={onChange}
        options={factors.map((factor) => ({ value: factor, label: factor }))}
      />
    );

    const { bucketName, showAll } = this.props;
    const initValueFromDefault = (factor: string, value?: bigint) =>
      value !== undefined ? (value / FACTOR_MAP[factor]).toString() : "";
    const isQuotaEnabled = quotaType === "FIFO" || quotaType === "HARD";
    const initialQuotaSize =
      settings.quotaType === QuotaType.NONE
        ? FACTOR_MAP[DEFAULT_QUOTA_FACTOR]
        : settings.quotaSize;

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
        disabled={this.props.readOnly}
      >
        {error ? (
          <Alert
            title={error}
            type="error"
            closable={{ onClose: () => this.setState({ error: undefined }) }}
          />
        ) : (
          <div />
        )}
        <div style={{ padding: "15px" }}>
          <Form.Item
            label="Name"
            name="name"
            initialValue={bucketName ? bucketName : "new_bucket"}
          >
            <Input
              id="InputName"
              onChange={(event) => validateBucketName(event.target.value)}
            />
          </Form.Item>
          <Form.Item
            label="Quota Type"
            name="quotaType"
            initialValue={quotaType}
          >
            <Select
              onChange={(value) => this.setState({ quotaType: value })}
              options={[
                { value: "NONE", label: "NONE" },
                { value: "FIFO", label: "FIFO" },
                { value: "HARD", label: "HARD" },
              ]}
            />
          </Form.Item>
          {isQuotaEnabled && (
            <Form.Item label="Quota Size">
              <Space.Compact>
                <Form.Item
                  noStyle
                  name="quotaSize"
                  initialValue={initValueFromDefault(
                    quotaSizeFactor,
                    initialQuotaSize,
                  )}
                >
                  <InputNumber controls={false} stringMode />
                </Form.Item>
                {sizeSelector(quotaSizeFactor, QUOTA_SIZE_FACTORS, (value) =>
                  this.setState({ quotaSizeFactor: value }),
                )}
              </Space.Compact>
            </Form.Item>
          )}
        </div>
        <Collapse
          bordered={true}
          ghost={true}
          style={{ padding: "0px" }}
          defaultActiveKey={showAll ? ["1"] : []}
          items={[
            {
              key: "1",
              label: "Advanced Settings",
              forceRender: true,
              children: (
                <div>
                  <Form.Item
                    label="Max. Records"
                    initialValue={settings.maxBlockRecords}
                    name="maxBlockRecords"
                  >
                    <InputNumber controls={false} precision={0} stringMode />
                  </Form.Item>
                  <Form.Item label="Max. Block Size">
                    <Space.Compact>
                      <Form.Item
                        noStyle
                        name="maxBlockSize"
                        initialValue={initValueFromDefault(
                          maxBlockSizeFactor,
                          settings.maxBlockSize,
                        )}
                      >
                        <InputNumber
                          controls={false}
                          precision={0}
                          stringMode
                        />
                      </Form.Item>
                      {sizeSelector(
                        maxBlockSizeFactor,
                        BLOCK_SIZE_FACTORS,
                        (value) => this.setState({ maxBlockSizeFactor: value }),
                      )}
                    </Space.Compact>
                  </Form.Item>
                </div>
              ),
            },
          ]}
        />

        <Form.Item wrapperCol={{ offset: 17, span: 17 }}>
          <Button
            type="primary"
            htmlType="submit"
            name="submit"
            loading={saving}
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
  const hookNavigate = useNavigate();
  const nav = props.navigate || hookNavigate;
  return <BucketSettingsForm {...props} navigate={nav} />;
};

export default BucketSettingsFormWrapper;
