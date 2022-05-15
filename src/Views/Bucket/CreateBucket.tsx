import React from "react";
import {Client} from "reduct-js";
import SizeInput from "../../Components/SizeInput";
import {Form, Button, Icon, Container, Header} from "semantic-ui-react";

interface Props {
    client: Client;
    onCreated: () => void;
    onCanceled: () => void;
}

interface State {
    name: string,
    maxBlockSize?: number;
    quotaType?: string;
    quotaSize?: number;

    errors: Record<string, string>
}

export default class CreateBucket extends React.Component<Props, State> {
    constructor(props: Readonly<Props>) {
        super(props);
        this.state = {name: "", errors: {}};
        this.createBucket = this.createBucket.bind(this);
    }

    createBucket(): void {
        this.setState({errors: {maxBlockSize: "AAAAAAA"}});
        // this.props.onCreated();
    }

    render() {
        const {errors} = this.state;
        return (
            <Container style={{padding: "1em"}}>
                <Header>Create a new bucket</Header>
                <Form onSubmit={this.createBucket}>
                    <Form.Group widths="equal">
                        <Form.Input label="Name" required input="text" placeholder="Unique name for the bucket"
                                    error={errors.name}
                                    onChange={(e) => this.setState({name: e.target.value})}/>

                        <SizeInput label="Max. Block Size" input="text" placeholder="default"
                                   error={errors.maxBlockSize}
                                   onChange={(value) => this.setState({maxBlockSize: value})}/>
                    </Form.Group>
                    <Form.Group widths="equal">
                        <Form.Select label="Quota Type"
                                     options={[{text: "NONE", value: "NONE"}, {text: "FIFO", value: "FIFO"}]}
                                     defaultValue={"NONE"}
                                     onChange={(_, data) =>
                                         this.setState({quotaType: data.value ? data.value.toString() : "NONE"})}/>

                        <SizeInput label="Max. Block Size" input="text" placeholder="default"
                                   onChange={(value) => this.setState({maxBlockSize: value})}/>
                    </Form.Group>
                    <Button.Group>
                        <Button onClick={this.props.onCanceled}>Cancel</Button>
                        <Button positive type="submit" disabled={this.state.name == ""}>
                            <Icon name="checkmark"/>
                            Create
                        </Button>
                    </Button.Group>
                </Form>
            </Container>);
    }
}
