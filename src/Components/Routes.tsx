import React from "react";
import { IBackendAPI } from "../BackendAPI";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
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
import QueryPanelPage from "../Views/QueryPanel/QueryPanelPage";

interface Props {
  backendApi: IBackendAPI;
  apiUrl: string;
  onLogin: () => void;
  permissions?: TokenPermissions;
}

function PrivateRoute({
  children,
  authorized,
}: {
  children: React.ReactNode;
  authorized: boolean;
}) {
  return authorized ? <>{children}</> : <Navigate to="/login" />;
}

/**
 * Wrapper that keys EntryDetail on the full URL path so React fully
 * remounts the component (and its Chart.js instances) when navigating
 * between entries/sub-entries.
 */
function KeyedEntryDetail(
  entryProps: React.ComponentProps<typeof EntryDetail>,
) {
  const location = useLocation();
  return <EntryDetail key={location.pathname} {...entryProps} />;
}

export function AppRoutes(props: Props): React.ReactElement {
  const authorized = props.permissions !== undefined;

  return (
    <Routes>
      <Route
        path="/"
        element={
          authorized ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
        }
      />

      <Route path="/login" element={<Login {...props} />} />

      <Route
        path="/dashboard"
        element={
          <PrivateRoute authorized={authorized}>
            <Dashboard {...props} />
          </PrivateRoute>
        }
      />

      <Route
        path="/buckets"
        element={
          <PrivateRoute authorized={authorized}>
            <BucketList client={props.backendApi.client} {...props} />
          </PrivateRoute>
        }
      />

      <Route
        path="/buckets/:name"
        element={
          <PrivateRoute authorized={authorized}>
            <BucketDetail client={props.backendApi.client} {...props} />
          </PrivateRoute>
        }
      />

      <Route
        path="/buckets/:bucketName/entries/:entryName/*"
        element={
          <PrivateRoute authorized={authorized}>
            <KeyedEntryDetail client={props.backendApi.client} {...props} />
          </PrivateRoute>
        }
      />

      <Route
        path="/query"
        element={
          <PrivateRoute authorized={authorized}>
            <QueryPanelPage client={props.backendApi.client} {...props} />
          </PrivateRoute>
        }
      />

      <Route
        path="/replications"
        element={
          <PrivateRoute authorized={authorized}>
            <Replications client={props.backendApi.client} {...props} />
          </PrivateRoute>
        }
      />

      <Route
        path="/replications/:name"
        element={
          <PrivateRoute authorized={authorized}>
            <ReplicationDetail client={props.backendApi.client} {...props} />
          </PrivateRoute>
        }
      />

      <Route
        path="/tokens"
        element={
          <PrivateRoute
            authorized={authorized && !!props.permissions?.fullAccess}
          >
            <TokenList client={props.backendApi.client} />
          </PrivateRoute>
        }
      />

      <Route
        path="/tokens/:name"
        element={
          <PrivateRoute
            authorized={authorized && !!props.permissions?.fullAccess}
          >
            <TokenDetail client={props.backendApi.client} />
          </PrivateRoute>
        }
      />

      <Route path="*" element={<NotFount />} />
    </Routes>
  );
}
