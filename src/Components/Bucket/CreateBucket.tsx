import React from "react";
import {APIError, BucketSettings, Client} from "reduct-js";
import {Alert, Button, Form, Input, InputNumber, Select} from "antd";

const {Option} = Select;

interface Props {
    client: Client;
    onCreated: () => void;
}

interface State {
    maxBlockSizeFactor: string;
    quotaSizeFactor: string;
    error?: string;
}

const DEFAULT_FACTOR = "20";

export default class CreateBucket extends React.Component<Props, State> {
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
        this.props.client.createBucket(values.name, settings)
            .then(() => this.props.onCreated())
            .catch((err: APIError) => this.setState({error: err.message}));
    }

    render() {
        const sizeSelector = (onChange: (value: string) => void) => (
            <Select defaultValue={DEFAULT_FACTOR} style={{width: 70}} onChange={onChange}>
                <Option value="1">B</Option>
                <Option value="10">KB</Option>
                <Option value="20">MB</Option>
                <Option value="30">GB</Option>
            </Select>
        );

        const {error} = this.state;
        return <Form onFinish={this.onFinish}>
            {error ? <Alert message={error} type="error" closable onClose={() => this.setState({error: undefined})}/> :
                <div/>}

            <Input.Group compact>
                <Form.Item style={{display: "inline-block", width: "calc(50% - 8px)"}} label="Name" name="name"
                           rules={[{required: true, message: "Can't be empty"}]}>
                    <Input/>
                </Form.Item>
                <Form.Item style={{display: "inline-block", width: "calc(50% - 8px)", margin: "0 8px"}}
                           label="Max. Block Size"
                           name="maxBlockSize">
                    <InputNumber controls={false} precision={0} stringMode
                                 addonAfter={sizeSelector((value) => this.setState({maxBlockSizeFactor: value}))}/>
                </Form.Item>
            </Input.Group>
            <Input.Group compact>
                <Form.Item style={{display: "inline-block", width: "calc(50% - 8px)"}}
                           label="Quota Type" name="quotaType">
                    <Select defaultValue="NONE">
                        <Option value="NONE">NONE</Option>
                        <Option value="FIFO">FIFO</Option>
                    </Select>
                </Form.Item>
                <Form.Item style={{display: "inline-block", width: "calc(50% - 8px)", margin: "0 8px"}}
                           label="Quota Size"
                           name="quotaSize">
                    <InputNumber controls={false} stringMode
                                 addonAfter={sizeSelector((value) => this.setState({quotaSizeFactor: value}))}/>
                </Form.Item>
            </Input.Group>

            <Form.Item wrapperCol={{offset: 0, span: 16}}>
                <Button type="primary" htmlType="submit">
                    Create
                </Button>
            </Form.Item>
        </Form>;
    }
}
