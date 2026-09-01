import React, { useState } from 'react';
import { component, fields } from '@keystatic/core';

// ─── Vista React del Bloque WikiForge ────────────────────────────────────────
function WikiForgePreview(props: {
  fields: {
    sourceUrl: { value: string; onChange: (val: string) => void };
    altText: { value: string; onChange: (val: string) => void };
  };
}) {
  const { sourceUrl, altText } = props.fields;
  const [pin, setPin] = useState('');
  const [inputUrl, setInputUrl] = useState(sourceUrl.value || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const vaultUrl =
    (import.meta as any).env?.PUBLIC_VAULT_WEBHOOK_URL ||
    'https://tgp-vault-run-713934653057.us-central1.run.app/vault-ingest';

  async function handleForjarWebP(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const cleanPin = pin.trim();
    if (cleanPin.length !== 4) {
      setError('Introduce tu PIN de seguridad de 4 dígitos.');
      return;
    }

    const targetUrl = inputUrl.trim();
    if (!targetUrl) {
      setError('Introduce la URL de la imagen externa o de Wikimedia.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Envío al webhook de transmutación / vault-ingest
      const isEndpointTransmute = vaultUrl.includes('/transmute-image');
      const endpoint = isEndpointTransmute ? vaultUrl : `${vaultUrl.replace(/\/vault-ingest\/?$/, '')}/transmute-image`;

      let response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanPin}`,
        },
        body: JSON.stringify({ imageUrl: targetUrl, url: targetUrl, mode: 'wikiforge' }),
      });

      // Fallback al endpoint principal /vault-ingest si /transmute-image no está disponible
      if (!response.ok && endpoint !== vaultUrl) {
        response = await fetch(vaultUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cleanPin}`,
          },
          body: JSON.stringify({ imageUrl: targetUrl, url: targetUrl, mode: 'solo_imagen' }),
        });
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Error ${response.status}: ${text || response.statusText}`);
      }

      const data = await response.json();
      const finalR2Url = data.url || data.image_url || data.r2Url;

      if (!finalR2Url) {
        throw new Error('El motor no devolvió una URL válida de Cloudflare R2.');
      }

      // 2. Actualizar el esquema de Keystatic con la URL final de R2
      sourceUrl.onChange(finalR2Url);
      setInputUrl(finalR2Url);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Error al forjar la imagen en Cloudflare R2.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        backgroundColor: '#0a0a0c',
        border: '1px solid #1f2937',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        color: '#e5e7eb',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        margin: '1.5rem 0',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      }}
    >
      {/* Cabecera del Slash Command */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #1f2937',
          paddingBottom: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#d4af37', fontSize: '1rem' }}>◈</span>
          <span
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 700,
              color: '#d4af37',
            }}
          >
            WikiForge · Forja WebP (R2)
          </span>
        </div>
        <span style={{ fontSize: '0.65rem', color: '#6b7280', letterSpacing: '0.1em' }}>
          SLASH COMMAND BLOCK
        </span>
      </div>

      {/* Controles de Ingesta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.65rem', color: '#9ca3af', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            URL de Imagen (Wikimedia o Externa)
          </label>
          <input
            type="text"
            placeholder="https://upload.wikimedia.org/wikipedia/..."
            value={inputUrl}
            onChange={(e: any) => {
              setInputUrl(e.target.value);
              sourceUrl.onChange(e.target.value);
            }}
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: '#111827',
              border: '1px solid #374151',
              borderRadius: '0.375rem',
              padding: '0.5rem 0.75rem',
              color: '#f9fafb',
              fontSize: '0.75rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.65rem', color: '#9ca3af', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            Pie de Foto / Alt Text
          </label>
          <input
            type="text"
            placeholder="Descripción histórica o epígrafe..."
            value={altText.value}
            onChange={(e: any) => altText.onChange(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: '#111827',
              border: '1px solid #374151',
              borderRadius: '0.375rem',
              padding: '0.5rem 0.75rem',
              color: '#f9fafb',
              fontSize: '0.75rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Fila PIN + Botón de Acción */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>PIN:</span>
            <input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e: any) => setPin(e.target.value)}
              disabled={loading}
              style={{
                width: '4.5rem',
                backgroundColor: '#111827',
                border: '1px solid #374151',
                borderRadius: '0.375rem',
                padding: '0.4rem 0.5rem',
                color: '#d4af37',
                textAlign: 'center',
                letterSpacing: '0.3em',
                fontSize: '0.8rem',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleForjarWebP}
            disabled={loading}
            style={{
              padding: '0.5rem 1.25rem',
              backgroundColor: loading ? 'transparent' : 'rgba(212, 175, 55, 0.1)',
              border: '1px solid #d4af37',
              borderRadius: '0.375rem',
              color: '#d4af37',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'all 0.3s ease',
            }}
          >
            {loading ? '◈ Forjando WebP…' : '⚡ Forjar WebP en R2'}
          </button>
        </div>
      </div>

      {/* Feedback de Estado */}
      {error && (
        <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '0.375rem', color: '#f87171', fontSize: '0.7rem' }}>
          ⚠ {error}
        </div>
      )}

      {success && (
        <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', borderRadius: '0.375rem', color: '#4ade80', fontSize: '0.7rem' }}>
          ✦ Imagen transmutada y alojada en Cloudflare R2 con éxito.
        </div>
      )}

      {/* Previsualización de la Imagen en el Documento */}
      {sourceUrl.value && (
        <div
          style={{
            marginTop: '1.25rem',
            padding: '0.75rem',
            backgroundColor: '#030712',
            border: '1px solid #1f2937',
            borderRadius: '0.5rem',
            textAlign: 'center',
          }}
        >
          <img
            src={sourceUrl.value}
            alt={altText.value || 'Artefacto WikiForge'}
            style={{
              maxHeight: '260px',
              maxWidth: '100%',
              objectFit: 'contain',
              borderRadius: '0.375rem',
              margin: '0 auto',
              display: 'block',
            }}
          />
          {altText.value && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>
              {altText.value}
            </p>
          )}
          <span style={{ display: 'inline-block', marginTop: '0.4rem', fontSize: '0.6rem', color: '#d4af37', letterSpacing: '0.1em' }}>
            ✓ R2 ASSET ACTIVO
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Definición del Component Block para Keystatic ───────────────────────────
export const wikiForgeBlock = component({
  preview: WikiForgePreview,
  label: 'WikiForge (Forja WebP)',
  schema: {
    sourceUrl: fields.text({
      label: 'URL de Imagen (Cloudflare R2 o Externa)',
      validation: { length: { min: 0 } },
    }),
    altText: fields.text({
      label: 'Texto Alternativo / Epígrafe',
      validation: { length: { min: 0 } },
    }),
  },
});
