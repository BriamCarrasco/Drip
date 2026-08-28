import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import * as icons from "@/components/icons";

const iconNames = Object.keys(icons) as (keyof typeof icons)[];

describe("icons", () => {
  it.each(iconNames)("%s renders an svg", (name) => {
    const Icon = icons[name];
    const { container } = render(<Icon />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("applies a custom size and className", () => {
    const { container } = render(<icons.HomeIcon size={40} className="text-red-500" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "40");
    expect(svg).toHaveAttribute("height", "40");
    expect(svg).toHaveClass("text-red-500");
  });
});
