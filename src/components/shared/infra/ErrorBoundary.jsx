import { Component } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

/**
 * Catches render errors in a subtree and shows a recovery UI instead of a blank screen.
 */
export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  handleReset = () => {
    this.setState({ error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.error) {
      const { title = 'Something went wrong', message } = this.props
      return (
        <div className="min-h-[40vh] flex items-center justify-center p-6 bg-ink-50">
          <div className="max-w-md w-full card p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={22} className="text-rose-500" />
            </div>
            <h2 className="text-lg font-bold text-ink-800 mb-2">{title}</h2>
            <p className="text-sm text-ink-500 mb-4">
              {message || 'An unexpected error occurred. You can try again or reload the page.'}
            </p>
            {import.meta.env.DEV && (
              <pre className="text-left text-xs bg-ink-900 text-rose-200 rounded-lg p-3 mb-4 overflow-x-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex items-center justify-center gap-2">
              <button onClick={this.handleReset} className="btn-primary text-sm">
                <RotateCcw size={14} /> Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn-ghost text-sm"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
