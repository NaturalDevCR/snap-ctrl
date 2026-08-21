import type { CardConfig } from "./components/CardRoot.vue";

export class SnapCtrlCardEditor extends HTMLElement {
  private config: Partial<CardConfig> = {};

  setConfig(config: Partial<CardConfig>) {
    this.config = config;
    this.render();
  }

  connectedCallback() {
    this.render();
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

  private render() {
    this.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.style.padding = "8px";
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.gap = "8px";

    wrapper.appendChild(
      this.buildTextField("host", "Host", this.config.host ?? "", (v) =>
        this.emitChange({ host: v })
      )
    );
    wrapper.appendChild(
      this.buildTextField(
        "port",
        "Port",
        String(this.config.port ?? 1780),
        (v) => this.emitChange({ port: Number(v) || 1780 })
      )
    );
    wrapper.appendChild(
      this.buildTextField("title", "Title (optional)", this.config.title ?? "", (v) =>
        this.emitChange({ title: v || undefined })
      )
    );
    wrapper.appendChild(
      this.buildTextField(
        "zone_filter",
        "Zone filter (comma-separated, optional)",
        (this.config.zone_filter ?? []).join(", "),
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
  }

  private buildTextField(
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void
  ) {
    const field = document.createElement("ha-textfield") as HTMLElement & {
      label?: string;
      value?: string;
    };
    field.setAttribute("id", id);
    field.label = label;
    field.value = value;
    field.addEventListener("input", (e) => {
      onChange((e.target as HTMLInputElement).value);
    });
    return field;
  }
}
