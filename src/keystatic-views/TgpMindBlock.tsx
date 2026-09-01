import React, { useState } from 'react';
import { component, fields } from '@keystatic/core';

// ─── Vista React del Bloque TGP Mind ────────────────────────────────────────
function TgpMindPreview(props: {
  fields: {
    prompt: { value: string; onChange: (val: string) => void };
    response: { value: string; onChange: (val: string) => void };
  };
}) {
  const { prompt, response } = props.fields;
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const iaWebhookUrl =
    (import.meta as any).env?.PUBLIC_IA_WEBHOOK_URL ||
    'https://tgp-app-713934653057.us-central1.run.app';

  async function handleConsultarIA(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const cleanPin = pin.trim();
    if (cleanPin.length !== 4) {
      setError('Introduce tu PIN de seguridad de 4 dígitos.');
      return;
    }

    const currentPrompt = prompt.value.trim();
    if (!currentPrompt) {
      setError('Introduce una instrucción o prompt para TGP Mind.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(iaWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanPin}`,
        },
        body: JSON.stringify({ prompt: currentPrompt, mode: 'cognitivo' }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Error ${res.status}: ${text || res.statusText}`);
      }

      const data = await res.json();
      const iaOutput = data.respuesta || data.analisis || data.text || data.response || (typeof data === 'string' ? data : JSON.stringify(data, null, 2));

      if (!iaOutput) {
        throw new Error('El motor IA no devolvió contenido.');
      }

      // Inyectar el resultado en el campo response del documento
      response.onChange(iaOutput);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Error al conectar con el motor cognitivo TGP Mind.');
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
          <span style={{ color: '#d4af37', fontSize: '1rem' }}>🧠</span>
          <span
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 700,
              color: '#d4af37',
            }}
          >
            TGP Mind · Motor Cognitivo IA
          </span>
        </div>
        <span style={{ fontSize: '0.65rem', color: '#6b7280', letterSpacing: '0.1em' }}>
          SLASH COMMAND BLOCK
        </span>
      </div>

      {/* Input de Prompt */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.65rem', color: '#9ca3af', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            Instrucción / Prompt Cognitivo
          </label>
          <textarea
            rows={3}
            placeholder="Ej. Realiza una síntesis filosófica sobre la arquitectura del olvido..."
            value={prompt.value}
            onChange={(e: any) => prompt.onChange(e.target.value)}
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
              resize: 'vertical',
              boxSizing: 'border-box',
              lineHeight: '1.4',
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
            onClick={handleConsultarIA}
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
            {loading ? '🧠 Consultando a Gemini…' : 'Consultar IA'}
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
          ✦ Síntesis cognitiva generada e inyectada con éxito.
        </div>
      )}

      {/* Bloque de Contenido Generado en el Documento */}
      {response.value && (
        <div
          style={{
            marginTop: '1.25rem',
            padding: '1rem',
            backgroundColor: '#030712',
            border: '1px solid #1f2937',
            borderLeft: '3px solid #d4af37',
            borderRadius: '0.375rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.65rem', color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>
              ✦ Síntesis Cognitiva Inyectada
            </span>
          </div>
          <div
            style={{
              fontSize: '0.8rem',
              color: '#d1d5db',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {response.value}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Definición del Component Block para Keystatic ───────────────────────────
export const tgpMindBlock = component({
  preview: TgpMindPreview,
  label: 'TGP Mind (Análisis IA)',
  schema: {
    prompt: fields.text({
      label: 'Instrucción o Consulta Cognitiva',
      multiline: true,
    }),
    response: fields.text({
      label: 'Respuesta Generada por IA',
      multiline: true,
    }),
  },
});
