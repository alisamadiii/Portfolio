import { Spinner } from "@workspace/ui/components/spinner";

interface StatusProps {
  active: boolean;
  loading: boolean;
}

const Status = ({ active, loading }: StatusProps) => {
  if (loading) {
    return (
      <div className="text-muted-foreground bg-muted mb-2 flex size-7 items-center justify-center rounded-full border">
        <Spinner className="size-4" />
      </div>
    );
  }
  if (!active) {
    return (
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-2"
      >
        <rect width="28" height="28" rx="14" fill="#DC2525" fillOpacity="0.1" />
        <path
          d="M9.63184 18.3688L14.0007 14M14.0007 14L18.3695 9.6311M14.0007 14L9.63184 9.6311M14.0007 14L18.3695 18.3688"
          stroke="#DC2525"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mb-2"
    >
      <rect width="28" height="28" rx="14" fill="#00B803" fillOpacity="0.1" />
      <path
        d="M8.16699 14.8333L11.5003 18.1666L19.8337 9.83331"
        stroke="#00B803"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export { Status };
