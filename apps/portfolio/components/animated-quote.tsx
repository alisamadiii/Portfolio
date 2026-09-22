// Two fixed lines so "me." stays on line one.
const lines = ["“I don't want anyone to hire me.", "I want to be my own boss.”"];

export function AnimatedQuote() {
  // Running index across both lines → continuous per-letter stagger.
  let idx = -1;

  return (
    <p
      style={{ fontFamily: "'Gveret Levin', cursive" }}
      className="text-foreground mt-8 text-center leading-snug text-balance text-[clamp(0.95rem,5vw,1.8rem)]"
    >
      {lines.map((line, i) => (
        <span key={i} className="block whitespace-nowrap">
          {Array.from(line).map((ch, j) => {
            idx++;
            const delay = { animationDelay: `${idx * 15}ms` };
            // Spaces render as a fixed-width spacer so the inline-block letters
            // don't collapse the gaps.
            if (ch === " ") {
              return (
                <span
                  key={j}
                  className="motion-opacity-in-0 motion-duration-200 motion-ease-out inline-block w-[0.28em]"
                  style={delay}
                />
              );
            }
            return (
              <span
                key={j}
                className="motion-opacity-in-0 motion-duration-200 motion-ease-out inline-block"
                style={delay}
              >
                {ch}
              </span>
            );
          })}
        </span>
      ))}
    </p>
  );
}
