import { SnapCtrlCard } from "./SnapCtrlCard";
import { SnapCtrlCardEditor } from "./CardEditor";

if (!customElements.get("snap-ctrl-card-editor")) {
  customElements.define("snap-ctrl-card-editor", SnapCtrlCardEditor);
}
if (!customElements.get("snap-ctrl-card")) {
  customElements.define("snap-ctrl-card", SnapCtrlCard);
}

// Advertise the card to HA's "Add Card" picker.
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "snap-ctrl-card",
  name: "Snap Ctrl",
  description: "Snapcast zone volume and grouping controls.",
});
