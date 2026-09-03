// src/components/KenBurnsWikimedia.tsx
// Visor Cinemático Ken Burns en pantalla completa (w-full h-[100dvh])
// Aplica interpolación de paneo y zoom (1.0x a 1.3x) sobre imágenes en alta resolución de Wikimedia / Bóveda / Artículos.

import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface KenBurnsItem {
	url: string;
	title?: string;
	subtitle?: string;
	caption?: string;
	credit?: string;
}

export interface KenBurnsWikimediaProps {
	/** URL directa de una imagen o array de imágenes del artículo */
	src?: string;
	images?: (string | KenBurnsItem)[];
	title?: string;
	subtitle?: string;
	caption?: string;
	credit?: string;
	/** Índice inicial a mostrar */
	initialIndex?: number;
	/** Duración de la interpolación en segundos (por defecto 12s) */
	duration?: number;
	/** Si se abre como modal superpuesto o como bloque en el layout */
	isModal?: boolean;
	isOpen?: boolean;
	onClose?: () => void;
	className?: string;
}

// Imagen de demostración por defecto: Wikimedia Commons Paisaje en Alta Resolución
const DEFAULT_WIKIMEDIA_IMAGE =
	'https://upload.wikimedia.org/wikipedia/commons/4/4e/Dusk_landscape_high_resolution.jpg';

export const KenBurnsWikimedia: React.FC<KenBurnsWikimediaProps> = ({
	src,
	images = [],
	title = 'Paisaje al atardecer',
	subtitle = 'Archivo Visual de Alta Resolución · Wikimedia Commons',
	caption,
	credit = 'Wikimedia Commons / The Great Puzzle Project',
	duration = 12,
	initialIndex = 0,
	isModal = false,
	isOpen = true,
	onClose,
	className = '',
}) => {
	// Normalizar lista de imágenes
	const normalizedItems: KenBurnsItem[] = React.useMemo(() => {
		if (images && images.length > 0) {
			return images.map((item, idx) => {
				if (typeof item === 'string') {
					return {
						url: item,
						title: title ? `${title} (Registro ${idx + 1})` : `Registro Visual ${idx + 1}`,
						subtitle: subtitle,
						caption: caption,
						credit: credit,
					};
				}
				return {
					url: item.url,
					title: item.title || title,
					subtitle: item.subtitle || subtitle,
					caption: item.caption || caption,
					credit: item.credit || credit,
				};
			});
		}
		return [
			{
				url: src || DEFAULT_WIKIMEDIA_IMAGE,
				title: title,
				subtitle: subtitle,
				caption: caption,
				credit: credit,
			},
		];
	}, [images, src, title, subtitle, caption, credit]);

	const [currentIndex, setCurrentIndex] = useState(
		initialIndex >= 0 && initialIndex < normalizedItems.length ? initialIndex : 0
	);
	const [isPlaying, setIsPlaying] = useState(true);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [showThumbnails, setShowThumbnails] = useState(false);
	const [showInfo, setShowInfo] = useState(true);
	const [motionStyleIndex, setMotionStyleIndex] = useState(0);

	const containerRef = useRef<HTMLDivElement>(null);

	const currentItem = normalizedItems[currentIndex] || normalizedItems[0];

	// Variaciones cinemáticas Ken Burns (Scale 1.0 -> 1.3 con traslaciones X / Y)
	// Calculadas con la misma lógica matemática que el frame de Remotion:
	// 1. Escala: 1.0 a 1.3
	// 2. Movimiento: de 0 a -10% de ancho y +5% de alto
	const motionVariants = [
		// Variante A: Clásica (de centro hacia abajo-izquierda con zoom 1.0x -> 1.3x)
		{
			from: 'scale(1.0) translate(0%, 0%)',
			to: 'scale(1.3) translate(-8%, 4%)',
			transformOrigin: '55% 45%',
		},
		// Variante B: Retiro reflexivo (de zoom 1.3x con leve deriva hacia arriba-derecha)
		{
			from: 'scale(1.3) translate(6%, -3%)',
			to: 'scale(1.05) translate(-2%, 2%)',
			transformOrigin: '40% 60%',
		},
		// Variante C: Paneo cenital (zoom 1.05x -> 1.28x con paneo horizontal)
		{
			from: 'scale(1.05) translate(-5%, -2%)',
			to: 'scale(1.28) translate(7%, 3%)',
			transformOrigin: '50% 50%',
		},
		// Variante D: Enfoque focal (zoom profundo hacia el detalle central)
		{
			from: 'scale(1.0) translate(3%, 3%)',
			to: 'scale(1.32) translate(-5%, -4%)',
			transformOrigin: '60% 40%',
		},
	];

	const activeMotion = motionVariants[motionStyleIndex % motionVariants.length];

	// Navegar siguiente/anterior
	const handleNext = useCallback(() => {
		setCurrentIndex((prev) => (prev + 1) % normalizedItems.length);
		setMotionStyleIndex((prev) => prev + 1);
	}, [normalizedItems.length]);

	const handlePrev = useCallback(() => {
		setCurrentIndex((prev) => (prev - 1 + normalizedItems.length) % normalizedItems.length);
		setMotionStyleIndex((prev) => prev + 1);
	}, [normalizedItems.length]);

	// Toggle pantalla completa
	const toggleFullscreen = useCallback(async () => {
		if (!containerRef.current) return;
		try {
			if (!document.fullscreenElement) {
				await containerRef.current.requestFullscreen();
				setIsFullscreen(true);
			} else {
				await document.exitFullscreen();
				setIsFullscreen(false);
			}
		} catch (err) {
			console.warn('[KenBurns] Error pantalla completa:', err);
		}
	}, []);

	// Soporte de atajos de teclado
	useEffect(() => {
		if (!isOpen && isModal) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				if (isFullscreen) {
					document.exitFullscreen().catch(() => {});
					setIsFullscreen(false);
				} else if (isModal && onClose) {
					onClose();
				}
			} else if (e.key === 'ArrowRight') {
				handleNext();
			} else if (e.key === 'ArrowLeft') {
				handlePrev();
			} else if (e.key === ' ' || e.code === 'Space') {
				e.preventDefault();
				setIsPlaying((p) => !p);
			} else if (e.key === 'f' || e.key === 'F') {
				toggleFullscreen();
			} else if (e.key === 'i' || e.key === 'I') {
				setShowInfo((s) => !s);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, isModal, onClose, isFullscreen, handleNext, handlePrev, toggleFullscreen]);

	// Escuchar cambios de fullscreen del navegador
	useEffect(() => {
		const handleFsChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
		};
		document.addEventListener('fullscreenchange', handleFsChange);
		return () => document.removeEventListener('fullscreenchange', handleFsChange);
	}, []);

	if (isModal && !isOpen) return null;

	return (
		<div
			ref={containerRef}
			role="region"
			aria-label="Visor Cinemático Ken Burns"
			className={`
				${isModal ? 'fixed inset-0 z-50 bg-black' : 'relative'}
				w-full h-[100dvh] min-h-[100dvh] overflow-hidden select-none bg-black text-[#f0ede8] font-sans flex flex-col justify-between
				${className}
			`}
			style={{ backgroundColor: '#050505' }}
		>
			{/* ── CAPA 1: IMAGEN CON EFECTO KEN BURNS (INTERPOLACIÓN CONTINUA) ── */}
			<div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none flex items-center justify-center">
				<div
					key={`${currentIndex}-${motionStyleIndex}`}
					className="w-full h-full transition-opacity duration-1000 ease-out"
					style={{
						animationName: isPlaying ? 'kenBurnsInterpolate' : 'none',
						animationDuration: `${duration}s`,
						animationTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
						animationIterationCount: 'infinite',
						animationDirection: 'alternate',
						animationPlayState: isPlaying ? 'running' : 'paused',
						transformOrigin: activeMotion.transformOrigin,
						willChange: 'transform',
					}}
				>
					<img
						src={currentItem.url}
						alt={currentItem.title || 'Visualización de artículo'}
						className="w-full h-full object-cover"
						style={{
							filter: 'contrast(1.04) brightness(0.96)',
						}}
					/>
				</div>
			</div>

			{/* ── CAPA 2: ATMÓSFERA EDITORIAL (Vignette + Lens Glow + Film Grain) ── */}
			<div
				className="absolute inset-0 pointer-events-none"
				style={{
					background:
						'radial-gradient(ellipse at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.85) 100%)',
				}}
			/>
			<div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/70 pointer-events-none" />

			{/* ── CAPA 3: BARRA SUPERIOR DE CONTROL (HEADER ULTRA SLIM OBSIDIAN) ── */}
			<header className="relative z-30 w-full px-6 py-5 flex items-center justify-between backdrop-blur-xs bg-gradient-to-b from-black/60 to-transparent">
				<div className="flex items-center gap-3">
					<span className="w-2 h-2 rounded-full bg-[#c9a96e] animate-pulse" />
					<div className="flex flex-col">
						<span className="text-[10px] uppercase font-mono tracking-[0.3em] text-[#c9a96e] font-semibold">
							Ken Burns Visor 100dvh
						</span>
						<span className="text-[9px] uppercase font-mono tracking-widest text-white/50">
							{currentIndex + 1} de {normalizedItems.length} Registros Visuales
						</span>
					</div>
				</div>

				{/* Botones de Acción Superior */}
				<div className="flex items-center gap-2 sm:gap-3">
					{/* Botón Info Toggle */}
					<button
						type="button"
						onClick={() => setShowInfo((s) => !s)}
						title="Mostrar/Ocultar información (I)"
						className={`px-3 py-1.5 rounded-full border text-[10px] font-mono uppercase tracking-widest transition-all cursor-pointer ${
							showInfo
								? 'border-[#c9a96e] bg-[#c9a96e]/15 text-[#f0ede8]'
								: 'border-white/10 text-white/60 hover:text-white hover:border-white/30'
						}`}
					>
						<span>Info</span>
					</button>

					{/* Botón Tira de Miniaturas */}
					{normalizedItems.length > 1 && (
						<button
							type="button"
							onClick={() => setShowThumbnails((s) => !s)}
							title="Ver galería de miniaturas"
							className={`px-3 py-1.5 rounded-full border text-[10px] font-mono uppercase tracking-widest transition-all cursor-pointer ${
								showThumbnails
									? 'border-[#c9a96e] bg-[#c9a96e]/15 text-[#f0ede8]'
									: 'border-white/10 text-white/60 hover:text-white hover:border-white/30'
							}`}
						>
							<span>Galería</span>
						</button>
					)}

					{/* Botón Pantalla Completa */}
					<button
						type="button"
						onClick={toggleFullscreen}
						title="Pantalla completa (F)"
						className="p-2 rounded-full border border-white/10 hover:border-[#c9a96e] bg-black/40 hover:bg-[#c9a96e]/20 text-white/80 hover:text-[#c9a96e] transition-all cursor-pointer"
					>
						{isFullscreen ? (
							<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
							</svg>
						) : (
							<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
							</svg>
						)}
					</button>

					{/* Botón de Cierre (si es modal) */}
					{isModal && onClose && (
						<button
							type="button"
							onClick={onClose}
							title="Cerrar visor (ESC)"
							className="px-3 py-1.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/20 text-white text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5"
						>
							<span>✕</span>
							<span className="text-[9px] uppercase tracking-widest hidden sm:inline">Cerrar</span>
						</button>
					)}
				</div>
			</header>

			{/* ── FLECHAS DE NAVEGACIÓN LATERAL (FLOTANTES) ── */}
			{normalizedItems.length > 1 && (
				<>
					<button
						type="button"
						onClick={handlePrev}
						aria-label="Registro anterior"
						className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full border border-white/10 hover:border-[#c9a96e] bg-black/40 hover:bg-[#c9a96e]/20 backdrop-blur-md text-white/80 hover:text-[#c9a96e] transition-all flex items-center justify-center cursor-pointer group"
					>
						<span className="text-lg group-hover:-translate-x-0.5 transition-transform">←</span>
					</button>

					<button
						type="button"
						onClick={handleNext}
						aria-label="Siguiente registro"
						className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full border border-white/10 hover:border-[#c9a96e] bg-black/40 hover:bg-[#c9a96e]/20 backdrop-blur-md text-white/80 hover:text-[#c9a96e] transition-all flex items-center justify-center cursor-pointer group"
					>
						<span className="text-lg group-hover:translate-x-0.5 transition-transform">→</span>
					</button>
				</>
			)}

			{/* ── CAPA 4: PANEL INFERIOR (INFORMACIÓN EDITORIAL Y CONTROLES) ── */}
			<footer className="relative z-30 w-full px-6 md:px-12 pb-8 pt-4 flex flex-col gap-4">
				{/* Información de la imagen activa */}
				{showInfo && (
					<div className="max-w-3xl space-y-2 transition-all duration-300">
						<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/70 border border-[#c9a96e]/30 backdrop-blur-md text-[9px] font-mono text-[#c9a96e] uppercase tracking-widest">
							<span>◈ {currentItem.subtitle || 'Registro de Ensayo'}</span>
						</div>

						<h2
							className="text-2xl sm:text-4xl md:text-5xl font-serif font-bold text-white tracking-tight leading-tight"
							style={{ fontFamily: "'Bodoni Moda', serif" }}
						>
							{currentItem.title}
						</h2>

						{currentItem.caption && (
							<p className="text-xs sm:text-sm text-white/70 font-light max-w-2xl leading-relaxed">
								{currentItem.caption}
							</p>
						)}

						<div className="flex items-center gap-4 text-[10px] font-mono tracking-widest text-white/40 uppercase pt-1">
							<span>{currentItem.credit}</span>
							<span>•</span>
							<span>Escala 1.0x → 1.3x · Paneo Cinemático</span>
						</div>
					</div>
				)}

				{/* Barra de progreso y controles de reproducción */}
				<div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 backdrop-blur-xs">
					<div className="flex items-center gap-4">
						{/* Play / Pause */}
						<button
							type="button"
							onClick={() => setIsPlaying((p) => !p)}
							title={isPlaying ? 'Pausar efecto Ken Burns (Espacio)' : 'Reanudar efecto Ken Burns (Espacio)'}
							className="px-4 py-2 rounded-full border border-white/15 hover:border-[#c9a96e] bg-white/5 hover:bg-[#c9a96e]/15 text-xs font-mono uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 text-white"
						>
							<span>{isPlaying ? '⏸ Pausar' : '▶ Animar'}</span>
						</button>

						{/* Botón Alternar Estilo de Paneo */}
						<button
							type="button"
							onClick={() => setMotionStyleIndex((i) => i + 1)}
							title="Cambiar ángulo de paneo"
							className="px-3.5 py-2 rounded-full border border-white/10 hover:border-white/30 text-[10px] font-mono uppercase tracking-widest text-white/70 hover:text-white transition-all cursor-pointer"
						>
							<span>Perspectiva #{((motionStyleIndex % motionVariants.length) + 1)}</span>
						</button>
					</div>

					{/* Indicadores de diapositiva */}
					{normalizedItems.length > 1 && (
						<div className="flex items-center gap-1.5">
							{normalizedItems.map((_, idx) => (
								<button
									key={idx}
									type="button"
									onClick={() => {
										setCurrentIndex(idx);
										setMotionStyleIndex((p) => p + 1);
									}}
									aria-label={`Ir a registro ${idx + 1}`}
									className={`h-1.5 rounded-full transition-all cursor-pointer ${
										idx === currentIndex ? 'w-8 bg-[#c9a96e]' : 'w-2 bg-white/20 hover:bg-white/40'
									}`}
								/>
							))}
						</div>
					)}
				</div>

				{/* Tira desplegable de miniaturas */}
				{showThumbnails && normalizedItems.length > 1 && (
					<div className="w-full flex items-center gap-3 overflow-x-auto py-3 px-1 scrollbar-thin border-t border-white/10">
						{normalizedItems.map((item, idx) => (
							<button
								key={idx}
								type="button"
								onClick={() => {
									setCurrentIndex(idx);
									setMotionStyleIndex((p) => p + 1);
								}}
								className={`relative flex-shrink-0 w-24 h-16 rounded-xl overflow-hidden border transition-all cursor-pointer ${
									idx === currentIndex
										? 'border-[#c9a96e] ring-2 ring-[#c9a96e]/40 scale-105'
										: 'border-white/10 opacity-50 hover:opacity-100'
								}`}
							>
								<img src={item.url} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" />
								<div className="absolute inset-0 bg-black/20" />
								<span className="absolute bottom-1 right-1 text-[8px] font-mono bg-black/80 px-1.5 py-0.5 rounded text-white/90">
									{idx + 1}
								</span>
							</button>
						))}
					</div>
				)}
			</footer>

			{/* ── CSS KEYFRAMES EMBEBIDOS PARA INTERPOLACIÓN SUAVE (KEN BURNS) ── */}
			<style dangerouslySetInnerHTML={{
				__html: `
					@keyframes kenBurnsInterpolate {
						0% {
							transform: ${activeMotion.from};
						}
						100% {
							transform: ${activeMotion.to};
						}
					}
				`
			}} />
		</div>
	);
};

export const KenBurnsWikimediaComposition = KenBurnsWikimedia;
export default KenBurnsWikimedia;
