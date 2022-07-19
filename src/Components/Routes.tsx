import React from "react";
import {IBackendAPI} from "../BackendAPI";
import {Redirect, Route, RouteComponentProps, Switch} from "react-router-dom";
import Dashboard from "../Views/Dashboard/Dashboard";
import NotFount from "../Views/NoFound";
import Login from "../Views/Auth/Login";
import BucketPanel from "../Views/BucketPanel/BucketPanel";

interface Props extends RouteComponentProps {
    backendApi: IBackendAPI;
    isAllowed: boolean;
    onLogin: () => void;
}


// @ts-ignore
function PrivateRoute({children, isAllowed, ...rest}) {
    return (
        <Route {...rest} render={() => {
            return isAllowed ? children : <Redirect to="/login"/>;
        }}/>
    );
}

export function Routes(props: Props): JSX.Element {
    const {isAllowed} = props;

    return (
        <Switch>
            <Route exact path="/">
                {isAllowed ? <Redirect to="/dashboard"/> : <Redirect to="/login"/>}
            </Route>

            <Route exact path="/login">
                <Login {...props}/>
            </Route>

            <PrivateRoute exact path="/dashboard" isAllowed={isAllowed}>
                <Dashboard {...props}/>
            </PrivateRoute>

            <PrivateRoute exact path="/buckets" isAllowed={isAllowed}>
                <BucketPanel client={props.backendApi.client}/>
            </PrivateRoute>

            <Route>
                <NotFount/>
            </Route>
        </Switch>
    );
}
