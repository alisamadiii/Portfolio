import { Fragment } from 'react';

const WHO = ['Handymen', 'Contractors', 'Barbers', 'Salon owners', 'Restaurant owners', 'Accountants', 'Realtors', 'Community organizers'];

function Group() {
  return (
    <div className="marquee__group">
      {WHO.map((w) => (
        <Fragment key={w}>
          <span>{w}</span>
          <span className="marquee__dot" />
        </Fragment>
      ))}
    </div>
  );
}

/** Decorative moving strip. Hidden from screen readers (the same info is in "Who it's for"). */
export function Marquee() {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        <Group />
        <Group />
      </div>
    </div>
  );
}
