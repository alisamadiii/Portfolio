import { render, screen } from "@testing-library/react";
import Navbar from "../components/Navbar";

test("navbar", () => {
  render(<Navbar />);

  const logo = screen.getByAltText("logo");

  expect(logo).toBeInTheDocument();
});
