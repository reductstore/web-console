import { Component, ErrorInfo, ReactNode } from "react";
import { Alert, Button } from "antd";

interface BuilderErrorBoundaryProps {
  children: ReactNode;
}

interface BuilderErrorBoundaryState {
  hasError: boolean;
}

export default class BuilderErrorBoundary extends Component<
  BuilderErrorBoundaryProps,
  BuilderErrorBoundaryState
> {
  state: BuilderErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): BuilderErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Query builder crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert
          type="error"
          showIcon
          title="Something went wrong in the query builder"
          description="Please reload the page to keep editing this query."
          action={
            <Button size="small" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}
