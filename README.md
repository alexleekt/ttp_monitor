# Trusted Traveler Appointment Checker

A lightweight TypeScript tool for checking Trusted Traveler Program (TTP) appointment availability with visual grids and weekend-only alerts.

## 🚀 Quick Start

1. **Install [Bun](https://bun.sh/)** if you haven't already.
2. **Clone** the repository.
3. **Run** the monitor:

```bash
# Default: Scan 6 months from now
bun monitor.ts

# Specific Range: ISO 8601 (no ms)
bun monitor.ts 2024-01-01T00:00:00 2024-06-01T23:59:59

# Weekend Only: Scan next 30 days
bun monitor.ts --check-weekends
```

## ✨ Features

- **Visual Availability Grid**: Grouped by hour (08:00 - 17:00).
- **Smart Color Coding**: 
  - 🟢 **Green**: < 28 days
  - 🟡 **Yellow**: < 56 days
  - 🔴 **Red**: > 56 days
- **Weekend Mode**: Specialized checks for upcoming weekends.
- **Custom Ranges**: Monitor specific dates beyond defaults.

## ⚙️ Configuration

Options are available at the top of `monitor.ts` and within the `main` function.

| Setting | Purpose | Default |
| :--- | :--- | :--- |
| `LOCATION_ID` | Enrollment center to monitor. | `5020` (Blaine) |
| `minHour` / `maxHour` | Grid display range (24h). | `8` - `17` |

<details>
<summary><b>Common Location IDs (NEXUS)</b></summary>

| ID | Name | State |
| :--- | :--- | :--- |
| 5020 | Blaine NEXUS and FAST Enrollment Center | WA |
| 5021 | Champlain NEXUS and FAST | NY |
| 5022 | Buffalo-Ft. Erie EC | ON |
| 5024 | Port Huron Enrollment Center | MI |
| 5060 | Warroad Enrollment Center | MN |
| 5080 | Sault Ste Marie EC | MI |
| 5100 | Pembina Enrollment Center | ND |
| 5101 | Houlton Enrollment Center | ME |
| 5120 | Sweetgrass NEXUS and FAST | MT |
| 5160 | International Falls EC | MN |
| 5161 | Niagara Falls EC | NY |
| 5223 | Derby Line Enrollment Center | VT |
| 5228 | Buffalo-Ft. Erie EC (Alternate) | ON |
| 5500 | Calais Enrollment Center | ME |
| 5520 | Lansdowne | NY |
| 16511 | Detroit Enrollment Center | MI |
| 16546 | Ogdensburg Enrollment Center | NY |
| 16656 | DETROIT NEXUS/FAST | MI |
| 16712 | Niagara Falls Nexus Only | NY |

</details>

## 📊 Example Output

```text
Found 15 slots across 3 days.

=== January 2024 ===
Day        | 08 09 10 11 12 13 14 15 16 17 | Total
-----------+-------------------------------+-------
15 (Mon)   |  .  .  2  1  .  .  .  .  .  . |     3
16 (Tue)   |  .  .  .  .  .  5  2  .  .  . |     7
20 (Sat)   |  1  2  .  .  .  .  .  .  2  . |     5
```

---

**Development**: Built using Google Antigravity.  
**License**: MIT
