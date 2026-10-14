import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an uncaught exception:", error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && this.props.resetKey !== prevProps.resetKey) {
      this.setState({ hasError: false, error: null, showDetails: false });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
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
            minHeight: "65vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "50px 24px",
            textAlign: "center",
            background: "radial-gradient(circle at center, #ffffff 0%, #fbf3e7 100%)",
          }}
        >
          <div
            style={{
              maxWidth: "520px",
              width: "100%",
              background: "#ffffff",
              padding: "44px 36px",
              borderRadius: "20px",
              boxShadow: "0 20px 45px rgba(122, 31, 43, 0.08)",
              border: "1px solid rgba(122, 31, 43, 0.12)",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(122, 31, 43, 0.08) 0%, rgba(217, 164, 65, 0.15) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                margin: "0 auto 16px",
                border: "1px solid rgba(122, 31, 43, 0.15)",
              }}
            >
              ✨
            </div>

            <span
              style={{
                display: "inline-block",
                background: "rgba(122, 31, 43, 0.06)",
                color: "var(--color-primary, #7a1f2b)",
                fontSize: "12px",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "1px",
                padding: "4px 12px",
                borderRadius: "999px",
                marginBottom: "12px",
              }}
            >
              Graceful Recovery
            </span>

            <h2
              style={{
                fontFamily: "var(--font-heading, 'Playfair Display', serif)",
                color: "var(--color-primary, #7a1f2b)",
                fontSize: "28px",
                marginBottom: "10px",
              }}
            >
              Something went slightly off
            </h2>

            <p
              style={{
                color: "#6b554e",
                fontSize: "14.5px",
                lineHeight: "1.6",
                marginBottom: "24px",
              }}
            >
              We encountered an unexpected display issue while presenting this collection.
              Your cart items and saved data are completely safe.
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginBottom: "20px" }}>
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
                Return to Home
              </button>
            </div>

            {/* Diagnostic Toggle */}
            <div style={{ borderTop: "1px dashed rgba(122, 31, 43, 0.15)", paddingTop: "14px" }}>
              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                style={{
                  background: "none",
                  border: "none",
                  color: "#9ca3af",
                  fontSize: "12px",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {this.state.showDetails ? "Hide technical diagnostic" : "Show technical diagnostic"}
              </button>

              {this.state.showDetails && (
                <div
                  style={{
                    marginTop: "12px",
                    background: "#f9fafb",
                    padding: "12px",
                    borderRadius: "8px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    color: "#b91c1c",
                    maxHeight: "140px",
                    overflowY: "auto",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  {this.state.error?.toString() || "Unknown error"}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
