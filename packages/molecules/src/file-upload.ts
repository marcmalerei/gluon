import { FileInput, type FileInputAttributes, type FileInputCapture } from '@gluonjs/atoms';
import { defineMolecule, nothing, type TemplateResult } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { fileUploadStyleDependency } from './file-upload-styles.js';

export type FileUploadAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id'>;
export type FileUploadInputAttributes = FileInputAttributes;

export interface FileUploadProps {
  readonly id: string;
  readonly label: string;
  readonly files?: readonly File[];
  readonly accept?: string;
  readonly capture?: FileInputCapture;
  readonly multiple?: boolean;
  readonly name?: string;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly helper?: string;
  readonly error?: string;
  readonly selectedFilesLabel?: string;
  readonly emptyLabel?: string;
  readonly onChange?: (files: readonly File[], event: Event) => void;
  readonly inputAttributes?: FileUploadInputAttributes;
  readonly attributes?: FileUploadAttributes;
}

function renderFileUpload({
  id,
  label,
  files = [],
  accept,
  capture,
  multiple = false,
  name,
  disabled = false,
  required = false,
  helper,
  error,
  selectedFilesLabel = 'Selected files',
  emptyLabel = 'No file selected.',
  onChange,
  inputAttributes = {},
  attributes = {},
}: FileUploadProps): TemplateResult {
  assertDomId('FileUpload.id', id);
  assertNonEmpty('FileUpload.label', label);
  assertNonEmpty('FileUpload.selectedFilesLabel', selectedFilesLabel);
  assertNonEmpty('FileUpload.emptyLabel', emptyLabel);
  if (!multiple && files.length > 1) throw new TypeError('FileUpload.files may contain only one file when multiple is false.');
  const inputId = inputAttributes.id ?? `${id}-input`;
  assertDomId('FileUpload.inputAttributes.id', inputId);
  const labelId = `${id}-label`;
  const helperId = helper === undefined ? undefined : `${id}-helper`;
  const errorId = error === undefined ? undefined : `${id}-error`;
  const filesId = files.length === 0 ? undefined : `${id}-files`;
  const { aria, onChange: attributeChange, ...nativeInputAttributes } = inputAttributes;
  const describedBy = [aria?.describedby, errorId ?? helperId, filesId].filter(Boolean).join(' ') || undefined;

  return q.div({
    ...attributes,
    id,
    class: [{ gluon: true, molecule: true, 'gluon-file-upload': true }, attributes.class],
    children: [
      q.label({ id: labelId, for: inputId, class: 'gluon-file-upload-label', children: label }),
      FileInput({
        accept,
        capture,
        multiple,
        name,
        disabled,
        required,
        invalid: error !== undefined,
        onChange: (event) => {
          callListener(attributeChange, event);
          if (!event.defaultPrevented) onChange?.(Array.from((event.target as HTMLInputElement).files ?? []), event);
        },
        attributes: {
          ...nativeInputAttributes,
          id: inputId,
          aria: { ...aria, labelledby: labelId, describedby: describedBy },
        },
      }),
      files.length > 0
        ? q.div({
            id: filesId,
            class: 'gluon-file-upload-files',
            role: 'status',
            children: [q.strong({ children: selectedFilesLabel }), q.ul({ children: files.map((file) => q.li({ children: file.name })) })],
          })
        : q.span({ id: filesId, class: 'gluon-file-upload-empty', children: emptyLabel }),
      error === undefined && helper === undefined
        ? nothing
        : q.span({
            id: error === undefined ? helperId : errorId,
            class: error === undefined ? 'gluon-file-upload-helper' : 'gluon-file-upload-error',
            role: error === undefined ? undefined : 'alert',
            children: error ?? helper,
          }),
    ],
  });
}

function assertNonEmpty(name: string, value: string): void {
  if (!value.trim()) throw new TypeError(`${name} must be a non-empty string.`);
}

function assertDomId(name: string, value: string): void {
  assertNonEmpty(name, value);
  if (/\s/u.test(value)) throw new TypeError(`${name} must not contain whitespace.`);
}

function callListener<EventType extends Event>(
  listener: ((event: EventType) => unknown) | { handleEvent(event: EventType): void } | null | undefined,
  event: EventType,
): void {
  if (typeof listener === 'function') listener(event);
  else listener?.handleEvent(event);
}

export const FileUpload = defineMolecule(renderFileUpload, 'FileUpload', [fileUploadStyleDependency]);
