# SnapCtrl

A modern, responsive, and feature-rich web interface for [Snapcast](https://github.com/badaix/snapcast), built with Vue 3 and Tailwind CSS.

<img width="3598" height="1786" alt="image" src="https://github.com/user-attachments/assets/7e61aa70-4937-4e1e-b9c3-7ef8db096934" />

## Features

- **Modern & Responsive UI**: A fully responsive interface featuring a sleek dark mode, designed for seamless use on desktop and mobile devices.
- **Real-time Control**: Experience instant updates for volume adjustments, mute toggles, and stream assignments via WebSockets.
- **Comprehensive Group Management**:
  - Easily create, rename, and delete client groups.
  - **Smart Cleanup**: Automatically remove offline or orphaned clients to maintain a tidy setup.
  - **Prevent Orphans**: Enhanced logic ensures deleted groups don't leave behind orphaned clients.
- **Advanced Client Controls**:
  - Visual status indicators (online/offline).
  - Adjust latency calibration and volume levels.
  - Rename clients for better organization.
- **Granular Permissions & Security**:
  - **Lock Mode**: Secure the interface with a passcode to prevent unauthorized changes.
  - **Feature Control**: Enable or disable specific features like volume adjustment, renaming, or group creation.
  - **UI Visibility**: Toggle the visibility of UI elements such as settings, filters, and the browser player.
  - **Access Restrictions**: Restrict access to specific groups, sources, or clients.
- **Smart Volume Memory**:
  - **Per-Source Volume**: Optionally remember volume levels for each source **per group**. Enable this in Group Settings to have clients in that group restore their volume when switching sources.
  - **Multi-Device Sync**: Volume memory is synchronized across all devices. If you change the volume for a source on your phone, your laptop will learn and remember that volume too.
- **Integrated Browser Player**: Listen to your Snapcast streams directly within the browser, utilizing WASM-based decoders (FLAC, Vorbis, PCM) for high-quality playback.
- **Stream Management**: Intuitive interface for assigning streams to groups.
- **PWA Support**: Install as a Progressive Web App (PWA) on your device for a native-like experience.
- **Development Ready**: Includes optional HTTPS support for local development environments.

## Getting Started

### Prerequisites

- A running [Snapcast server](https://github.com/badaix/snapcast).
- Node.js (v20+) and pnpm (recommended for development).

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/NaturalDevCR/snap-ctrl.git
    cd snap-ctrl
    ```

2.  Install dependencies:

    ```bash
    pnpm install
    ```

3.  Run the development server:

    ```bash
    # HTTP (Default)
    pnpm run dev

    # HTTPS (Optional, for PWA testing)
    pnpm run dev:https
    ```

### Building for Production

To create a static production build compatible with any web server (including Snapcast's built-in server):

```bash
pnpm run build
```

The output will be generated in the `dist` folder. Copy the contents of this folder to your web server's root or Snapcast's `doc_root`.

## Usage with Snapcast

Snapcast server can serve this web interface directly.

1.  Build the project: `pnpm run build`
2.  Locate your Snapcast server's `doc_root` (typically `/usr/share/snapserver/snapweb` or defined in `/etc/snapserver.conf`).
3.  Backup the existing `index.html` and assets.
4.  Copy the contents of the `dist` folder to the `doc_root`.
5.  Access the interface via `http://<snapserver-ip>:1780`.

## GitHub Release Workflow

This project includes a GitHub Actions workflow that automatically builds and releases the application.

To create a new release:

1.  Push your changes to the `main` branch.
2.  Create and push a tag starting with `v` (e.g., `v1.0.0`):
    ```bash
    git tag v1.0.0
    git push origin v1.0.0
    ```
3.  GitHub Actions will automatically build the project and create a release with a `dist.zip` file attached.

## Support This Project

If you find this project useful and want to support its development, consider buying me a coffee! ☕

[![Donate via PayPal](https://www.paypal.com/en_US/i/btn/btn_donateCC_LG.gif)](https://paypal.me/NaturalCloud)

Your donations help keep this project maintained and improved. Thank you for your support! ❤️

## Acknowledgments

This project was inspired by and uses concepts from [Snapweb](https://github.com/badaix/snapweb), the official web interface for Snapcast. SnapCtrl is a complete rewrite with a custom design and implementation. We are grateful to the Snapcast team for their excellent work on the reference implementation and for maintaining the amazing Snapcast ecosystem.

## Notice

This project was developed with the assistance of advanced AI coding agents (Gemini 1.5 Pro and Sonnet 3.5), blending automated code generation with human oversight and customization.

## License

MIT
