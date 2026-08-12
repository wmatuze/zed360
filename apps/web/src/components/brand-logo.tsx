type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
};

export function BrandLogo({
  className = "",
  markClassName = "h-9 w-9",
  showWordmark = true,
  wordmarkClassName = "text-xl",
}: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`.trim()}>
      <svg
        aria-hidden="true"
        className={`shrink-0 ${markClassName}`}
        viewBox="0 0 40 40"
      >
        <path
          d="M9.2 3.4 30 2.1c4.1-.3 7.5 2.8 7.8 6.9l1 20.7c.2 4-2.8 7.5-6.9 7.8L11.2 39c-4.1.3-7.6-2.8-7.8-6.9L2 11.2c-.3-4.1 2.9-7.5 7.2-7.8Z"
          fill="#b8f238"
        />
        <path
          d="M12.1 12.2 28 11.3l.3 5-8.6 10.2 9.3-.6.4 5.3-16.8 1-.3-4.8 8.8-10.4-8.6.5-.4-5.3Z"
          fill="#0b0d12"
        />
        <path
          d="m30.6 7.3 1.2 2.3 2.4 1.1-2.3 1.3-1.1 2.4-1.3-2.3-2.4-1.1 2.3-1.3 1.2-2.4Z"
          fill="#fff"
          opacity=".9"
        />
      </svg>
      {showWordmark ? (
        <span
          className={`font-semibold leading-none tracking-[-0.055em] text-white ${wordmarkClassName}`}
        >
          Zed<span className="text-[var(--lime)]">360</span>
        </span>
      ) : null}
    </span>
  );
}
