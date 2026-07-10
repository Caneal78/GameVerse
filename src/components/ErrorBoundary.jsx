import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("GameVerse UI error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            padding: 24,
            textAlign: "center",
            gap: 12,
          }}
        >
          <h2 style={{ margin: 0 }}>Something went wrong</h2>
          <p style={{ color: "var(--text-muted)", maxWidth: 480 }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => window.location.reload()}
          >
            Reload GameVerse
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
