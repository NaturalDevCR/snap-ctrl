import { afterEach, describe, expect, it } from "vitest";
import { createApp, h, type App } from "vue";
import SimpleVolumeSlider from "@/components/simple/SimpleVolumeSlider.vue";

let app: App;
let host: HTMLElement;

function mountSlider(volume: number, exponent = 1) {
  host = document.createElement("div");
  app = createApp({
    render: () => h(SimpleVolumeSlider, { volume, exponent, label: "Volume" }),
  });
  app.mount(host);
  return host.querySelector("input")!;
}

afterEach(() => app.unmount());

describe("SimpleVolumeSlider", () => {
  it("passes the track position as a 0-1 number", () => {
    expect(mountSlider(0).style.getPropertyValue("--p")).toBe("0");
  });

  it("reaches 1 at full volume", () => {
    expect(mountSlider(100).style.getPropertyValue("--p")).toBe("1");
  });

  it("follows the slider position, not the volume, on a curve", () => {
    expect(mountSlider(25, 2).style.getPropertyValue("--p")).toBe("0.5");
  });
});
