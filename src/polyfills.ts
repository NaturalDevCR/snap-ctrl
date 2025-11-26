/**
 * Polyfills for browser compatibility
 */

// libflacjs requires __dirname to be defined
if (typeof (window as any).__dirname === "undefined") {
  (window as any).__dirname = "/";
}
