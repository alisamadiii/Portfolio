import { Eyebrow } from '../components/Eyebrow';
import { ScissorsIcon, UsersIcon, UtensilsIcon, WrenchIcon } from '../components/Icons';

const CARDS = [
  { icon: WrenchIcon, title: 'Handymen and contractors', text: "You're in homes and shops every week, and you hear which businesses still run on word of mouth alone." },
  { icon: ScissorsIcon, title: 'Barbers and salon owners', text: "Business owners sit in your chair and talk. You already know who's been meaning to get online." },
  { icon: UtensilsIcon, title: 'Restaurant owners', text: 'You know the suppliers, neighbors and owners on your block, and which of them have no site or an outdated one.' },
];

export function WhoItsFor() {
  return (
    <section id="who" aria-labelledby="who-h" className="section section--white">
      <div className="container">
        <Eyebrow reveal="1">Who it's for</Eyebrow>
        <h2 id="who-h" className="h2" data-reveal="2">People who already know local business owners</h2>
        <div className="grid-3" style={{ marginTop: 48 }}>
          {CARDS.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="card card--soft" data-reveal={String(i + 2)}>
              <span className="icon-box"><Icon color="#221F1C" /></span>
              <h3 className="h3 card__title">{title}</h3>
              <p className="body-2">{text}</p>
            </div>
          ))}
        </div>
        <div className="card card--ink card-row" data-reveal="2" style={{ marginTop: 24, gap: 24 }}>
          <span className="icon-box icon-box--coral"><UsersIcon color="#221F1C" /></span>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <h3 className="h3" style={{ marginBottom: 8 }}>Anyone who knows local business owners</h3>
            <p style={{ maxWidth: 760, color: 'var(--on-ink-2)' }}>
              Accountants, realtors, community organizers and similar. If owners trust your recommendation, you're well
              placed to make an introduction.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
