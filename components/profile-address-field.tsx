"use client";

import { useEffect, useState } from "react";

import { AddressAutocomplete } from "@/components/address-autocomplete";
import type { AddressSuggestion } from "@/lib/mapbox/geocoding";
import {
  formatPostalAddress,
  isCompletePostalAddress,
  type PostalAddress
} from "@/lib/models/postal-address";
import { Label } from "@/components/ui/label";

function emptyPostalAddress(): PostalAddress {
  return {
    street: null,
    city: null,
    state: null,
    postcode: null,
    country: null
  };
}

function suggestionFromPostalAddress(address: PostalAddress): AddressSuggestion | null {
  const line = formatPostalAddress(address);
  if (!line || !isCompletePostalAddress(address)) return null;
  return {
    id: `profile-${line}`,
    addressLine: line,
    coordinate: { latitude: 0, longitude: 0 },
    postalAddress: address
  };
}

export function ProfileAddressField({
  id = "profile-address",
  label = "Address",
  value,
  onChange,
  invalid = false,
  disabled = false
}: {
  id?: string;
  label?: string;
  value: PostalAddress;
  onChange: (value: PostalAddress) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const [selection, setSelection] = useState<AddressSuggestion | null>(() =>
    suggestionFromPostalAddress(value)
  );

  useEffect(() => {
    setSelection(suggestionFromPostalAddress(value));
  }, [value.street, value.city, value.state, value.postcode, value.country]);

  function handleChange(next: AddressSuggestion | null) {
    setSelection(next);
    if (!next) {
      onChange(emptyPostalAddress());
      return;
    }
    if (next.postalAddress && isCompletePostalAddress(next.postalAddress)) {
      onChange(next.postalAddress);
    } else {
      onChange(emptyPostalAddress());
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <AddressAutocomplete
        id={id}
        value={selection}
        onChange={handleChange}
        placeholder="Search for an address…"
        disabled={disabled}
        invalid={invalid}
      />
      {invalid ? (
        <p className="text-destructive text-sm">
          Select a complete address from the suggestions, or leave this field empty.
        </p>
      ) : null}
    </div>
  );
}

export const PROFILE_ADDRESS_VALIDATION_MESSAGE =
  "Select a complete address from the suggestions, or leave the address empty.";
