import React from "react";
import { IBackendAPI } from "../BackendAPI";
import { Redirect, Route, RouteComponentProps, Switch } from "react-router-dom";
import Dashboard from "../Views/Dashboard/Dashboard";
import NotFount from "../Views/NoFound";
import Login from "../Views/Auth/Login";
import BucketList from "../Views/BucketPanel/BucketList";
import BucketDetail from "../Views/BucketPanel/BucketDetail";
import TokenList from "../Views/SecurityPanel/TokenList";
import TokenDetail from "../Views/SecurityPanel/TokenDetail";
import { TokenPermissions } from "reduct-js";
import Replications from "../Views/Replications/Replications";
import ReplicationDetail from "../Views/Replications/ReplicationDetail";
import EntryDetail from "../Views/BucketPanel/EntryDetail";

interface Props extends RouteComponentProps {
  backendApi: IBackendAPI;
  onLogin: () => void;
  permissions?: TokenPermissions;
}

// @ts-ignore
function PrivateRoute({ children, authorized, ...rest }) {
  return (
    <Route
      {...rest}
      render={() => {
        return authorized ? children : <Redirect to="/login" />;
      }}
    />
  );
}

export function Routes(props: Props): JSX.Element {
  const authorized = props.permissions !== undefined;

  return (
    <Switch>
      <Route exact path="/">
        {authorized ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>

      <Route exact path="/login">
        <Login {...props} />
      </Route>

      <PrivateRoute exact path="/dashboard" authorized={authorized}>
        <Dashboard {...props} />
      </PrivateRoute>

      <PrivateRoute exact path="/buckets" authorized={authorized}>
        <BucketList client={props.backendApi.client} {...props} />
      </PrivateRoute>

      <PrivateRoute exact path="/buckets/:name" authorized={authorized}>
        <BucketDetail client={props.backendApi.client} {...props} />
      </PrivateRoute>

      <PrivateRoute
        exact
        path="/buckets/:bucketName/entries/:entryName"
        authorized={authorized}
      >
        <EntryDetail client={props.backendApi.client} {...props} />
      </PrivateRoute>

      <PrivateRoute exact path="/replications" authorized={authorized}>
        <Replications client={props.backendApi.client} {...props} />
      </PrivateRoute>

      <PrivateRoute exact path="/replications/:name" authorized={authorized}>
        <ReplicationDetail client={props.backendApi.client} {...props} />
      </PrivateRoute>

      <PrivateRoute
        exact
        path="/tokens"
        authorized={authorized && props.permissions?.fullAccess}
      >
        <TokenList client={props.backendApi.client} />
      </PrivateRoute>

      <PrivateRoute
        exact
        path="/tokens/:name"
        authorized={authorized && props.permissions?.fullAccess}
      >
        <TokenDetail client={props.backendApi.client} />
      </PrivateRoute>
      <Route>
        <NotFount />
      </Route>
    </Switch>
  );
}
