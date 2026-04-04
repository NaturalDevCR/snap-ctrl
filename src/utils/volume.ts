
/**
 * Calculates the actual volume (0-100) to send to the server based on the slider position (0-100)
 * and the exponent.
 * V_actual = (V_slider / 100) ^ exponent * 100
 */
export function sliderToVolume(sliderValue: number, exponent: number): number {
  if (exponent === 1) return sliderValue;
  // Ensure we don't return NaN or weird values for 0
  if (sliderValue <= 0) return 0;
  if (sliderValue >= 100) return 100;

  const normalized = sliderValue / 100;
  const result = Math.pow(normalized, exponent) * 100;
  // The server only accepts integer volumes (0-100), so we round here.
  return Math.round(result);
}

/**
 * Calculates the slider position (0-100) to display based on the actual volume (0-100)
 * and the exponent.
 * V_slider = (V_actual / 100) ^ (1/exponent) * 100
 *
 * NOTE: Returns a float intentionally — rounding here causes visible round-trip drift
 * because sliderToVolume collapses several slider integers to the same server integer.
 * The browser's <input type="range"> snaps to the nearest step naturally.
 */
export function volumeToSlider(volumeValue: number, exponent: number): number {
  if (exponent === 1) return volumeValue;
  if (volumeValue <= 0) return 0;
  if (volumeValue >= 100) return 100;

  const normalized = volumeValue / 100;
  return Math.pow(normalized, 1 / exponent) * 100;
}
