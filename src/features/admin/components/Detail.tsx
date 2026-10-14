export function Field({ label, value, money }: { label: string; value: string; money?: boolean }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className={`mt-1 font-medium ${money ? "text-price" : ""}`}>{value}</p>
    </div>
  );
}

export function Detail({ label, value, link }: { label: string; value: string | null; link?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      {link ? (
        <a href={value} target="_blank" rel="noreferrer noopener" className="break-all underline underline-offset-4">
          {value}
        </a>
      ) : (
        <p className="whitespace-pre-wrap break-words">{value}</p>
      )}
    </div>
  );
}
