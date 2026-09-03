// src/components/ArticleKenBurnsModal.tsx
// Componente interactivo para abrir cualquier imagen o galería de un artículo
// en el Visor Cinemático Ken Burns a pantalla completa (100dvh).

import React, { useState, useEffect } from 'react';
import { KenBurnsWikimedia } from './KenBurnsWikimedia';

interface ArticleKenBurnsModalProps {
	images: string[];
	title?: string;
	subtitle?: string;
	buttonLabel?: string;
	className?: string;
}

export const ArticleKenBurnsModal: React.FC<ArticleKenBurnsModalProps> = ({
	images = [],
	title = 'Registro Editorial',
	subtitle = 'The Great Puzzle Project',
	buttonLabel = 'Abrir Visor Ken Burns (100dvh)',
	className = '',
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedImageIndex, setSelectedImageIndex] = useState(0);

	// Permitir que clicks en elementos con [data-kenburns-index] o imágenes en el texto abran el visor
	useEffect(() => {
		const handleGlobalImageClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;

			// 1. Elementos con data-kenburns-index explícito
			const triggerEl = target.closest('[data-kenburns-index]');
			if (triggerEl) {
				const idxStr = triggerEl.getAttribute('data-kenburns-index');
				if (idxStr !== null) {
					const idx = parseInt(idxStr, 10);
					if (!isNaN(idx) && idx >= 0 && idx < images.length) {
						setSelectedImageIndex(idx);
						setIsOpen(true);
						return;
					}
				}
			}

			// 2. Cualquier imagen dentro del contenido del ensayo
			if (target.tagName === 'IMG' && target.closest('.ensayo-prose')) {
				const imgEl = target as HTMLImageElement;
				const foundIdx = images.findIndex((img) => img === imgEl.src || imgEl.src.includes(img));
				if (foundIdx !== -1) {
					setSelectedImageIndex(foundIdx);
				}
				setIsOpen(true);
			}
		};

		document.addEventListener('click', handleGlobalImageClick);
		return () => document.removeEventListener('click', handleGlobalImageClick);
	}, [images]);

	if (!images || images.length === 0) return null;

	return (
		<div className={`inline-flex items-center ${className}`}>
			<button
				type="button"
				onClick={() => {
					setSelectedImageIndex(0);
					setIsOpen(true);
				}}
				className="group inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-[#c9a96e]/40 bg-black/60 hover:bg-[#c9a96e]/15 hover:border-[#c9a96e] text-[10px] font-mono uppercase tracking-[0.2em] text-[#c9a96e] hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(201,169,110,0.15)] cursor-pointer backdrop-blur-md"
				title="Ver imágenes en animación cinemática Ken Burns (100dvh)"
			>
				<span className="w-1.5 h-1.5 rounded-full bg-[#c9a96e] animate-pulse" />
				<span>{buttonLabel}</span>
				<span className="opacity-60 text-xs group-hover:translate-x-0.5 transition-transform">↗</span>
			</button>

			{isOpen && (
				<KenBurnsWikimedia
					images={images}
					title={title}
					subtitle={subtitle}
					initialIndex={selectedImageIndex}
					isModal={true}
					isOpen={isOpen}
					onClose={() => setIsOpen(false)}
				/>
			)}
		</div>
	);
};

export default ArticleKenBurnsModal;
