# Architecture decisions

- Build the hosted web app with a root-relative Vite base (`/`) so direct visits to nested routes such as `/dashboard/tv` resolve assets from the site root; the desktop shell loads the hosted URL.
- Keep `/dashboard/tv` publicly accessible and read-only so dedicated television devices can open the live panel without authentication.
- Keep the Raspberry Pi TV shell separate from the Windows shell; it loads only `/dashboard/tv` in kiosk mode and retries after network failures.
- Keep the Android TV Home App in a separate Gradle module and application ID from the regular Android app so choosing it as the default launcher cannot replace normal maintenance access.