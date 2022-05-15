// import React from "React";
import {Form} from "semantic-ui-react";
import {useState} from "react";

interface Props {
    label: string;
    input: string;
    placeholder: string;
    error?: string;
    onChange: (value: number) => void;
}

export default function SizeInput(props: Props): JSX.Element {
    const [size, setSize] = useState(1);
    const [error, setError] = useState<string | undefined>(props.error);

    const sizes = [
        {text: "B", value: 1},
        {text: "kB", value: 2 ** 10},
        {text: "MB", value: 2 ** 20},
        {text: "TB", value: 2 ** 30},
    ];

    const onChange = (value: string) => {
        try {
            const numValue = Number.parseInt(value);
            props.onChange(numValue * size);
        } catch (e) {
            setError(`'${value}' in not a number`);
        }
    };

    return (
        <Form.Group inline>
            <Form.Input label={props.label} error={error} input={props.input} placeholder={props.placeholder}
                        onChange={(e) => onChange(e.target.value)}>
            </Form.Input>
            <Form.Select compact label="Units" options={sizes} defaultValue={1}
                         onChange={(_, data) =>
                             setSize(data.value ? Number(data.value) : 1)}>
            </Form.Select>
        </Form.Group>);
}
