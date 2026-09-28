// The recording dot inside a rounded square; the ring pulses gently.
export function Logo() {
  return (
    <span
      aria-hidden="true"
      className="relative flex size-9 items-center justify-center rounded-xl bg-foreground shadow-sm"
    >
      <span className="absolute size-5 rounded-full bg-brand/30 motion-safe:animate-ping [animation-duration:2.5s]" />
      <span className="relative size-3 rounded-full bg-brand" />
    </span>
  );
}
