import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp, h, type App } from "vue";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import SimpleZoneCard from "@/components/simple/SimpleZoneCard.vue";
import { useSnapcastStore } from "@/stores/snapcast";
import type { Group, Client } from "@/stores/snapcast";

let app: App;
let host: HTMLElement;
let pinia: Pinia;

function client(id: string): Client {
  return {
    id,
    name: id,
    host: { name: id, ip: "", mac: "", arch: "", os: "" },
    connected: true,
    config: { instance: 1, latency: 0, name: id, volume: { muted: false, percent: 50 } },
    snapclient: {} as Client["snapclient"],
  } as Client;
}

function baseGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: "g1",
    name: "Aracari",
    stream_id: "s1",
    clients: [client("c1")],
    muted: false,
    ...overrides,
  };
}

function mount(group: Group) {
  host = document.createElement("div");
  document.body.appendChild(host);
  app = createApp({ render: () => h(SimpleZoneCard, { group }) });
  app.use(pinia);
  app.mount(host);
}

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
});

afterEach(() => {
  app?.unmount();
  document.body.innerHTML = "";
});

describe("SimpleZoneCard volume row", () => {
  it("labels the volume-summary row as a navigation affordance", () => {
    const snapcast = useSnapcastStore();
    snapcast.streams = [{ id: "s1", uri: "spotify:x", status: "idle" }];
    mount(baseGroup());

    expect(host.textContent).toContain("Volume & speakers");
  });
});
