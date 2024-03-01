import React, {useEffect, useState} from "react";
import {Form, Input, Modal} from "antd";

interface Props {
    name: string;
    onRemoved: () => void;
    onCanceled: () => void;
    resourceType: string;
    confirm: boolean;
}

export default function RemoveConfirmationByName(props: Readonly<Props>) {
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [confirmName, setConfirmName] = useState(false);

    useEffect(() => {
        setConfirmRemove(props.confirm);
    }, [props.confirm]);

    const checkName = (bucketName: string) => {
        setConfirmName(bucketName == props.name);
    };

    return (<Modal open={confirmRemove} onOk={() => {
        props.onRemoved();
        setConfirmRemove(false);
    }} onCancel={props.onCanceled} closable={false}
        title={`Remove ${props.resourceType} "${props.name}"?`}
        okText="Remove"
        confirmLoading={!confirmName}
        okType="danger"
        data-testid="delete-modal">
        <p>
            For confirmation type <b>{props.name}</b>
        </p>
        <Form.Item name="confirm">
            <Input onChange={(e) => checkName(e.target.value)} data-testid="confirm-input" ></Input>
        </Form.Item>
    </Modal>
    );
}
