
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
  return Math.round(result);
}

/**
 * Calculates the slider position (0-100) to display based on the actual volume (0-100)
 * and the exponent.
 * V_slider = (V_actual / 100) ^ (1/exponent) * 100
 */
export function volumeToSlider(volumeValue: number, exponent: number): number {
  if (exponent === 1) return volumeValue;
  if (volumeValue <= 0) return 0;
  if (volumeValue >= 100) return 100;

  const normalized = volumeValue / 100;
  const result = Math.pow(normalized, 1 / exponent) * 100;
  // We can return a float for smooth slider, or round it? 
  // HTML input range usually works with steps. 
  // Current VolumeControl has step="1". 
  // Let's return rounded to match step=1, or we can increase precision of slider.
  return Math.round(result);
}
