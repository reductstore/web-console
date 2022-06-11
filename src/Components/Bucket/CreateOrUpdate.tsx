import React from "react";
import {Bucket, BucketSettings, Client, QuotaType, ServerInfo} from "reduct-js";
import {Alert, Button, Form, Input, InputNumber, Select, Spin} from "antd";

const {Option} = Select;

interface Props {
    client: Client;
    bucketName?: string;    // if set we update a bucket
    onCreated: () => void;
}

interface State {
    maxBlockSizeFactor: string;
    quotaSizeFactor: string;
    error?: string;
    settings?: BucketSettings;

}

const DEFAULT_FACTOR = "20";

export default class CreateOrUpdate extends React.Component<Props, State> {
    constructor(props: Readonly<Props>) {
        super(props);
        this.state = {maxBlockSizeFactor: DEFAULT_FACTOR, quotaSizeFactor: DEFAULT_FACTOR};
        this.onFinish = this.onFinish.bind(this);
    }

    async onFinish(values: any): Promise<void> {
        let maxBlockSize = undefined;
        if (values.maxBlockSize) {
            maxBlockSize = BigInt(values.maxBlockSize) * (2n ** BigInt(this.state.maxBlockSizeFactor));
        }

        const {quotaType} = values;

        let quotaSize = undefined;
        if (values.quotaSize) {
            quotaSize = BigInt(values.quotaSize) * (2n ** BigInt(this.state.quotaSizeFactor));
        }

        const settings: BucketSettings = {maxBlockSize, quotaType, quotaSize};
        const {bucketName, client} = this.props;
        try {
            if (bucketName === undefined) {
                await client.createBucket(values.name, settings);
            } else {
                const bucket = await client.getBucket(bucketName);
                await bucket.setSettings(settings);
            }
            this.props.onCreated();

        } catch (err: any) {
            this.setState({error: err.message});
        }
    }

    async componentDidMount() {
        const {bucketName, client} = this.props;
        let settings = null;

        try {
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
                quotaSizeFactor: this.calcBestFactor(settings.quotaSize)
            });
        } catch (err: any) {
            this.setState({error: err.message});
        }

    }

    calcBestFactor(value?: bigint) {
        let result = DEFAULT_FACTOR;
        if (!value) {
            return result;
        }

        ["1", "10", "20", "30"].forEach((factor) => {
            const divisor = 2n ** BigInt(factor);
            if (value / divisor * divisor == value) {
                result = factor;
            } else {
                return;
            }
        });

        return result;
    }

    render() {
        const {error, settings, maxBlockSizeFactor, quotaSizeFactor} = this.state;
        if (settings === undefined) {
            return <Spin size="large"/>;
        }


        const sizeSelector = (initValue: string, onChange?: (value: string) => void) => (
            <Select defaultValue={initValue} style={{width: 70}} onChange={onChange}>
                <Option value="1">B</Option>
                <Option value="10">KB</Option>
                <Option value="20">MB</Option>
                <Option value="30">GB</Option>
            </Select>
        );

        const {bucketName} = this.props;
        const initValueFromDefault = (factor: string, value?: bigint) => value !== undefined ?
            (value / 2n ** BigInt(factor)).toString() : "";

        console.log(this.state);
        return <Form onFinish={this.onFinish}>
            {error ? <Alert message={error} type="error" closable onClose={() => this.setState({error: undefined})}/> :
                <div/>}

            <Input.Group compact>
                <Form.Item style={{display: "inline-block", width: "calc(50% - 8px)"}} label="Name" name="name"
                           rules={[{required: true, message: "Can't be empty"}]}
                           initialValue={bucketName}>
                    <Input disabled={bucketName !== undefined}/>
                </Form.Item>
                <Form.Item style={{display: "inline-block", width: "calc(50% - 8px)", margin: "0 8px"}}
                           label="Max. Block Size"
                           initialValue={initValueFromDefault(maxBlockSizeFactor, settings.maxBlockSize)}
                           name="maxBlockSize">
                    <InputNumber controls={false} precision={0} stringMode
                                 addonAfter={sizeSelector(maxBlockSizeFactor, (value) => this.setState({maxBlockSizeFactor: value}))}/>
                </Form.Item>
            </Input.Group>
            <Input.Group compact>
                <Form.Item style={{display: "inline-block", width: "calc(50% - 8px)"}}
                           label="Quota Type" name="quotaType"
                           initialValue={settings.quotaType ? QuotaType[settings.quotaType] : "NONE"}>
                    <Select>
                        <Option value="NONE">NONE</Option>
                        <Option value="FIFO">FIFO</Option>
                    </Select>
                </Form.Item>
                <Form.Item style={{display: "inline-block", width: "calc(50% - 8px)", margin: "0 8px"}}
                           label="Quota Size"
                           initialValue={initValueFromDefault(quotaSizeFactor, settings.quotaSize)}
                           name="quotaSize">
                    <InputNumber controls={false} stringMode
                                 addonAfter={sizeSelector(quotaSizeFactor, (value) => this.setState({quotaSizeFactor: value}))}/>
                </Form.Item>
            </Input.Group>

            <Form.Item wrapperCol={{offset: 0, span: 16}}>
                <Button type="primary" htmlType="submit">
                    {bucketName ? "Update" : "Create"}
                </Button>
            </Form.Item>
        </Form>;
    }
}
