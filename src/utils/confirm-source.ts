import { useConfirmationStore } from "@/stores/confirmation";

export function confirmSourceChange(
  zone: string,
  source: string,
): Promise<boolean> {
  return useConfirmationStore().ask("source", 'Play "{source}" in "{zone}"?', {
    zone,
    source,
  });
}
