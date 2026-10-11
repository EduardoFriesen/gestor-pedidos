import React from 'react'

export default class AnalyticsBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="insight card insight-error" role="alert">
        <span>Esta vista tuvo un problema al mostrarse.</span>
        <button className="btn btn-outline btn-sm" onClick={() => this.setState({ failed: false })}>Reintentar</button>
      </div>
    )
  }
}
