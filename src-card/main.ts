class SnapCtrlCardStub extends HTMLElement {
  connectedCallback() {
    this.textContent = "snap-ctrl-card: not yet configured";
  }
}

if (!customElements.get("snap-ctrl-card")) {
  customElements.define("snap-ctrl-card", SnapCtrlCardStub);
}
