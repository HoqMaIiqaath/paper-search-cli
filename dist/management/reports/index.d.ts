import type { CapabilityProfile } from '../capability-profile/index.js';
import type { SkillDiffResult } from '../skills/index.js';
interface DoctorReportInput {
    config: {
        path: string;
        configured: number;
        missing: string[];
        entries: Array<{
            key: string;
            configured: boolean;
            source: string;
            value: string;
        }>;
    };
    capabilityProfile: CapabilityProfile;
    platformStatus: any;
}
export declare function renderDoctorTextReport(report: DoctorReportInput): string;
export declare function renderSkillDiffTextReport(report: SkillDiffResult): string;
export {};
//# sourceMappingURL=index.d.ts.map