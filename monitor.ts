// Configuration
const LOCATION_ID = 5020;
const LOCATION_URL = "https://www.cbp.gov/travel/trusted-traveler-programs/nexus/enrollment-centers/washington";
const SCHEDULING_URL = "https://ttp.dhs.gov/schedulerui/schedule-interview/location?lang=en&vo=true&returnUrl=ttp-external&service=nh";

// API URL template
const URL_TEMPLATE = "https://ttp.cbp.dhs.gov/schedulerapi/locations/{locationId}/slots?startTimestamp={start}&endTimestamp={end}";

interface Slot {
    active: number;
    total: number;
    pending: number;
    conflicts: number;
    duration: number;
    timestamp: string;
    remote: boolean;
}

async function checkAppointments(startTime: string, endTime: string): Promise<Slot[]> {
    const url = URL_TEMPLATE.replace("{locationId}", LOCATION_ID.toString())
        .replace("{start}", startTime)
        .replace("{end}", endTime);

    try {
        console.log(`Checking URL: ${url}`);
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`Error: API returned status code ${response.status}`);
            return [];
        }

        const data = await response.json() as Slot[];
        return data.filter(slot => slot.active > 0);

    } catch (error) {
        console.error(`Error fetching data: ${error}`);
        return [];
    }
}

function formatDate(date: Date): string {
    return date.toISOString().split('.')[0];
}

function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function main() {
    // Usage: bun run monitor.ts [start_timestamp] [end_timestamp] [--check-weekends]
    // If no args provided, defaults to NOW until 6 months from now.
    const args = process.argv.slice(2);
    const checkWeekends = args.includes("--check-weekends");

    // Filter out flags from args to get timestamps
    const timeArgs = args.filter(arg => !arg.startsWith("--"));

    const now = new Date();
    const sixMonthsLater = new Date(now);
    sixMonthsLater.setMonth(now.getMonth() + 6);

    let startTs = formatDate(now);
    let endTs = formatDate(sixMonthsLater);

    if (timeArgs.length >= 2) {
        startTs = timeArgs[0];
        endTs = timeArgs[1];
    }

    console.log(`Starting Trusted Traveler Appointment Checker for location ${LOCATION_ID}`);
    console.log(`Date range: ${startTs} to ${endTs}`);
    if (checkWeekends) console.log("Mode: Checking for weekends within 30 days");

    const slots = await checkAppointments(startTs, endTs);

    if (checkWeekends) {
        const thirtyDaysFromNow = new Date(now);
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        const weekendSlots = slots.filter(slot => {
            const slotDate = new Date(slot.timestamp);
            const day = slotDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
            return (day === 0 || day === 6) && slotDate <= thirtyDaysFromNow;
        });

        if (weekendSlots.length > 0) {
            console.log(`\n[!] FOUND ${weekendSlots.length} WEEKEND SLOTS WITHIN 30 DAYS!`);
            for (const slot of weekendSlots) {
                const d = new Date(slot.timestamp);
                const dayName = d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
                console.log(`  • ${slot.timestamp.replace('T', ' ')} (${dayName})`);
            }
        } else {
            console.log("\nNo weekend slots found within the next 30 days.");
        }
        return;
    }

    if (slots.length > 0) {
        // Group by date for visualization
        const slotsByDate: { [key: string]: Slot[] } = {};
        for (const slot of slots) {
            const date = slot.timestamp.split('T')[0];
            if (!slotsByDate[date]) {
                slotsByDate[date] = [];
            }
            slotsByDate[date].push(slot);
        }

        let output = `Found ${slots.length} slots across ${Object.keys(slotsByDate).length} days.\n`;
        output += `Schedule here: ${SCHEDULING_URL}\n`;

        // Visualization: Availability Grid
        const minHour = 8;
        const maxHour = 17; // 5 PM
        const hoursRange = Array.from({ length: maxHour - minHour + 1 }, (_, i) => i + minHour);

        // Header
        const headerTime = hoursRange.map(h => h.toString().padStart(2, '0')).join(' ');
        const dateColWidth = 10; // Reduced width since we only show DD (Day)

        // Helper to determine color based on date proximity
        const getDateColor = (dateStr: string): string => {
            const date = new Date(dateStr);
            const now = new Date();
            const diffTime = date.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 28) {
                return "\x1b[32m"; // Green
            } else if (diffDays <= 56) {
                return "\x1b[33m"; // Yellow
            } else {
                return "\x1b[31m"; // Red
            }
        };

        let currentMonth = "";

        for (const date of Object.keys(slotsByDate).sort()) {
            const dateObj = new Date(date);
            const monthStr = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

            // Print month header if it changes
            if (monthStr !== currentMonth) {
                currentMonth = monthStr;
                output += `\n=== ${currentMonth} ===\n`;
                output += `${"Day".padEnd(dateColWidth)} | ${headerTime} | Total\n`;
                output += `${'-'.repeat(dateColWidth)}-+${'-'.repeat(headerTime.length + 2)}+-------\n`;
            }

            const daySlots = slotsByDate[date];
            const countsByHour = new Array(hoursRange.length).fill(0);

            for (const slot of daySlots) {
                const h = new Date(slot.timestamp).getHours();
                if (h >= minHour && h <= maxHour) {
                    countsByHour[h - minHour]++;
                }
            }

            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
            const dayNum = dateObj.getUTCDate().toString().padStart(2, '0');
            const dateStr = `${dayNum} (${dayName})`;
            const color = getDateColor(date);
            const reset = "\x1b[0m";

            const row = countsByHour.map(c => c === 0 ? " ." : c.toString().padStart(2, " ")).join(" ");
            output += `${color}${dateStr.padEnd(dateColWidth)}${reset} | ${row} | ${daySlots.length.toString().padStart(5, " ")}\n`;
        }

        console.log(output);
    } else {
        console.log("No slots found.");
    }
}

main();
