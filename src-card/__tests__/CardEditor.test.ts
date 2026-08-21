import { beforeEach, describe, expect, it } from "vitest";
import { SnapCtrlCardEditor } from "@/../src-card/CardEditor";

beforeEach(() => {
  if (!customElements.get("snap-ctrl-card-editor-test")) {
    customElements.define("snap-ctrl-card-editor-test", SnapCtrlCardEditor);
  }
});

function makeEditor(): SnapCtrlCardEditor {
  // Deliberately not appended to document.body: setConfig() builds the
  // fields itself (it doesn't rely on connectedCallback), and keeping the
  // element detached avoids duplicate-id collisions in the shared jsdom
  // document across tests (every instance uses the same field ids).
  return document.createElement(
    "snap-ctrl-card-editor-test"
  ) as SnapCtrlCardEditor;
}

function fieldFor(el: SnapCtrlCardEditor, id: string): HTMLElement & { value?: string } {
  return el.querySelector(`#${id}`) as HTMLElement & { value?: string };
}

function focus(field: HTMLElement) {
  field.dispatchEvent(new FocusEvent("focusin", { bubbles: true, composed: true }));
}

function blur(field: HTMLElement) {
  field.dispatchEvent(new FocusEvent("focusout", { bubbles: true, composed: true }));
}

describe("SnapCtrlCardEditor.syncFields focus handling", () => {
  it("does not strip a trailing comma out of zone_filter while the field is focused", () => {
    const el = makeEditor();
    el.setConfig({ host: "h", port: 1780, zone_filter: ["Kitchen"] });

    const field = fieldFor(el, "zone_filter");
    focus(field);
    field.value = "Kitchen,";
    field.dispatchEvent(new Event("input"));

    // A config-changed round-trip re-applies the (lossily re-normalized)
    // config back through setConfig() -> syncFields() while the user is
    // still typing.
    el.setConfig({ host: "h", port: 1780, zone_filter: ["Kitchen"] });

    expect(field.value).toBe("Kitchen,");
  });

  it("does not restore the port field to 1780 while it is focused and cleared", () => {
    const el = makeEditor();
    el.setConfig({ host: "h", port: 1780 });

    const field = fieldFor(el, "port");
    focus(field);
    field.value = "";
    field.dispatchEvent(new Event("input"));

    // emitChange for port on an empty string computes Number("") || 1780
    // = 1780, so the round-tripped config still carries port: 1780.
    el.setConfig({ host: "h", port: 1780 });

    expect(field.value).toBe("");
  });

  it("still applies an external config change while the field does not have focus", () => {
    const el = makeEditor();
    el.setConfig({ host: "h", port: 1780, title: "Old title" });

    const field = fieldFor(el, "title");
    expect(field.value).toBe("Old title");

    // Not focused — e.g. a different card instance's config, or the
    // dashboard loading a saved config.
    el.setConfig({ host: "h", port: 1780, title: "New title" });

    expect(field.value).toBe("New title");
  });

  it("resumes syncing a field after it loses focus", () => {
    const el = makeEditor();
    el.setConfig({ host: "h", port: 1780, title: "Old title" });

    const field = fieldFor(el, "title");
    focus(field);
    el.setConfig({ host: "h", port: 1780, title: "New title" });
    expect(field.value).toBe("Old title");

    blur(field);
    el.setConfig({ host: "h", port: 1780, title: "New title" });
    expect(field.value).toBe("New title");
  });
});
