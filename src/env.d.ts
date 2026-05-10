/// <reference path="../.astro/types.d.ts" />

declare module 'react-phone-input-2' {
  import React from 'react';

  interface PhoneInputProps {
    country?: string;
    value?: string;
    onChange?: (value: string, country: any, e: any, formattedValue: string) => void;
    inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
    inputClass?: string;
    buttonClass?: string;
    dropdownClass?: string;
    searchClass?: string;
    containerClass?: string;
    containerStyle?: React.CSSProperties;
    inputStyle?: React.CSSProperties;
    buttonStyle?: React.CSSProperties;
    dropdownStyle?: React.CSSProperties;
    searchStyle?: React.CSSProperties;
    searchPlaceholder?: string;
    enableSearch?: boolean;
    disableSearchIcon?: boolean;
    preferredCountries?: string[];
    excludeCountries?: string[];
    onlyCountries?: string[];
    disabled?: boolean;
    disableDropdown?: boolean;
    disableCountryCode?: boolean;
    enableAreaCodes?: boolean;
    enableLongNumbers?: boolean;
    countryCodeEditable?: boolean;
    placeholder?: string;
    autoFormat?: boolean;
    enableClickOutside?: boolean;
    showDropdown?: boolean;
    onFocus?: (...args: any[]) => void;
    onBlur?: (...args: any[]) => void;
    onClick?: (...args: any[]) => void;
    onKeyDown?: (...args: any[]) => void;
    isValid?: (value: string, country: any, countries: any[]) => boolean | string;
    masks?: Record<string, string>;
    localization?: Record<string, string>;
    prefix?: string;
    copyNumbersOnly?: boolean;
    renderStringAsFlag?: string;
    autocompleteSearch?: boolean;
    jumpCursorToEnd?: boolean;
    priority?: Record<string, number>;
    enableAreaCodeStretch?: boolean;
    disableParentStyles?: boolean;
    onEnterKeyPress?: (...args: any[]) => void;
  }

  export default class PhoneInput extends React.Component<PhoneInputProps> {}
}

