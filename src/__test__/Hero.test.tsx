import { render, screen } from "@testing-library/react";
import { Hero } from "@/container";

describe("About", () => {
  it("render component correctly", () => {
    render(<Hero />);

    const TwitterLink = screen.getByRole("twitter-link");
    const name = screen.getByRole("heading", { name: /ali reza/i });

    expect(TwitterLink && name).toBeInTheDocument();
  });
});
