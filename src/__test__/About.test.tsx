import { render, screen } from "@testing-library/react";
import { About } from "@/container";

const intersectionObserverMock = () => ({
  observe: () => null,
});
window.IntersectionObserver = jest
  .fn()
  .mockImplementation(intersectionObserverMock);

describe("About", () => {
  it("render component correctly", () => {
    render(<About />);

    const skills = screen.getAllByRole("skills");
    const MyImage = screen.getByAltText("my-image");

    expect(skills.length).toBeLessThanOrEqual(10);
    expect(MyImage).toBeInTheDocument();
  });
});
