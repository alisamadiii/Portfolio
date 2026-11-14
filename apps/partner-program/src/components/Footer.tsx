import { Logo } from './Logo';
import { contact, program } from '../config';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__top">
          <div style={{ flex: '1 1 280px' }}>
            <p className="brand" style={{ color: 'inherit', fontSize: 20 }}>
              <Logo size={36} />
              {program.company}
            </p>
            <address style={{ marginTop: 16, fontStyle: 'normal', lineHeight: 1.7, color: 'var(--on-ink-2)' }}>
              {contact.address}
              <br />
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
              <br />
              <a href={contact.phoneHref}>{contact.phone}</a>
            </address>
          </div>
          <nav aria-label="Footer">
            <ul className="footer__links">
              <li><a href={contact.website}>Main website ↗</a></li>
              <li><a href={contact.privacy}>Privacy policy</a></li>
              <li><a href={`mailto:${contact.email}`}>Contact</a></li>
              <li><a href={contact.terms}>Terms</a></li>
            </ul>
          </nav>
        </div>
        <div className="footer__bottom">
          <p>© {new Date().getFullYear()} {program.company}</p>
          <p>Partner payouts are one-time and depend on the client's plan. Not an employment offer.</p>
        </div>
      </div>
    </footer>
  );
}
