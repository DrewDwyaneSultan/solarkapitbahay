import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            UI crashed while rendering.
          </h1>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 12,
            }}
          >
            {String(this.state.error?.stack || this.state.error)}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

