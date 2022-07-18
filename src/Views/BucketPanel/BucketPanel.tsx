import React from "react";
import {IBackendAPI} from "../../BackendAPI";

interface Props {
    backendApi: IBackendAPI;

}

type State = {
  placeholder?: boolean
};

/**
 * Bucket View
 */
export default class BucketPanel extends React.Component<Props, State> {
    constructor(props: Readonly<Props>) {
        super(props);
    }

    render() {
        return <div/>;
    }
}
