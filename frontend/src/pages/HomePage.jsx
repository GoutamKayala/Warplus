import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import BreakingNewsSlider from '../components/BreakingNewsSlider';
import NewsCard from '../components/NewsCard';
import { Loader2, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Zap, Radio, Clock } from 'lucide-react';

const SkeletonCard = () => (
    <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 animate-pulse">
        <div className="aspect-[16/9] bg-gray-200"></div>
        <div className="p-6 space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
        </div>
    </div>
);

const HomePage = () => {
    const [articles, setArticles] = useState([]);
    const [breakingNews, setBreakingNews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(null);
    const [countdown, setCountdown] = useState(30);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const searchQueryRef = useRef('');
    const currentPageRef = useRef(1);

    const fetchArticles = useCallback(async (query = '', page = 1, silent = false) => {
        if (!silent) setIsLoading(true);
        setError(null);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_URL;
            if (!API_BASE_URL) throw new Error("VITE_API_URL not defined");
            let res;
            if (query && query.trim()) {
                // Use the live search endpoint that queries NewsData.io + DB
                res = await axios.get(`${API_BASE_URL}/api/news/search?q=${encodeURIComponent(query)}&limit=20`);
            } else {
                res = await axios.get(`${API_BASE_URL}/api/news?page=${page}&limit=12`);
            }

            const fetchedArticles = res.data.articles || [];
            setTotalPages(res.data.totalPages || 1);

            if (fetchedArticles.length > 0) {
                if (page === 1 && !query) {
                    setBreakingNews(fetchedArticles.slice(0, 5));
                    setArticles(fetchedArticles.slice(5));
                } else {
                    setArticles(fetchedArticles);
                    setBreakingNews([]);
                }
            } else {
                setArticles([]);
                setBreakingNews([]);
            }
        } catch (err) {
            console.error(err);
            if (!silent) {
                const errorMsg = err.response?.data?.message || err.message || 'Connection to Tactical HQ lost. (v2.0)';
                setError(errorMsg);
                setArticles([]);
                setBreakingNews([]);
            }
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, []);

    const handleRefreshData = async () => {
        setIsSyncing(true);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_URL;
            if (!API_BASE_URL) throw new Error("VITE_API_URL not defined");
            // The /sync endpoint fetches live from NewsData.io AND returns fresh articles directly
            const res = await axios.post(`${API_BASE_URL}/api/news/sync`, {
                query: 'war OR conflict OR airstrike OR frontline OR military OR shelling'
            });

            const { articles: freshArticles = [], newArticles = 0 } = res.data;

            if (freshArticles.length > 0) {
                setBreakingNews(freshArticles.slice(0, 5));
                setArticles(freshArticles.slice(5));
                setTotalPages(res.data.totalPages || 1);
            }
            setCurrentPage(1);
            currentPageRef.current = 1;
            setLastSync(new Date());
            setCountdown(30);

            if (newArticles > 0) {
                console.log(`[Sync] ${newArticles} new articles loaded from the web`);
            }
        } catch (err) {
            setError('Live sync failed. Retrying from database...');
            await fetchArticles(searchQueryRef.current, 1);
        } finally {
            setIsSyncing(false);
        }
    };


    useEffect(() => {
        fetchArticles(searchQuery, currentPage);

        // Auto-sync: fetch live from web every 30 seconds
        const syncInterval = setInterval(async () => {
            if (currentPageRef.current === 1 && !searchQueryRef.current) {
                try {
                    const API_BASE_URL = import.meta.env.VITE_API_URL;
                    if (!API_BASE_URL) return;

                    const res = await axios.post(`${API_BASE_URL}/api/news/sync`, {
                        query: 'war OR conflict OR airstrike OR frontline OR military OR shelling'
                    });
                    const { articles: freshArticles = [] } = res.data;
                    if (freshArticles.length > 0) {
                        setBreakingNews(freshArticles.slice(0, 5));
                        setArticles(freshArticles.slice(5));
                    }
                } catch {
                    // silently fall back — don't disrupt the user
                }
                setLastSync(new Date());
                setCountdown(30);
            }
        }, 30000);

        // Countdown timer
        const countdownInterval = setInterval(() => {
            setCountdown(prev => prev > 0 ? prev - 1 : 30);
        }, 1000);

        const handleSearchEvent = (e) => {
            const newQuery = e.detail;
            searchQueryRef.current = newQuery;
            setSearchQuery(newQuery);
            setCurrentPage(1);
            currentPageRef.current = 1;
            fetchArticles(newQuery, 1);
        };

        window.addEventListener('searchNews', handleSearchEvent);
        return () => {
            clearInterval(syncInterval);
            clearInterval(countdownInterval);
            window.removeEventListener('searchNews', handleSearchEvent);
        };
    }, [fetchArticles]);

    return (
        <div className="w-full">
            {/* Search Header Info */}
            {searchQuery && (
                <div className="mb-8 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Search Results for "{searchQuery}"
                    </h2>
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setCurrentPage(1);
                            fetchArticles('', 1);
                            window.dispatchEvent(new CustomEvent('searchNews', { detail: '' }));
                        }}
                        className="text-sm font-medium text-rose-600 hover:text-rose-700 underline"
                    >
                        Clear Search
                    </button>
                </div>
            )}

            {/* Error state */}
            {error && (
                <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4 text-left">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-lg font-bold text-red-800 mb-1">Status Update</h3>
                        <p className="text-red-600 text-sm mb-4 leading-relaxed">{error}</p>
                        <button
                            onClick={handleRefreshData}
                            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
                        >
                            Retry Sync
                        </button>
                    </div>
                </div>
            )}

            {/* Loading state */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-400">
                    <Loader2 size={48} className="animate-spin mb-4 text-rose-500" />
                    <p className="font-medium tracking-wide">Synthesizing global reports...</p>
                </div>
            ) : (
                <>
                    {/* Breaking News Slider */}
                    {!searchQuery && currentPage === 1 && breakingNews.length > 0 && (
                        <BreakingNewsSlider articles={breakingNews} />
                    )}

                    {/* Hero Section with Live Updates Button */}
                    {!searchQuery && (
                        <div className="mb-12 flex flex-col md:flex-row items-center justify-between p-8 bg-gray-900 rounded-[32px] border border-gray-800 shadow-2xl overflow-hidden relative group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-rose-600/20 transition-colors duration-700"></div>
                            <div className="relative z-10 w-full md:w-auto">
                                <div className="flex flex-wrap items-center gap-3 mb-4">
                                    <span className="flex items-center gap-2 text-rose-500 font-black text-[10px] uppercase tracking-[0.3em]">
                                        <Radio size={14} className="animate-pulse" />
                                        Live Tactical Feed
                                    </span>
                                    <span className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Clock size={10} className="text-emerald-400" />
                                        Auto-Sync in {countdown}s
                                    </span>
                                    {lastSync && (
                                        <span className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
                                            Last Synced: {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-4 leading-none">
                                    Global Conflict <span className="text-rose-600">Operations</span>
                                </h1>
                                <p className="text-gray-400 font-medium max-w-xl text-lg">
                                    Real-time aggregation of geopolitical developments and frontline intelligence from verified global sources.
                                </p>
                            </div>
                            <button
                                onClick={handleRefreshData}
                                disabled={isSyncing}
                                className="relative z-10 mt-8 md:mt-0 px-8 py-5 bg-rose-600 hover:bg-rose-500 disabled:opacity-60 disabled:cursor-wait text-white font-black rounded-2xl flex items-center gap-4 transition-all duration-300 shadow-xl shadow-rose-900/40 active:scale-95 group/btn overflow-hidden w-full md:w-auto justify-center"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover/btn:animate-shimmer"></div>
                                {isSyncing ? <Loader2 size={24} className="animate-spin" /> : <Zap size={24} className="fill-white" />}
                                <span className="uppercase tracking-widest text-sm text-center">
                                    {isSyncing ? 'Synchronizing...' : 'Synchronize Live Updates'}
                                </span>
                            </button>
                        </div>
                    )}

                    {/* Grid Header */}
                    <div className="flex items-end justify-between mb-8 mt-12 md:mt-20">
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                                {searchQuery ? "Intelligence Results" : "Recent Tactical Log"}
                            </h2>
                            <p className="text-gray-500 mt-2 font-medium">Verified reports and strategic summaries.</p>
                        </div>
                    </div>

                    {/* News Grid */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                        </div>
                    ) : articles.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {Array.from(new Map(articles.map(item => [item.url, item])).values()).map((article) => (
                                <NewsCard key={article._id || article.url} article={article} />
                            ))}
                        </div>
                    ) : (
                        !error && (
                            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                                <p className="text-xl text-gray-500 font-medium font-sans">No records found in this sector.</p>
                            </div>
                        )
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-16 mb-8">
                            <button
                                onClick={() => {
                                    const nextP = Math.max(1, currentPage - 1);
                                    setCurrentPage(nextP);
                                    currentPageRef.current = nextP;
                                    fetchArticles(searchQuery, nextP);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                disabled={currentPage === 1}
                                className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-gray-200/50"
                            >
                                <ChevronLeft size={20} />
                                Previous
                            </button>
                            <span className="text-gray-500 font-bold bg-gray-100/50 px-4 py-2 rounded-lg border border-gray-100">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => {
                                    const nextP = Math.min(totalPages, currentPage + 1);
                                    setCurrentPage(nextP);
                                    currentPageRef.current = nextP;
                                    fetchArticles(searchQuery, nextP);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                disabled={currentPage === totalPages}
                                className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-gray-200/50"
                            >
                                Next
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default HomePage;
