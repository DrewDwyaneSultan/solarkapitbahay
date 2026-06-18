import React, { useEffect, useRef, useState } from 'react';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

let mapsLoaderPromise = null;

function loadGoogleMaps() {
  if (!MAPS_KEY) return Promise.reject(new Error('Google Maps API key not configured'));
  if (window.google?.maps?.places) return Promise.resolve(window.google.maps);
  if (mapsLoaderPromise) return mapsLoaderPromise;

  mapsLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
  return mapsLoaderPromise;
}

/**
 * Barangay / address search via Google Places Autocomplete.
 * Falls back to plain text input when VITE_GOOGLE_MAPS_API_KEY is unset.
 */
export default function PlacesAutocomplete({
  label = 'Location',
  placeholder = 'Search barangay or address…',
  value,
  onChange,
  onPlaceSelect,
  required = false,
}) {
  const inputRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!MAPS_KEY || !inputRef.current) return undefined;

    let autocomplete = null;
    let cancelled = false;

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !inputRef.current) return;
        autocomplete = new maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'ph' },
          fields: ['formatted_address', 'geometry', 'address_components', 'name'],
          types: ['geocode', 'administrative_area_level_3'],
        });
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place?.geometry) return;
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          let city = '';
          let province = '';
          (place.address_components ?? []).forEach((c) => {
            if (c.types.includes('locality')) city = c.long_name;
            if (c.types.includes('administrative_area_level_2')) city = city || c.long_name;
            if (c.types.includes('administrative_area_level_1')) province = c.long_name;
          });
          onPlaceSelect?.({
            formatted_address: place.formatted_address ?? place.name ?? '',
            lat,
            lng,
            city_municipality: city,
            province,
          });
        });
        setReady(true);
      })
      .catch((err) => setLoadError(err.message));

    return () => {
      cancelled = true;
    };
  }, [onPlaceSelect]);

  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted">
        {label}
      </label>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm text-sk-ink focus:outline-none focus:ring-2 focus:ring-sk-run/30"
      />
      {MAPS_KEY && ready && (
        <p className="text-[10px] text-emerald-700">Google Maps search enabled</p>
      )}
      {!MAPS_KEY && (
        <p className="text-[10px] text-sk-ink-muted">
          Set <code className="text-xs">VITE_GOOGLE_MAPS_API_KEY</code> for map search, or type
          location manually.
        </p>
      )}
      {loadError && <p className="text-[10px] text-rose-600">{loadError}</p>}
    </div>
  );
}
