import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Search, Globe, Menu, X, ShieldAlert, History } from 'lucide-react';
import ChatAssistant from './ChatAssistant';

const Layout = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [searchHistory, setSearchHistory] = useState(() => {
        return JSON.parse(localStorage.getItem('warnews_search_history') || '[]');
    });

    const handleSearch = (e, query) => {
        if (e) e.preventDefault();
        const finalQuery = typeof query === 'string' ? query : searchQuery;
        if (!finalQuery.trim()) return;

        // Update history
        const newHistory = [finalQuery, ...searchHistory.filter(h => h !== finalQuery)].slice(0, 5);
        setSearchHistory(newHistory);
        localStorage.setItem('warnews_search_history', JSON.stringify(newHistory));

        window.dispatchEvent(new CustomEvent('searchNews', { detail: finalQuery }));
        setSearchQuery(finalQuery);
        setShowHistory(false);
    };

    return (
        <div className="min-h-screen flex flex-col font-sans selection:bg-rose-500 selection:text-white overflow-x-hidden w-full max-w-[100vw]">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm w-full">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* Logo */}
                        <div className="flex-shrink-0 flex items-center">
                            <Link to="/" className="flex items-center gap-2 group">
                                <div className="bg-gradient-to-br from-rose-600 to-red-600 p-2 rounded-xl text-white shadow-lg shadow-red-500/30 group-hover:scale-105 transition-transform duration-300">
                                    <ShieldAlert size={28} strokeWidth={2.5} />
                                </div>
                                <span className="font-black text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 uppercase">
                                    War<span className="text-rose-600">Pulse</span>
                                </span>
                            </Link>
                        </div>

                        {/* Desktop Navigation & Search */}
                        <div className="hidden md:flex items-center space-x-8 flex-1 justify-end">
                            <nav className="flex space-x-6">
                                <Link to="/map" className="text-gray-600 hover:text-rose-600 font-medium transition-colors text-sm uppercase tracking-wider">Map</Link>
                            </nav>

                            <form onSubmit={handleSearch} className="relative group w-72">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-rose-500 transition-colors">
                                    <Search size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search war updates..."
                                    className="block w-full pl-10 pr-10 py-2.5 border-none rounded-2xl leading-5 bg-gray-100/80 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:bg-white transition-all duration-300 sm:text-sm shadow-inner"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setShowHistory(true)}
                                    onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery('');
                                            window.dispatchEvent(new CustomEvent('searchNews', { detail: '' }));
                                        }}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-rose-500 transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                )}

                                {/* Search History Dropdown */}
                                {showHistory && searchHistory.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                                        <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                                            <History className="text-gray-400" size={14} />
                                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Recent Intelligence</span>
                                        </div>
                                        {searchHistory.map((h, i) => (
                                            <div key={i} className="group/item flex items-center border-b last:border-none border-gray-50 hover:bg-rose-50 transition-colors">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSearch(null, h)}
                                                    className="flex-1 text-left px-4 py-3 text-sm text-gray-700 flex items-center gap-3"
                                                >
                                                    <Search size={14} className="text-gray-300 group-hover/item:text-rose-400 transition-colors" />
                                                    {h}
                                                </button>
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault(); // Prevent input from losing focus
                                                        e.stopPropagation();
                                                        const newHistory = searchHistory.filter(item => item !== h);
                                                        setSearchHistory(newHistory);
                                                        localStorage.setItem('warnews_search_history', JSON.stringify(newHistory));
                                                    }}
                                                    className="p-3 text-gray-300 hover:text-rose-500 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Mobile menu button */}
                        <div className="flex items-center md:hidden">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-rose-600 hover:bg-gray-100 focus:outline-none transition-colors"
                            >
                                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white border-b border-gray-200 absolute w-full shadow-lg">
                        <div className="px-4 pt-2 pb-4 space-y-1">
                            <form onSubmit={handleSearch} className="mt-2 mb-4 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search size={18} className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search updates..."
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </form>
                            <Link to="/map" className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-rose-600 hover:bg-gray-50">Map</Link>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full bg-[#f8fafc] flex justify-center overflow-x-hidden">
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 overflow-x-hidden">
                    <Outlet />
                </div>
            </main>

            <ChatAssistant />

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-auto w-full">
                <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <div className="md:flex md:items-center md:justify-between">
                        <div className="flex justify-center md:justify-start space-x-6 md:order-2">
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                                Powered by NewsData.io & <Globe size={14} className="text-blue-500" /> Intelligence
                            </span>
                        </div>
                        <div className="mt-8 md:mt-0 md:order-1">
                            <p className="text-center md:text-left text-sm text-gray-500 font-medium">
                                &copy; 2026 WarPulse. All rights reserved. Delivering critical conflict updates.
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
