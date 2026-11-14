import { Eyebrow } from '../components/Eyebrow';
import { CalendarCheckIcon, CodeScreenIcon, DashboardIcon, MailIcon } from '../components/Icons';
import { program } from '../config';
import { money } from '../lib/money';

const CARDS = [
  { icon: DashboardIcon, title: 'Client Hub dashboard', text: 'See website visitors and Google Ads results, and connect tools they already use, like Google Calendar, Resend email, Netlify hosting and Wix.' },
  { icon: CalendarCheckIcon, title: 'Leads & bookings', text: 'Every website form submission lands in a leads inbox. Track each lead and book appointments on Google Calendar.' },
  { icon: MailIcon, title: 'Newsletter', text: 'The business sends its own email newsletter to its customers, right from the dashboard.' },
];

export function WhatWeBuild() {
  return (
    <section id="build" aria-labelledby="build-h" className="section">
      <div className="container">
        <Eyebrow reveal="1">What we build</Eyebrow>
        <h2 id="build-h" className="h2" data-reveal="2">What you're offering, in one sentence</h2>
        <p className="lead" data-reveal="3">
          A custom, hand-coded website the business owns, plus a dashboard for its leads, bookings and newsletter.
        </p>
        <div className="card card-row" data-reveal="2" style={{ marginTop: 48 }}>
          <span className="icon-box icon-box--coral"><CodeScreenIcon color="#221F1C" /></span>
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <h3 className="h3" style={{ fontSize: 24, marginBottom: 8 }}>Custom website</h3>
            <p className="body-2">Designed and hand-coded for each local business. The business owns its website code, design and accounts.</p>
          </div>
          <div style={{ flex: '0 1 260px', borderLeft: '1px solid var(--line)', paddingLeft: 24 }}>
            <p className="muted" style={{ fontSize: 15 }}>Main plan setup</p>
            <p style={{ marginTop: 2, fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>{money(program.mainPlanPrice)}</p>
            <p className="muted" style={{ marginTop: 4, fontSize: 15 }}>plus {money(program.hubMonthly)} a month for Client Hub</p>
          </div>
        </div>
        <div className="grid-3" style={{ marginTop: 24 }}>
          {CARDS.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="card" data-reveal={String(i + 2)}>
              <span className="icon-box icon-box--soft"><Icon color="#221F1C" /></span>
              <h3 className="h3 card__title">{title}</h3>
              <p className="body-2">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
