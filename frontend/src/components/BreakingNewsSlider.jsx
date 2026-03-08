import React, { useRef } from 'react';
import { ArrowUpRight, Clock, Globe, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import RelativeTime from './RelativeTime';

const BreakingNewsSlider = ({ articles }) => {
    const scrollRef = useRef(null);

    if (!articles || articles.length === 0) return null;

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    const handleImageError = (e) => {
        e.target.onerror = null; // Prevent infinite loop
        e.target.src = "https://images.unsplash.com/photo-1596720426673-e4e14290f0cc?w=800&q=80";
    };

    return (
        <div className="relative w-full mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-600 rounded-lg text-white shadow-lg shadow-rose-600/20">
                        <ShieldAlert size={20} />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight uppercase">High Priority Feed</h2>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => scroll('left')}
                        className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <ChevronLeft size={20} className="text-gray-600" />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <ChevronRight size={20} className="text-gray-600" />
                    </button>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory no-scrollbar cursor-grab active:cursor-grabbing"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {Array.from(new Map(articles.map(item => [item.url, item])).values()).map((article, i) => (
                    <div
                        key={article._id || i}
                        className="min-w-[280px] sm:min-w-[350px] md:min-w-[450px] aspect-[16/10] relative rounded-[24px] md:rounded-[32px] overflow-hidden snap-start shadow-xl shadow-gray-200/50 group"
                    >
                        {/* Background Image */}
                        <img
                            src={article.imageUrl || "https://images.unsplash.com/photo-1596720426673-e4e14290f0cc?w=1200&q=80"}
                            alt={article.title}
                            onError={handleImageError}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            loading="lazy"
                        />

                        {/* Overlays */}
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent"></div>

                        {/* Content */}
                        <div className="absolute inset-0 p-5 sm:p-6 md:p-8 flex flex-col justify-end">
                            <div className="flex items-center gap-2 mb-2 sm:mb-3">
                                <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-widest rounded">LIVE</span>
                                <div className="flex items-center gap-1 text-gray-300 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                                    <Clock size={10} className="sm:w-3 sm:h-3" />
                                    <RelativeTime timestamp={article.publishedAt} />
                                </div>
                            </div>

                            <h3 className="text-white font-black text-base sm:text-lg md:text-xl leading-snug sm:leading-tight mb-3 sm:mb-4 group-hover:text-rose-400 transition-colors line-clamp-2">
                                {article.title}
                            </h3>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-white/60 text-[10px] font-bold uppercase tracking-widest truncate max-w-[150px]">
                                    <Globe size={12} className="shrink-0" />
                                    <span className="truncate">{article.source || "Global Intelligence"}</span>
                                </div>
                                <a
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-rose-600 transition-all duration-300"
                                >
                                    <ArrowUpRight size={16} />
                                </a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BreakingNewsSlider;
