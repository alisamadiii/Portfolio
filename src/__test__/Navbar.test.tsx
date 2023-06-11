import { render, screen } from "@testing-library/react";
import Navbar from "../components/Navbar";

describe("Navbar", () => {
  test("Navbar must contains logo, nav-links, button", () => {
    render(<Navbar />);

    const logo = screen.getByAltText("logo");
    const LinkAbout = screen.getByRole("link", { name: /about/i });
    const LinkProject = screen.getByRole("link", { name: /project/i });
    const LinkProducts = screen.getByRole("link", { name: /products/i });
    const LinkBlogs = screen.getByRole("link", { name: /blogs/i });
    const button = screen.getByText("Chat Now");

    expect(
      logo && button && LinkAbout && LinkProject && LinkProducts && LinkBlogs
    ).toBeInTheDocument();
  });
});
