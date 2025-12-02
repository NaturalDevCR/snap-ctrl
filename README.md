# SnapCtrl

A modern, responsive, and feature-rich web interface for [Snapcast](https://github.com/badaix/snapcast), built with Vue 3 and Tailwind CSS.

<img width="2640" height="2078" alt="image" src="https://github.com/user-attachments/assets/3b60a6d0-1218-4e67-89b5-1f9f93ae70f6" />

## Features

- **Modern UI**: Clean, responsive design with dark mode support.
- **Real-time Control**: Instant updates for volume, mute, and stream assignment.
- **Group Management**: Create, rename, delete, and manage client groups easily.
- **Advanced Client Management**:
  - Visual online/offline status indicators for all clients
  - Delete offline/orphaned clients to keep your setup clean
  - Bulk cleanup of offline clients from groups
  - Improved group deletion that prevents orphaned clients from reappearing
- **Client Control**: Rename clients, adjust latency, and control volume.
- **Stream Selection**: Assign streams to groups with a user-friendly interface.
- **Browser Player**: Listen to your Snapcast streams directly in the browser (supports WASM decoders).
- **PWA Support**: Install as a Progressive Web App for a native-like experience.
- **Mobile Optimized**: Audio player automatically hides on mobile devices to save screen space.
- **Granular Permissions**: Fine-grained control over UI visibility (hide settings, filters, etc.).
- **HTTPS Support**: Optional HTTPS mode for local development.

## Getting Started

### Prerequisites

- A running [Snapcast server](https://github.com/badaix/snapcast).
- Node.js (v20+) and pnpm (for development).

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

3.  Run development server:

    ```bash
    # HTTP (Default)
    pnpm run dev

    # HTTPS (Optional, for PWA testing)
    pnpm run dev:https
    ```

### Building for Production

To create a static build that can be served by any web server (including Snapcast's built-in server):

```bash
pnpm run build
```

The output will be in the `dist` folder. You can copy the contents of this folder to your web server's root or Snapcast's `doc_root`.

## Usage with Snapcast

Snapcast server can serve this web interface directly.

1.  Build the project: `pnpm run build`
2.  Locate your Snapcast server's `doc_root` (usually `/usr/share/snapserver/snapweb` or defined in `snapserver.conf`).
3.  Backup the existing `index.html` and assets.
4.  Copy the contents of the `dist` folder to the `doc_root`.
5.  Access the interface via `http://<snapserver-ip>:1780`.

## GitHub Release Workflow

This project includes a GitHub Actions workflow to automatically build and release the application.

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

This project was inspired by and uses concepts from [Snapweb](https://github.com/badaix/snapweb), the official web interface for Snapcast. While SnapCtrl is a complete rewrite with its own design and implementation, we're grateful to the Snapcast team for their excellent work on the reference implementation and for maintaining the amazing Snapcast ecosystem.

## License

MIT
