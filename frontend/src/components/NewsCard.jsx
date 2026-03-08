import React from 'react';
import RelativeTime from './RelativeTime';
import { ArrowRight, Clock, Globe } from 'lucide-react';

const NewsCard = ({ article }) => {
    return (
        <article className="group flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 overflow-hidden h-full">
            {/* Image Container */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100">
                <img
                    src={article.imageUrl || "https://images.unsplash.com/photo-1596720426673-e4e14290f0cc?w=800&q=80"}
                    alt={article.title}
                    onError={(e) => {
                        e.target.onerror = null; // Prevent infinite loop
                        e.target.src = "https://images.unsplash.com/photo-1596720426673-e4e14290f0cc?w=800&q=80";
                    }}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                {/* Source Badge */}
                <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm">
                    <Globe size={12} className="text-rose-500" />
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">{article.source || "News"}</span>
                </div>
            </div>

            {/* Content Container */}
            <div className="flex flex-col flex-1 p-6">
                {/* Meta Info */}
                <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold mb-3 tracking-wide">
                    <Clock size={14} className="text-gray-400" />
                    <time dateTime={article.publishedAt}>
                        <RelativeTime timestamp={article.publishedAt} />
                    </time>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 leading-snug mb-3 group-hover:text-rose-600 transition-colors line-clamp-2 title-font">
                    {article.title}
                </h3>

                {/* Description */}
                <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-6 flex-1">
                    {article.description}
                </p>

                {/* Action Button */}
                <div className="mt-auto pt-4 border-t border-gray-100">
                    <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-rose-600 font-bold text-sm tracking-wide hover:text-rose-700 transition-colors group/link"
                    >
                        Read more
                        <ArrowRight size={16} className="transform group-hover/link:translate-x-1 transition-transform" />
                    </a>
                </div>
            </div>
        </article>
    );
};

export default NewsCard;
