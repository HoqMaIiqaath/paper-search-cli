import { readFileSync } from 'fs';
import { queryJournalMetrics } from './JournalMetricsService.js';
function jsonTextResponse(text) {
    return {
        content: [
            {
                type: 'text',
                text
            }
        ]
    };
}
function parseJournalList(value) {
    if (!value)
        return [];
    if (Array.isArray(value))
        return value.map(item => String(item));
    return String(value)
        .split(/\r?\n|[,;；]/)
        .map(item => item.trim())
        .filter(Boolean);
}
export async function handleJournalMetrics(args) {
    const journals = [
        ...parseJournalList(args.journal),
        ...parseJournalList(args.journals),
        ...(args.file
            ? readFileSync(String(args.file), 'utf8')
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'))
            : [])
    ];
    const rows = await queryJournalMetrics({ journals, includeRaw: args.includeRaw });
    const found = rows.filter(row => row.status === 'found').length;
    return jsonTextResponse(`Found journal metrics for ${found}/${rows.length} journal(s).\n\n${JSON.stringify(rows, null, 2)}`);
}
//# sourceMappingURL=handler.js.map