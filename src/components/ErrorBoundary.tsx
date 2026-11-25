import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Say } from './Mascot';
import { t } from '@/i18n';

interface State {
  err: Error | null;
}
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, State> {
  state: State = { err: null };
  static getDerivedStateFromError(err: Error): State {
    return { err };
  }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[ui]', err, info.componentStack);
  }
  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.err) this.setState({ err: null });
  }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="card">
        <Say state="sad">{t('Что-то пошло не так, но я уже чиню.')}</Say>
        <pre className="small">{this.state.err.message}</pre>
        <a className="btn" href="#/home">{t('На главную')}</a>
      </div>
    );
  }
}
