import type { CalendarConflictReason, CalendarConflictSeverity, ObligationStatus } from './database.types';
import type { LiturgicalDay, LiturgicalDayOption } from './liturgicalCalendar';

export type ConflictDay = Pick<
    LiturgicalDay,
    | 'canonical_celebration_id'
    | 'celebration_id'
    | 'title'
    | 'display_title'
    | 'rank'
    | 'color'
    | 'country_scope'
    | 'obligation_status'
    | 'precedence_rank'
>;

export type ConflictOption = Pick<
    LiturgicalDayOption,
    'canonical_celebration_id' | 'celebration_id' | 'title' | 'rank' | 'color'
>;

export type CalendarConflictClassification = {
    severity: CalendarConflictSeverity;
    reason: CalendarConflictReason;
    should_show_warning: boolean;
    base_display: string;
    comparison_display: string;
    notes: string[];
    details: {
        base: ReturnType<typeof summarizeDay>;
        comparison: ReturnType<typeof summarizeDay>;
        base_options: ReturnType<typeof summarizeOptions>;
        comparison_options: ReturnType<typeof summarizeOptions>;
        differences: string[];
        notes: string[];
    };
};

function optionIdentity(option: ConflictOption) {
    return option.canonical_celebration_id ?? option.celebration_id;
}

function optionSet(options: ConflictOption[]) {
    return new Set(options.map(optionIdentity).filter(Boolean));
}

function sameSet(left: Set<string>, right: Set<string>) {
    if (left.size !== right.size) return false;

    for (const value of left) {
        if (!right.has(value)) return false;
    }

    return true;
}

function display(day: ConflictDay | null) {
    if (!day) return '(missing day)';

    return day.display_title || day.title;
}

function obligationEquivalent(left: ObligationStatus, right: ObligationStatus) {
    return left === right;
}

function summarizeDay(day: ConflictDay | null) {
    if (!day) return null;

    return {
        canonical_celebration_id: day.canonical_celebration_id,
        celebration_id: day.celebration_id,
        title: day.title,
        display_title: day.display_title,
        rank: day.rank,
        color: day.color,
        country_scope: day.country_scope,
        obligation_status: day.obligation_status,
        precedence_rank: day.precedence_rank,
    };
}

function summarizeOptions(options: ConflictOption[]) {
    return options.map((option) => ({
        canonical_celebration_id: option.canonical_celebration_id,
        celebration_id: option.celebration_id,
        title: option.title,
        rank: option.rank,
        color: option.color,
    }));
}

function classification(
    severity: CalendarConflictSeverity,
    reason: CalendarConflictReason,
    shouldShowWarning: boolean,
    baseDay: ConflictDay | null,
    comparisonDay: ConflictDay | null,
    baseOptions: ConflictOption[],
    comparisonOptions: ConflictOption[],
    differences: string[],
    notes: string[],
): CalendarConflictClassification {
    return {
        severity,
        reason,
        should_show_warning: shouldShowWarning,
        base_display: display(baseDay),
        comparison_display: display(comparisonDay),
        notes,
        details: {
            base: summarizeDay(baseDay),
            comparison: summarizeDay(comparisonDay),
            base_options: summarizeOptions(baseOptions),
            comparison_options: summarizeOptions(comparisonOptions),
            differences,
            notes,
        },
    };
}

export function classifyCalendarConflict(
    baseDay: ConflictDay | null,
    comparisonDay: ConflictDay | null,
    baseOptions: ConflictOption[] = [],
    comparisonOptions: ConflictOption[] = [],
): CalendarConflictClassification {
    if (!baseDay) {
        return classification('major', 'missing_base_day', true, baseDay, comparisonDay, baseOptions, comparisonOptions, ['base_day'], [
            'Base calendar has no liturgical day for this date.',
        ]);
    }

    if (!comparisonDay) {
        return classification(
            'major',
            'missing_comparison_day',
            true,
            baseDay,
            comparisonDay,
            baseOptions,
            comparisonOptions,
            ['comparison_day'],
            ['Comparison calendar has no liturgical day for this date.'],
        );
    }

    if (!baseDay.canonical_celebration_id || !comparisonDay.canonical_celebration_id) {
        return classification(
            'major',
            'missing_canonical_identity',
            true,
            baseDay,
            comparisonDay,
            baseOptions,
            comparisonOptions,
            ['canonical_celebration_id'],
            ['Missing canonical celebration identity.'],
        );
    }

    if (baseDay.precedence_rank === null || comparisonDay.precedence_rank === null) {
        return classification('major', 'missing_precedence', true, baseDay, comparisonDay, baseOptions, comparisonOptions, ['precedence_rank'], [
            'Missing precedence rank.',
        ]);
    }

    if (baseDay.canonical_celebration_id !== comparisonDay.canonical_celebration_id) {
        if (baseDay.country_scope !== comparisonDay.country_scope) {
            return classification(
                'major',
                'country_specific',
                true,
                baseDay,
                comparisonDay,
                baseOptions,
                comparisonOptions,
                ['canonical_celebration_id', 'country_scope'],
                ['Principal celebration differs and country scope differs.'],
            );
        }

        return classification(
            'major',
            'different_principal_celebration',
            true,
            baseDay,
            comparisonDay,
            baseOptions,
            comparisonOptions,
            ['canonical_celebration_id'],
            ['Principal canonical celebration differs.'],
        );
    }

    if (!obligationEquivalent(baseDay.obligation_status, comparisonDay.obligation_status)) {
        return classification('major', 'different_obligation', true, baseDay, comparisonDay, baseOptions, comparisonOptions, ['obligation_status'], [
            'Holy day obligation status differs.',
        ]);
    }

    if (baseDay.precedence_rank !== comparisonDay.precedence_rank || baseDay.rank !== comparisonDay.rank) {
        return classification(
            'major',
            'different_rank',
            true,
            baseDay,
            comparisonDay,
            baseOptions,
            comparisonOptions,
            ['rank', 'precedence_rank'],
            ['Rank or precedence differs for the same canonical celebration.'],
        );
    }

    if (baseDay.color !== comparisonDay.color) {
        return classification('minor', 'different_color', false, baseDay, comparisonDay, baseOptions, comparisonOptions, ['color'], [
            'Liturgical color differs.',
        ]);
    }

    const baseOptionSet = optionSet(baseOptions);
    const comparisonOptionSet = optionSet(comparisonOptions);
    if (!sameSet(baseOptionSet, comparisonOptionSet)) {
        return classification(
            'minor',
            'different_options',
            false,
            baseDay,
            comparisonDay,
            baseOptions,
            comparisonOptions,
            ['optional_celebrations'],
            ['Optional celebrations differ.'],
        );
    }

    const baseDisplay = display(baseDay);
    const comparisonDisplay = display(comparisonDay);
    if (baseDisplay !== comparisonDisplay) {
        return classification('minor', 'different_title', false, baseDay, comparisonDay, baseOptions, comparisonOptions, ['display_title'], [
            'Display title differs but canonical celebration matches.',
        ]);
    }

    return classification('none', 'same', false, baseDay, comparisonDay, baseOptions, comparisonOptions, [], []);
}
