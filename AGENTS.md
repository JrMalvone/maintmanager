# Architecture decisions

- Keep preventive recurrence in dedicated plans; generate one active cycle per plan with a daily SQL job and recalculate from actual completion in a transaction so calendar projections and execution stay consistent.

- Gate backend-session restoration with a window-scoped login marker in `src/lib/auth.ts`, clearing restored tokens with local sign-out on a fresh window; this requires login after relaunch without editing the generated client or logging out other devices.

- Paginate full service-order and work-log reads with `fetchAllRows` and stable ID tie-breakers; query active orders separately from closed history so the Data API row cap cannot hide new orders or truncate analytics.

- Build the hosted web app with a root-relative Vite base (`/`) so direct visits to nested routes such as `/dashboard/tv` resolve assets from the site root; the desktop shell loads the hosted URL.
- Keep `/dashboard/tv` publicly accessible and read-only so dedicated television devices can open the live panel without authentication.
- Keep the Raspberry Pi TV shell separate from the Windows shell; it loads only `/dashboard/tv` in kiosk mode and retries after network failures.
- Keep the Android TV Home App in a separate Gradle module and application ID from the regular Android app so choosing it as the default launcher cannot replace normal maintenance access.- Compute MTBF and Availability from planned time (elapsed period × sector shifts × 8h per active machine) via src/lib/reliability.ts; never from gaps between consecutive stops, which mixes machines and breaks with 0–1 stops.
- Keep preventive and backlog orders isolated in `preventive_backlog_orders` and `preventive_work_logs` so corrective KPIs stay uncontaminated; trigger SAP sync (`Pending`) only upon order completion.
