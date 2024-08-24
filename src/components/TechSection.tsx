import React from "react";

type Props = {};

export default function TechSection({}: Props) {
  return (
    <section className="mt-4">
      <div className="flex gap-4 border-b-wrapper px-2 py-1">
        <div>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM16 8H14.65V12H16V8ZM9.346 9.71L15.405 17.538L16.459 16.729L9.683 8H8V15.997H9.346V9.71Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <h3 className="text-muted">Next.js</h3>
      </div>
      <div className="flex gap-4 border-b-wrapper px-2 py-1">
        <div>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 6C9.33 6 7.67 7.33 7 10C8 8.67 9.17 8.17 10.5 8.5C11.26 8.69 11.81 9.24 12.41 9.85C13.39 10.85 14.5 12 17 12C19.67 12 21.33 10.67 22 8C21 9.33 19.83 9.83 18.5 9.5C17.74 9.31 17.2 8.76 16.59 8.15C15.61 7.15 14.5 6 12 6ZM7 12C4.33 12 2.67 13.33 2 16C3 14.67 4.17 14.17 5.5 14.5C6.26 14.69 6.8 15.24 7.41 15.85C8.39 16.85 9.5 18 12 18C14.67 18 16.33 16.67 17 14C16 15.33 14.83 15.83 13.5 15.5C12.74 15.31 12.2 14.76 11.59 14.15C10.61 13.15 9.5 12 7 12Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <h3 className="text-muted">Tailwind CSS</h3>
      </div>
      <div className="flex gap-4 px-2 py-1">
        <div>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 12L4 4V20L20 4V20L16 16"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M20 12L12 20L8 16"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <h3 className="text-muted">Framer Motion</h3>
      </div>
    </section>
  );
}
