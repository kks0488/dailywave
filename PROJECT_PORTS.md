<!-- PROJECT_REGISTRY_GUIDE_START -->
# Port Policy (Project Registry)

Do not edit this section manually.

- Do not hardcode ports. Use `PORT` (and `DEV_PORT` if enabled).
- Ports are assigned automatically to prevent conflicts.
- If you need extra ports, register them in Project Registry.

## Current ranges (prod)
- backend: 8200-8299
- frontend: 3200-3299
- dashboard: 8500-8599
- service: 9000-9999

## Assigned to this project
- role: service
- prod PORT: 9008
- dev ports: disabled

## Refresh
- Run: `python /home/kkaemo/project-registry/scripts/sync_projects.py`
<!-- PROJECT_REGISTRY_GUIDE_END -->
