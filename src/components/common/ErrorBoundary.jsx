import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an uncaught exception:", error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && this.props.resetKey !== prevProps.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback({ error: this.state.error, retry: this.handleRetry });
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 20px",
            textAlign: "center",
            backgroundColor: "var(--color-bg, #fbf3e7)",
          }}
        >
          <div
            style={{
              maxWidth: "480px",
              background: "#ffffff",
              padding: "40px",
              borderRadius: "16px",
              boxShadow: "0 10px 30px rgba(42, 24, 21, 0.08)",
            }}
          >
            <span style={{ fontSize: "48px", display: "block", marginBottom: "16px" }}>✨</span>
            <h2 style={{ color: "var(--color-primary, #7a1f2b)", marginBottom: "12px" }}>
              Something went slightly off
            </h2>
            <p style={{ color: "var(--color-muted, #5a4038)", fontSize: "15px", lineHeight: "1.6", marginBottom: "24px" }}>
              We encountered an unexpected display issue while presenting this collection.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={this.handleRetry}
                className="btn btn-primary btn-pill"
                style={{
                  background: "var(--color-primary, #7a1f2b)",
                  color: "#ffffff",
                  padding: "10px 24px",
                  border: "none",
                  borderRadius: "999px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="btn btn-secondary btn-pill"
                style={{
                  padding: "10px 24px",
                  borderRadius: "999px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
