import { defineMolecule, type TemplateResult } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { calendarStyleDependency } from './calendar-styles.js';

export type CalendarAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id'>;

export interface CalendarProps {
  readonly id: string;
  readonly label: string;
  readonly month: string;
  readonly selected?: string;
  readonly min?: string;
  readonly max?: string;
  readonly today?: string;
  readonly locale?: string;
  readonly weekStartsOn?: 0 | 1;
  readonly previousMonthLabel?: string;
  readonly nextMonthLabel?: string;
  readonly disabledDates?: (date: string) => boolean;
  readonly onMonthChange?: (month: string, event: Event) => void;
  readonly onSelect?: (date: string, event: Event) => void;
  readonly attributes?: CalendarAttributes;
}

interface CalendarDay {
  readonly date: string;
  readonly day: number;
  readonly outsideMonth: boolean;
  readonly disabled: boolean;
}

function renderCalendar({
  id,
  label,
  month,
  selected,
  min,
  max,
  today,
  locale = 'en-US',
  weekStartsOn = 1,
  previousMonthLabel = 'Previous month',
  nextMonthLabel = 'Next month',
  disabledDates,
  onMonthChange,
  onSelect,
  attributes = {},
}: CalendarProps): TemplateResult {
  assertDomId('Calendar.id', id);
  if (!label.trim()) throw new TypeError('Calendar.label must be a non-empty string.');
  if (!previousMonthLabel.trim() || !nextMonthLabel.trim()) throw new TypeError('Calendar navigation labels must be non-empty strings.');
  const monthDate = parseMonth(month, 'Calendar.month');
  const minDate = min === undefined ? undefined : parseDate(min, 'Calendar.min');
  const maxDate = max === undefined ? undefined : parseDate(max, 'Calendar.max');
  if (minDate && maxDate && minDate > maxDate) throw new RangeError('Calendar.min must not be after Calendar.max.');
  if (selected !== undefined) parseDate(selected, 'Calendar.selected');
  if (today !== undefined) parseDate(today, 'Calendar.today');
  const days = createDays(monthDate, weekStartsOn, minDate, maxDate, disabledDates);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(monthDate);
  const weekLabels = createWeekLabels(locale, weekStartsOn);
  const labelId = `${id}-label`;
  const gridId = `${id}-grid`;
  const previousMonth = addMonths(monthDate, -1);
  const nextMonth = addMonths(monthDate, 1);
  const previousDisabled = minDate !== undefined && previousMonth < startOfMonth(minDate);
  const nextDisabled = maxDate !== undefined && nextMonth > startOfMonth(maxDate);
  const changeMonth = (next: Date, event: Event): void => onMonthChange?.(formatMonth(next), event);
  const { aria, ...nativeAttributes } = attributes;
  return q.div({
    ...nativeAttributes,
    id,
    data: { ...attributes.data, calendar: true },
    class: [{ gluon: true, molecule: true, 'gluon-calendar': true }, attributes.class],
    children: [
      q.div({ class: 'gluon-calendar-header', children: [
        q.button({ type: 'button', class: 'gluon-calendar-nav', aria: { label: previousMonthLabel }, disabled: previousDisabled, onClick: (event: MouseEvent) => changeMonth(previousMonth, event), children: '‹' }),
        q.h2({ id: labelId, class: 'gluon-calendar-title', children: monthLabel }),
        q.button({ type: 'button', class: 'gluon-calendar-nav', aria: { label: nextMonthLabel }, disabled: nextDisabled, onClick: (event: MouseEvent) => changeMonth(nextMonth, event), children: '›' }),
      ] }),
      q.table({ id: gridId, class: 'gluon-calendar-grid', role: 'grid', aria: { ...aria, label, labelledby: labelId }, children: [
        q.thead({ children: [q.tr({ children: weekLabels.map((weekday) => q.th({ scope: 'col', abbr: weekday, children: weekday })) })] }),
        q.tbody({ children: Array.from({ length: 6 }, (_, week) => q.tr({ role: 'row', children: days.slice(week * 7, week * 7 + 7).map((day) => renderDay(day, id, selected, today, onSelect)) })) }),
      ] }),
    ],
  });
}

function assertDomId(name: string, value: string): void {
  if (!value.trim() || /\s/u.test(value)) throw new TypeError(`${name} must be a non-empty DOM id without whitespace.`);
}

function renderDay(day: CalendarDay, id: string, selected: string | undefined, today: string | undefined, onSelect: CalendarProps['onSelect']): TemplateResult {
  const dayId = `${id}-day-${day.date}`;
  return q.td({ role: 'gridcell', aria: { selected: day.date === selected || undefined, disabled: day.disabled || undefined }, class: [{ 'is-outside-month': day.outsideMonth, 'is-selected': day.date === selected, 'is-today': day.date === today, 'is-disabled': day.disabled }], children: q.button({
    id: dayId,
    type: 'button',
    class: 'gluon-calendar-day',
    data: { calendarDay: day.date },
    disabled: day.disabled,
    aria: { label: day.date, current: day.date === today ? 'date' : undefined },
    tabIndex: day.date === selected || (selected === undefined && !day.outsideMonth && !day.disabled) ? 0 : -1,
    onClick: (event: MouseEvent) => onSelect?.(day.date, event),
    onKeydown: (event: KeyboardEvent) => moveDayFocus(event),
    children: String(day.day),
  }) });
}

function moveDayFocus(event: KeyboardEvent): void {
  const current = event.currentTarget as HTMLButtonElement;
  const grid = current.closest<HTMLElement>('[data-calendar]');
  if (!grid) return;
  const buttons = [...grid.querySelectorAll<HTMLButtonElement>('[data-calendar-day]:not(:disabled)')];
  const index = buttons.indexOf(current);
  const targetIndex = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : event.key === 'ArrowDown' ? index + 7 : event.key === 'ArrowUp' ? index - 7 : event.key === 'Home' ? Math.floor(index / 7) * 7 : event.key === 'End' ? Math.floor(index / 7) * 7 + 6 : undefined;
  const target = targetIndex === undefined ? undefined : buttons[targetIndex];
  if (target) {
    event.preventDefault();
    target.focus();
  }
}

function createDays(month: Date, weekStartsOn: 0 | 1, min: Date | undefined, max: Date | undefined, disabledDates: CalendarProps['disabledDates']): CalendarDay[] {
  const first = startOfMonth(month);
  const offset = (first.getUTCDay() - weekStartsOn + 7) % 7;
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1 - offset + index));
    const dateValue = formatDate(date);
    return { date: dateValue, day: date.getUTCDate(), outsideMonth: date.getUTCMonth() !== month.getUTCMonth(), disabled: (min !== undefined && date < min) || (max !== undefined && date > max) || Boolean(disabledDates?.(dateValue)) };
  });
}

function createWeekLabels(locale: string, weekStartsOn: 0 | 1): string[] {
  const base = new Date(Date.UTC(2024, 0, 7));
  const labels = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(base.getTime() + index * 86_400_000)));
  return weekStartsOn === 0 ? labels : [...labels.slice(1), labels[0]!];
}

function parseMonth(value: string, name: string): Date {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/u.test(value)) throw new TypeError(`${name} must use YYYY-MM format.`);
  return new Date(Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, 1));
}

function parseDate(value: string, name: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) throw new TypeError(`${name} must use YYYY-MM-DD format.`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || formatDate(date) !== value) throw new TypeError(`${name} must be a valid calendar date.`);
  return date;
}

function formatDate(date: Date): string { return date.toISOString().slice(0, 10); }
function formatMonth(date: Date): string { return date.toISOString().slice(0, 7); }
function startOfMonth(date: Date): Date { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)); }
function addMonths(date: Date, amount: number): Date { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1)); }

export const Calendar = defineMolecule(renderCalendar, 'Calendar', [calendarStyleDependency]);
