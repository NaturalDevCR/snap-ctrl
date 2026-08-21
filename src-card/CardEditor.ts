import type { CardConfig } from "./components/CardRoot.vue";

type FieldElement = HTMLElement & { label?: string; value?: string };

interface FieldValues {
  host: string;
  port: string;
  title: string;
  zone_filter: string;
}

export class SnapCtrlCardEditor extends HTMLElement {
  private config: Partial<CardConfig> = {};
  private built = false;
  private fields: Record<string, FieldElement> = {};

  setConfig(config: Partial<CardConfig>) {
    this.config = config;
    // HA's editor host round-trips the config-changed event this element
    // emits back into a setConfig() call on this same element once the
    // dashboard's own config state updates. A full render() teardown on
    // every call would destroy the ha-textfield elements (and the user's
    // focus/cursor position) on every keystroke. Build the fields once,
    // then just sync values afterward.
    if (!this.built) {
      this.render();
    } else {
      this.syncFields();
    }
  }

  connectedCallback() {
    if (!this.built) {
      this.render();
    }
  }

  private emitChange(next: Partial<CardConfig>) {
    this.config = { ...this.config, ...next };
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this.config },
        bubbles: true,
        composed: true,
      })
    );
  }

  private fieldValues(): FieldValues {
    return {
      host: this.config.host ?? "",
      port: String(this.config.port ?? 1780),
      title: this.config.title ?? "",
      zone_filter: (this.config.zone_filter ?? []).join(", "),
    };
  }

  /** Update existing field values in place, without touching the DOM tree. */
  private syncFields() {
    const values = this.fieldValues();
    for (const [id, value] of Object.entries(values)) {
      const field = this.fields[id];
      // Only assign when the value actually differs from what the field
      // already shows, so an in-progress edit that round-trips back to
      // itself doesn't clobber the input's cursor position.
      if (field && field.value !== value) {
        field.value = value;
      }
    }
  }

  private render() {
    this.innerHTML = "";
    this.fields = {};
    const wrapper = document.createElement("div");
    wrapper.style.padding = "8px";
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.gap = "8px";

    const values = this.fieldValues();

    wrapper.appendChild(
      this.buildTextField("host", "Host", values.host, (v) =>
        this.emitChange({ host: v })
      )
    );
    wrapper.appendChild(
      this.buildTextField("port", "Port", values.port, (v) =>
        this.emitChange({ port: Number(v) || 1780 })
      )
    );
    wrapper.appendChild(
      this.buildTextField("title", "Title (optional)", values.title, (v) =>
        this.emitChange({ title: v || undefined })
      )
    );
    wrapper.appendChild(
      this.buildTextField(
        "zone_filter",
        "Zone filter (comma-separated, optional)",
        values.zone_filter,
        (v) =>
          this.emitChange({
            zone_filter: v
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          })
      )
    );

    this.appendChild(wrapper);
    this.built = true;
  }

  private buildTextField(
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void
  ): FieldElement {
    const field = document.createElement("ha-textfield") as FieldElement;
    field.setAttribute("id", id);
    field.label = label;
    field.value = value;
    field.addEventListener("input", (e) => {
      onChange((e.target as HTMLInputElement).value);
    });
    this.fields[id] = field;
    return field;
  }
}
