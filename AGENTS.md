# Architecture decisions

- Build the hosted web app with a root-relative Vite base (`/`) so direct visits to nested routes such as `/dashboard/tv` resolve assets from the site root; the desktop shell loads the hosted URL.
- Keep `/dashboard/tv` publicly accessible and read-only so dedicated television devices can open the live panel without authentication.