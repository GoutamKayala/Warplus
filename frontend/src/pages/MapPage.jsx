import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import { Target, ChevronLeft, ShieldAlert, Activity, AlertTriangle, Loader2, MapPin, Crosshair, Radio, Zap } from 'lucide-react';

// Use Leaflet's default icon paths to avoid Vite import errors
L.Icon.Default.mergeOptions({
    iconUrl: L.Icon.Default.imagePath + '/marker-icon.png',
    shadowUrl: L.Icon.Default.imagePath + '/marker-shadow.png',
});

const SEVERITY_META = {
    in_war: { label: 'In War', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', text: '#991b1b', range: 100000 },
    highly: { label: 'Highly Affected', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3', text: '#9f1239', range: 70000 },
    moderate: { label: 'Moderate Impact', color: '#d97706', bg: '#fffbeb', border: '#fde68a', text: '#92400e', range: 40000 },
    low: { label: 'Low Impact', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', text: '#0c4a6e', range: 20000 },
    participating: { label: 'Participating', color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe', text: '#4c1d95', range: 15000 },
};
const SORT_ORDER = { in_war: 0, highly: 1, moderate: 2, participating: 3, low: 4 };

function MapController({ flyTarget }) {
    const map = useMap();
    useEffect(() => {
        if (flyTarget) map.flyTo(flyTarget.position, 9, { duration: 2.5, easeLinearity: 0.25 });
    }, [flyTarget, map]);
    return null;
}

function getMarkerIcon(severity) {
    const meta = SEVERITY_META[severity] || SEVERITY_META.low;
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;inset:0;border-radius:50%;background:${meta.color};opacity:0.3;animation:warpulse 1.5s ease-in-out infinite;"></div>
            <div style="width:16px;height:16px;border-radius:50%;background:${meta.color};border:2px solid white;box-shadow:0 0 15px ${meta.color};position:relative;z-index:1;"></div>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
}

const MapPage = () => {
    const navigate = useNavigate();
    const [hotspots, setHotspots] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [scanProgress, setScanProgress] = useState(0);
    const [flyTarget, setFlyTarget] = useState(null);
    const [activeSpot, setActiveSpot] = useState(null);
    const [livePings, setLivePings] = useState([]);
    const [autoTrack, setAutoTrack] = useState(false);
    const autoTrackRef = useRef(false);

    const toggleAutoTrack = () => {
        autoTrackRef.current = !autoTrackRef.current;
        setAutoTrack(autoTrackRef.current);
    };

    const fetchHotspots = async () => {
        try {
            const API_BASE_URL = import.meta.env.VITE_API_URL;
            if (!API_BASE_URL) throw new Error("VITE_API_URL not defined");

            const response = await axios.get(`${API_BASE_URL}/api/hotspots`);
            if (Array.isArray(response.data) && response.data.length > 0) {
                setHotspots(response.data);
                setLastUpdated(new Date());
            }
        } catch (err) {
            console.error('Failed to fetch hotspots:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHotspots();

        // Moderate-frequency polling for main hotspots (every 30 seconds since they change rarely)
        const pollInterval = setInterval(fetchHotspots, 30000);

        // High-frequency polling for simulated LIVE RADAR PINGS (every 1 second)
        const radarInterval = setInterval(async () => {
            try {
                const API_BASE_URL = import.meta.env.VITE_API_URL;
                if (!API_BASE_URL) return;

                const response = await axios.get(`${API_BASE_URL}/api/hotspots/live-radar`);
                if (Array.isArray(response.data)) {
                    // Append new pings and filter out any older than 5 seconds
                    setLivePings(prev => {
                        const now = Date.now();
                        const active = [...prev, ...response.data].filter(p => now - p.timestamp < 5000);
                        // Deduplicate by ID
                        const unique = new Map(active.map(p => [p.id, p]));
                        return Array.from(unique.values());
                    });

                    if (autoTrackRef.current && response.data.length > 0) {
                        const latestPing = response.data[response.data.length - 1];
                        setFlyTarget({ position: latestPing.position, id: Math.random() });
                    }
                }
            } catch (err) { }
        }, 1000);

        // 1-second local drift for hotspots to simulate live troop/asset movement
        const driftInterval = setInterval(() => {
            setHotspots(prev => prev.map(spot => ({
                ...spot,
                position: [
                    spot.position[0] + (Math.random() - 0.5) * 0.005,
                    spot.position[1] + (Math.random() - 0.5) * 0.005
                ]
            })));
        }, 1000);

        // Visual scanning simulation for the sidebar
        const scanInterval = setInterval(() => {
            setIsScanning(true);
            setScanProgress(p => (p + 1) % 100);
            setTimeout(() => setIsScanning(false), 300);
        }, 800);

        return () => {
            clearInterval(pollInterval);
            clearInterval(radarInterval);
            clearInterval(scanInterval);
            clearInterval(driftInterval);
        };
    }, []);

    const handleSpotClick = (spot) => {
        setActiveSpot(spot);
        setFlyTarget({ position: spot.position, id: Math.random() });
    };

    const sorted = [...hotspots].sort((a, b) =>
        (SORT_ORDER[a.severity] ?? 99) - (SORT_ORDER[b.severity] ?? 99)
    );

    const statCounts = {
        in_war: hotspots.filter(h => h.severity === 'in_war').length,
        highly: hotspots.filter(h => h.severity === 'highly').length,
        participating: hotspots.filter(h => h.severity === 'participating').length,
    };

    return (
        <div className="w-full flex flex-col gap-4 md:gap-6">
            {/* ─── Header ─── */}
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 md:p-6 bg-gray-900 rounded-2xl md:rounded-[28px] border border-gray-800 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-rose-950/30 via-transparent to-transparent pointer-events-none" />
                <div className="relative flex flex-col gap-2">
                    <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-rose-400 transition-colors w-fit group text-xs font-bold uppercase tracking-widest">
                        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Withdraw
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-600/20 border border-rose-600/30 rounded-xl">
                            <Target className="text-rose-400" size={20} />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase">
                                War<span className="text-rose-500">Map</span>
                            </h1>
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Live Geospatial Intelligence</p>
                        </div>
                    </div>
                </div>
                <div className="relative flex items-center gap-2 flex-wrap">
                    <button
                        onClick={toggleAutoTrack}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${autoTrack ? 'bg-rose-500/20 border-rose-500/50 text-rose-300' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                    >
                        <Crosshair size={11} className={autoTrack ? 'animate-pulse' : ''} />
                        <span className="text-[10px] font-black uppercase tracking-wider">
                            Auto-Track {autoTrack ? 'ON' : 'OFF'}
                        </span>
                    </button>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-full">
                        <Radio size={11} className="text-rose-400 animate-pulse" />
                        <span className="text-[10px] font-black text-rose-300 uppercase tracking-wider">Live Intel</span>
                    </div>
                    {lastUpdated && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
                            <Activity size={11} className="text-gray-400" />
                            <span className="text-[10px] font-bold text-gray-400">{lastUpdated.toLocaleTimeString()}</span>
                        </div>
                    )}
                    <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
                        <span className="text-[10px] font-black text-gray-400">{hotspots.length} Sectors</span>
                    </div>
                </div>
            </div>

            {/* ─── Main Grid: Map + Sidebar ─── */}
            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-6">

                {/* ─── MAP ─── */}
                <div
                    className="lg:col-span-2 rounded-2xl md:rounded-[28px] overflow-hidden shadow-2xl border-4 md:border-[6px] border-white ring-1 ring-gray-200 relative bg-gray-900"
                    style={{ height: '70vh', minHeight: '400px', maxHeight: '700px' }}
                >
                    {isLoading && (
                        <div className="absolute inset-0 z-50 bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-3">
                            <Loader2 className="animate-spin text-rose-500" size={36} />
                            <span className="font-black text-xs uppercase tracking-widest text-rose-300">Calibrating Satellite...</span>
                        </div>
                    )}

                    <MapContainer
                        center={[30, 10]}
                        zoom={2}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={true}
                    >
                        <MapController flyTarget={flyTarget} />

                        <LayersControl position="topright">
                            {/* Google Satellite - Real buildings, trees, terrain */}
                            <LayersControl.BaseLayer checked name="🛰 Satellite HD (Google)">
                                <TileLayer
                                    url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                                    attribution="&copy; Google Maps"
                                    maxZoom={21}
                                    maxNativeZoom={21}
                                />
                            </LayersControl.BaseLayer>

                            {/* Google Hybrid - Satellite + Labels */}
                            <LayersControl.BaseLayer name="🛰 Satellite + Labels">
                                <TileLayer
                                    url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                                    attribution="&copy; Google Maps"
                                    maxZoom={21}
                                    maxNativeZoom={21}
                                />
                            </LayersControl.BaseLayer>

                            {/* Tactical Dark */}
                            <LayersControl.BaseLayer name="⚫ Tactical Dark">
                                <TileLayer
                                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                    attribution="&copy; CARTO"
                                    maxZoom={20}
                                />
                            </LayersControl.BaseLayer>

                            {/* Street Map */}
                            <LayersControl.BaseLayer name="🗺 Street Map">
                                <TileLayer
                                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                    attribution="&copy; CARTO"
                                    maxZoom={20}
                                />
                            </LayersControl.BaseLayer>
                        </LayersControl>

                        {hotspots.map((spot, idx) => {
                            const meta = SEVERITY_META[spot.severity] || SEVERITY_META.low;
                            const isActive = activeSpot?.name === spot.name;
                            return (
                                <React.Fragment key={idx}>
                                    {/* Affected Area Range Circle */}
                                    <Circle
                                        center={spot.position}
                                        pathOptions={{
                                            fillColor: meta.color,
                                            fillOpacity: isActive ? 0.4 : 0.2,
                                            color: meta.color,
                                            weight: isActive ? 3 : 1.5,
                                            dashArray: isActive ? '' : '5, 8'
                                        }}
                                        radius={meta.range}
                                    >
                                        <Popup>
                                            <div className="text-[10px] font-black uppercase text-rose-500">
                                                {meta.label} Zone (${(meta.range / 1000).toFixed(0)}km)
                                            </div>
                                        </Popup>
                                    </Circle>

                                    <Marker
                                        position={spot.position}
                                        icon={getMarkerIcon(spot.severity)}
                                        eventHandlers={{
                                            click: () => setActiveSpot(spot)
                                        }}
                                    >
                                        <Popup className="tactical-popup" maxWidth={240}>
                                            <div className="p-2.5 min-w-[200px]">
                                                <span style={{
                                                    display: 'inline-block',
                                                    background: meta.color,
                                                    color: 'white',
                                                    fontSize: '9px',
                                                    fontWeight: '900',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.1em',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    marginBottom: '8px'
                                                }}>
                                                    {meta.label}
                                                </span>
                                                <h4 style={{ color: 'white', fontWeight: '900', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 2px' }}>{spot.name}</h4>
                                                <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>{spot.country}</p>

                                                {spot.affected && (
                                                    <div className="mb-2 p-1.5 bg-white/5 rounded-lg border border-white/10">
                                                        <p className="text-[8px] font-black text-rose-400 uppercase tracking-widest mb-0.5">Affected Assets</p>
                                                        <p className="text-[10px] font-bold text-gray-200 uppercase">{spot.affected}</p>
                                                    </div>
                                                )}

                                                <p style={{ color: '#d1d5db', fontSize: '11px', lineHeight: '1.4', fontWeight: '500', margin: 0 }}>{spot.description}</p>
                                                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', color: '#6b7280', fontSize: '9px', fontFamily: 'monospace', fontWeight: '700' }}>
                                                    {spot.position[0].toFixed(2)}°N, {spot.position[1].toFixed(2)}°E
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                </React.Fragment>
                            );
                        })}

                        {/* LIVE PING LAYER */}
                        {livePings.map(ping => {
                            const meta = SEVERITY_META[ping.severity] || SEVERITY_META.low;
                            const pingIcon = L.divIcon({
                                className: 'custom-ping',
                                html: `<div style="
                                    width: 12px; height: 12px; border-radius: 50%;
                                    background: ${meta.color}; box-shadow: 0 0 10px ${meta.color};
                                    position: relative;
                                ">
                                    <div style="
                                        position: absolute; inset: -15px; border-radius: 50%;
                                        border: 2px solid ${meta.color};
                                        animation: ping-expand 1.5s ease-out infinite;
                                    "></div>
                                </div>`,
                                iconSize: [12, 12],
                                iconAnchor: [6, 6]
                            });

                            return (
                                <Marker key={ping.id} position={ping.position} icon={pingIcon}>
                                    <Popup className="tactical-popup" maxWidth={180}>
                                        <div className="p-2 text-center">
                                            <span style={{ color: meta.color, fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>Live Radar Contact</span>
                                            <div style={{ color: 'white', fontSize: '11px', fontWeight: '700', marginTop: '4px' }}>{ping.type}</div>
                                            <div style={{ color: '#9ca3af', fontSize: '9px', fontFamily: 'monospace', marginTop: '4px' }}>
                                                {ping.position[0].toFixed(4)}°, {ping.position[1].toFixed(4)}°
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>

                    {/* Severity Legend */}
                    <div className="absolute bottom-3 left-3 z-[1000] bg-gray-900/95 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-2xl">
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2">Severity</p>
                        <div className="flex flex-col gap-1.5">
                            {Object.entries(SEVERITY_META).map(([key, meta]) => (
                                <div key={key} className="flex items-center gap-1.5">
                                    <div style={{ background: meta.color }} className="w-2 h-2 rounded-full flex-shrink-0" />
                                    <span className="text-[9px] font-bold text-gray-300">{meta.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ─── INTELLIGENCE BRIEFING ─── */}
                <div className="flex flex-col bg-white rounded-2xl md:rounded-[28px] border border-gray-100 shadow-sm overflow-hidden" style={{ height: '70vh', minHeight: '400px', maxHeight: '700px' }}>
                    {/* Header */}
                    <div className="px-4 md:px-6 pt-4 md:pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="p-1.5 bg-rose-50 border border-rose-100 rounded-lg relative overflow-hidden">
                                <ShieldAlert className="text-rose-600 relative z-10" size={16} />
                                {isScanning && (
                                    <div className="absolute inset-0 bg-rose-600/20 animate-ping opacity-30" />
                                )}
                            </div>
                            <h2 className="text-base font-black text-gray-900 uppercase tracking-tight">Active Intel Radar</h2>
                            <div className="ml-auto px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest animate-pulse">Syncing</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            {lastUpdated ? (
                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                    <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                                    SEC-INTEL LIVE · {lastUpdated.toLocaleTimeString()}
                                </div>
                            ) : (
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Acquiring Sat...</div>
                            )}
                            <div className="flex flex-col items-end">
                                <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-rose-500 transition-all duration-300 ease-linear"
                                        style={{ width: `${scanProgress}%` }}
                                    />
                                </div>
                                <span className="text-[7px] font-black text-gray-300 uppercase mt-0.5">Scan Density</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    {!isLoading && hotspots.length > 0 && (
                        <div className="px-4 md:px-5 py-2.5 border-b border-gray-50 flex-shrink-0 grid grid-cols-3 gap-1.5">
                            {[
                                { key: 'in_war', label: 'In War' },
                                { key: 'highly', label: 'High Risk' },
                                { key: 'participating', label: 'Mobilizing' },
                            ].map(stat => (
                                <div key={stat.key} className="text-center p-1.5 rounded-xl" style={{ background: SEVERITY_META[stat.key].bg }}>
                                    <div className="text-lg font-black" style={{ color: SEVERITY_META[stat.key].color }}>{statCounts[stat.key]}</div>
                                    <div className="text-[7px] font-black uppercase tracking-wide leading-tight" style={{ color: SEVERITY_META[stat.key].text }}>{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* List */}
                    <div className="flex-1 overflow-y-auto px-3 md:px-4 py-3 space-y-2 custom-scrollbar">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 py-10">
                                <Loader2 className="animate-spin text-rose-500" size={28} />
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Extracting Intel...</p>
                            </div>
                        ) : hotspots.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 py-10 text-center px-4">
                                <AlertTriangle className="text-gray-300" size={32} />
                                <p className="font-bold text-gray-400 uppercase text-xs tracking-widest">No Active Hotspots</p>
                            </div>
                        ) : sorted.map((spot, i) => {
                            const meta = SEVERITY_META[spot.severity] || SEVERITY_META.low;
                            const isActive = activeSpot?.name === spot.name;
                            return (
                                <button
                                    key={i}
                                    onClick={() => handleSpotClick(spot)}
                                    className="w-full text-left rounded-xl border-2 transition-all duration-200 overflow-hidden group focus:outline-none"
                                    style={{
                                        borderColor: isActive ? meta.color : 'transparent',
                                        background: isActive ? meta.bg : '#f9fafb',
                                    }}
                                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = meta.bg; e.currentTarget.style.borderColor = meta.border; } }}
                                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = 'transparent'; } }}
                                >
                                    <div className="p-3">
                                        {/* Top: Badge + Country */}
                                        <div className="flex items-start justify-between gap-1.5 mb-1.5">
                                            <span
                                                className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex-shrink-0"
                                                style={{ background: meta.color, color: 'white' }}
                                            >
                                                {meta.label}
                                            </span>
                                            <div className="flex items-center gap-1 text-gray-400 flex-shrink-0">
                                                <MapPin size={9} />
                                                <span className="text-[9px] font-bold truncate max-w-[80px]">{spot.country}</span>
                                            </div>
                                        </div>

                                        {/* Place Name */}
                                        <h3
                                            className="text-xs font-black uppercase tracking-tight mb-1 transition-colors leading-snug"
                                            style={{ color: isActive ? meta.color : '#111827' }}
                                        >
                                            {spot.name}
                                        </h3>

                                        {/* Description */}
                                        <p className="text-[10px] text-gray-500 font-medium leading-relaxed mb-1.5">
                                            {spot.description}
                                        </p>

                                        {/* Affected Assets Tag */}
                                        {spot.affected && (
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                <span className="text-[7px] font-black bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded border border-gray-200 uppercase tracking-tighter">
                                                    Target: {spot.affected}
                                                </span>
                                            </div>
                                        )}

                                        {/* Footer: Coords + Jump hint */}
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: meta.border }}>
                                            <div className="flex items-center gap-1 text-gray-400">
                                                <Crosshair size={9} />
                                                <span className="text-[8px] font-bold font-mono">
                                                    {spot.position[0].toFixed(1)}°, {spot.position[1].toFixed(1)}°
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Zap size={9} style={{ color: meta.color }} />
                                                <span className="text-[8px] font-black uppercase" style={{ color: meta.color }}>Scan</span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes warpulse {
                    0%, 100% { transform: scale(1); opacity: 0.2; }
                    50% { transform: scale(2.2); opacity: 0.1; }
                }
                @keyframes ping-expand {
                    0% { transform: scale(0.5); opacity: 1; }
                    100% { transform: scale(2); opacity: 0; }
                }
                .tactical-popup .leaflet-popup-content-wrapper {
                    background: #111827 !important;
                    color: white !important;
                    border-radius: 14px !important;
                    border: 1px solid rgba(255,255,255,0.1) !important;
                    padding: 0 !important;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.5) !important;
                }
                .tactical-popup .leaflet-popup-tip { background: #111827 !important; }
                .tactical-popup .leaflet-popup-content { margin: 0 !important; }
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .leaflet-control-layers {
                    border-radius: 12px !important;
                    border: 1px solid rgba(0,0,0,0.08) !important;
                    font-weight: 700 !important;
                    font-size: 11px !important;
                    padding: 4px !important;
                }
                .leaflet-control-layers-selector { margin-right: 6px !important; }
                .leaflet-container { font-family: inherit !important; }
            `}} />
        </div>
    );
};

export default MapPage;
