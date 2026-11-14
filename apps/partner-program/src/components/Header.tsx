import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { program } from '../config';
import { useScrollProgress } from '../lib/motion';

export function Header() {
  const progressRef = useScrollProgress();
  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="brand">
          <Logo />
          {program.company}
        </Link>
        <nav className="nav" aria-label="Main">
          <a className="nav__link" href="/#how">How it works</a>
          <a className="nav__link" href="/#earnings">Earnings</a>
          <Link className="btn-ink" to="/apply">Apply</Link>
        </nav>
      </div>
      <div className="progress" ref={progressRef} aria-hidden="true" />
    </header>
  );
}

export function ApplyHeader() {
  return (
    <header className="header" style={{ position: 'static' }}>
      <div className="header__inner" style={{ maxWidth: 1120, margin: '0 auto', padding: '0 var(--gutter)' }}>
        <Link to="/" className="brand">
          <Logo />
          {program.company}
        </Link>
        <Link to="/" className="link-strong">← Partner Program</Link>
      </div>
    </header>
  );
}
