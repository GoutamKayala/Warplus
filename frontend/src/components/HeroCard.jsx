import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUpRight } from 'lucide-react';

const HeroCard = ({ article }) => {
    if (!article) return null;

    return (
        <div className="relative w-full h-[350px] md:h-[400px] rounded-3xl overflow-hidden group shadow-2xl shadow-gray-200/50 mb-12">
            {/* Background Image */}
            <img
                src={article.imageUrl || "https://images.unsplash.com/photo-1596720426673-e4e14290f0cc?w=1600&q=80"}
                alt={article.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900/60 to-transparent md:w-2/3"></div>

            {/* Content */}
            <div className="absolute inset-0 p-6 md:p-12 flex flex-col justify-end">
                <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-rose-600 text-white text-xs font-bold tracking-widest uppercase rounded-full shadow-lg shadow-rose-600/30">
                            Breaking
                        </span>
                        <span className="text-gray-300 text-sm font-medium tracking-wide">
                            {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                        </span>
                    </div>

                    <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-3 tracking-tight">
                        {article.title}
                    </h1>

                    <p className="text-gray-300 text-sm md:text-lg font-medium line-clamp-2 mb-6 max-w-2xl leading-relaxed">
                        {article.description}
                    </p>

                    <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 font-bold rounded-full hover:bg-rose-50 transition-colors duration-300 shadow-xl text-sm"
                    >
                        Read Full Report
                        <ArrowUpRight size={20} className="text-rose-600" />
                    </a>
                </div>
            </div>
        </div>
    );
};

export default HeroCard;
