interface SVGProps extends React.SVGProps<SVGSVGElement> {}

export const Logo = (props: SVGProps) => {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath="url(#clip0_3561_212)">
        <path
          d="M70.5869 82.0243H97.8874V100H70.5869V82.0243ZM46.4913 0L34.6717 20.9415H48.0666L29.2434 54.293H58.894L70.5869 33.576V57.6897H13.9329L2.11328 78.6276H15.5081L3.44588 100H33.1L45.1623 78.6276H97.8874V0H46.4913Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_3561_212">
          <rect width="100" height="100" fill="currentColor" />
        </clipPath>
      </defs>
    </svg>
  );
};

export const LogoV2 = (props: SVGProps) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect width="24" height="24" rx="6" fill="currentColor" />
    <path
      d="M14.5794 16.5671H18.4727V19.1306H14.5794V16.5671ZM11.1432 4.86963L9.45758 7.85609H11.3678L8.68347 12.6123H12.9119L14.5794 9.65787V13.0967H6.50005L4.81445 16.0827H6.72468L5.00449 19.1306H9.23345L10.9536 16.0827H18.4727V4.86963H11.1432Z"
      fill="white"
    />
  </svg>
);
