import { defineMolecule, type TemplateResult } from '@gluonjs/core';
import { type ListboxOption } from '@gluonjs/quarks';
import { ComboboxField, type ComboboxFieldAttributes, type ComboboxFieldProps } from './combobox-field.js';
import { autocompleteStyleDependency } from './autocomplete-styles.js';

export type AutocompleteOption = ListboxOption;
export type AutocompleteAttributes = ComboboxFieldAttributes;
export interface AutocompleteProps extends Omit<ComboboxFieldProps, 'options' | 'attributes'> {
  readonly suggestions: readonly AutocompleteOption[];
  readonly attributes?: AutocompleteAttributes;
}

function renderAutocomplete({ suggestions, attributes = {}, ...props }: AutocompleteProps): TemplateResult {
  return ComboboxField({ ...props, options: suggestions, attributes: { ...attributes, class: [{ 'gluon-autocomplete': true }, attributes.class] } });
}

export const Autocomplete = defineMolecule(renderAutocomplete, 'Autocomplete', [autocompleteStyleDependency]);
