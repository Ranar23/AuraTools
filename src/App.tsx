/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TOOLS_LIST, CATEGORIES, Tool } from './data/tools';
import ToolWorkspace, { DynamicIcon } from './components/ToolWorkspace';

export default function App() {
  // Page routing state ('home' | 'about' | 'contact' | 'privacy' | 'disclaimer' | 'tool-id')
  const [currentPath, setCurrentPath] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  // Pagination for all tools grid
  const [currentPage, setCurrentPage] = useState(1);
  const toolsPerPage = 12;

  // Contact form state
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Sync state with URL Hash on Mount for complete deep-linking support!
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/tool/')) {
        const toolId = hash.replace('#/tool/', '');
        setCurrentPath(`tool-${toolId}`);
      } else if (hash === '#/about') {
        setCurrentPath('about');
      } else if (hash === '#/contact') {
        setCurrentPath('contact');
      } else if (hash === '#/privacy') {
        setCurrentPath('privacy');
      } else if (hash === '#/disclaimer') {
        setCurrentPath('disclaimer');
      } else {
        setCurrentPath('home');
      }
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Trigger on initial load

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash dynamically when page state changes
  const navigateTo = (path: string) => {
    setMegaMenuOpen(false);
    setMobileMenuOpen(false);
    setSearchQuery('');
    
    if (path === 'home') {
      window.location.hash = '#/';
    } else if (path === 'about') {
      window.location.hash = '#/about';
    } else if (path === 'contact') {
      window.location.hash = '#/contact';
    } else if (path === 'privacy') {
      window.location.hash = '#/privacy';
    } else if (path === 'disclaimer') {
      window.location.hash = '#/disclaimer';
    } else if (path.startsWith('tool-')) {
      const toolId = path.replace('tool-', '');
      window.location.hash = `#/tool/${toolId}`;
    }
  };

  // Filter tools based on search and selected tab
  const filteredTools = useMemo(() => {
    return TOOLS_LIST.filter(tool => {
      const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            tool.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            tool.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeCategoryFilter === 'all' || tool.category === activeCategoryFilter;
      return matchesSearch && matchesTab;
    });
  }, [searchQuery, activeCategoryFilter]);

  // Handle pagination values
  const paginatedTools = useMemo(() => {
    const startIdx = (currentPage - 1) * toolsPerPage;
    return filteredTools.slice(startIdx, startIdx + toolsPerPage);
  }, [filteredTools, currentPage]);

  const totalPages = Math.ceil(filteredTools.length / toolsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1); // Reset page selection on search/filter updates
  }, [searchQuery, activeCategoryFilter]);

  // Handle Newsletter
  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim() !== '') {
      setNewsletterSubscribed(true);
      setTimeout(() => {
        setNewsletterSubscribed(false);
        setNewsletterEmail('');
      }, 4000);
    }
  };

  // Contact form submission
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setContactForm({ name: '', email: '', subject: '', message: '' });
    }, 4000);
  };

  // Dedicated Tool details if active
  const activeTool = useMemo(() => {
    if (currentPath.startsWith('tool-')) {
      const id = currentPath.substring(5);
      return TOOLS_LIST.find(t => t.id === id) || null;
    }
    return null;
  }, [currentPath]);

  return (
    <div className="min-h-screen text-slate-100 font-sans selection:bg-blue-600 selection:text-white relative overflow-x-hidden flex flex-col" style={{ background: 'radial-gradient(circle at top right, #1e3a8a, #020617), radial-gradient(circle at bottom left, #001233, #020617)' }}>
      {/* Background Ambience Glow elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] right-[10%] w-[450px] h-[450px] bg-indigo-600/5 rounded-full blur-[145px] pointer-events-none" />

      {/* GLOBAL HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18">
            {/* Logo */}
            <div
              onClick={() => navigateTo('home')}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition">
                <Icons.Cpu className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <span className="font-display font-black text-xl text-white tracking-tight group-hover:text-blue-400 transition">
                  AuraTools
                </span>
                <span className="block text-[9px] text-slate-400 font-sans tracking-widest uppercase font-bold leading-none">
                  Ultimate SaaS Suite
                </span>
              </div>
            </div>

            {/* Navigation menu */}
            <nav className="hidden lg:flex items-center gap-6">
              <span
                onClick={() => navigateTo('home')}
                className={`text-sm font-semibold cursor-pointer transition ${
                  currentPath === 'home' ? 'text-blue-400' : 'text-slate-300 hover:text-blue-400'
                }`}
              >
                Home
              </span>

              {/* Mega Menu Selector */}
              <div
                className="relative"
                onMouseEnter={() => setMegaMenuOpen(true)}
                onMouseLeave={() => setMegaMenuOpen(false)}
              >
                <button className="flex items-center gap-1 text-sm font-semibold text-slate-350 hover:text-white py-2 focus:outline-none">
                  <span>Tool Categories</span>
                  <Icons.ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${megaMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {megaMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute left-1/2 -translate-x-1/2 top-full w-[800px] bg-slate-950/90 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl"
                    >
                      <div className="grid grid-cols-4 gap-6">
                        {Object.entries(CATEGORIES).map(([catKey, catValue]) => {
                          const categoryTools = TOOLS_LIST.filter(t => t.category === catKey).slice(0, 4);
                          return (
                            <div key={catKey} className="space-y-4">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${catValue.themeColor}`} />
                                <span className="font-display font-bold text-sm text-white uppercase tracking-wider">{catValue.title}</span>
                              </div>
                              <ul className="space-y-2">
                                {categoryTools.map(t => (
                                  <li key={t.id}>
                                    <span
                                      onClick={() => navigateTo(`tool-${t.id}`)}
                                      className="text-xs text-slate-400 hover:text-blue-400 cursor-pointer transition block truncate"
                                    >
                                      {t.name}
                                    </span>
                                  </li>
                                ))}
                                <li>
                                  <button
                                    onClick={() => {
                                      setActiveCategoryFilter(catKey);
                                      navigateTo('home');
                                      setMegaMenuOpen(false);
                                      setTimeout(() => {
                                        document.getElementById('tools-catalog')?.scrollIntoView({ behavior: 'smooth' });
                                      }, 100);
                                    }}
                                    className="text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 pt-1"
                                  >
                                    Explore All
                                    <Icons.ArrowRight className="w-3 h-3" />
                                  </button>
                                </li>
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <span
                onClick={() => navigateTo('about')}
                className={`text-sm font-semibold cursor-pointer transition ${
                  currentPath === 'about' ? 'text-blue-400' : 'text-slate-300 hover:text-blue-400'
                }`}
              >
                About Us
              </span>
              <span
                onClick={() => navigateTo('contact')}
                className={`text-sm font-semibold cursor-pointer transition ${
                  currentPath === 'contact' ? 'text-blue-400' : 'text-slate-300 hover:text-blue-400'
                }`}
              >
                Contact
              </span>
            </nav>

            {/* Header Right Workspace search controls */}
            <div className="hidden md:flex items-center gap-4">
              <div className="relative">
                <Icons.Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-300" />
                <input
                  type="text"
                  placeholder="Quick search..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (currentPath !== 'home') navigateTo('home');
                  }}
                  className="bg-white/10 border border-white/10 rounded-full text-xs py-2 px-9 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-md w-52 font-medium"
                />
              </div>
              <button
                onClick={() => {
                  navigateTo('home');
                  setTimeout(() => {
                    document.getElementById('tools-catalog')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-5 py-2.5 rounded-full transition shadow-lg shadow-blue-600/20"
              >
                Explore 190 Tools
              </button>
            </div>

            {/* Mobile Nav Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl border border-slate-800 text-slate-300 hover:text-white focus:outline-none"
            >
              <Icons.Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile menu expanded */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden bg-slate-900 border-t border-slate-800 overflow-hidden"
            >
              <div className="px-4 py-6 space-y-4">
                <span
                  onClick={() => navigateTo('home')}
                  className="block text-sm font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Home Directory
                </span>
                <span
                  onClick={() => navigateTo('about')}
                  className="block text-sm font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  About Corporate
                </span>
                <span
                  onClick={() => navigateTo('contact')}
                  className="block text-sm font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Technical Support Contact
                </span>
                <div className="pt-2">
                  <span className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-2">Primary Categories:</span>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(CATEGORIES).map(([catKey, catValue]) => (
                      <button
                        key={catKey}
                        onClick={() => {
                          setActiveCategoryFilter(catKey);
                          navigateTo('home');
                          setMobileMenuOpen(false);
                        }}
                        className="text-left bg-slate-950 p-3 rounded-lg text-xs font-medium hover:bg-blue-600/10 transition"
                      >
                        {catValue.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* CORE PAGES RENDER ROUTING */}
      <main className="flex-1">
        {currentPath === 'home' && (
          <div>
            {/* HERO SECTION */}
            <section className="relative overflow-hidden py-16 md:py-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  {/* Hero Left Content */}
                  <div className="space-y-6 text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/15 px-3 py-1 rounded-full text-blue-400 text-xs font-bold font-mono tracking-wide uppercase">
                      <Icons.Sparkles className="w-3.5 h-3.5" />
                      Secure Client-Side Sandbox Ecosystem
                    </div>
                    <h1 className="font-display font-extrabold text-4xl md:text-5xl lg:text-6xl text-white tracking-tight leading-none">
                      Modern Multi-Tool Suite for <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">Fast Swaps</span>
                    </h1>
                    <p className="text-slate-400 text-base md:text-lg max-w-xl leading-relaxed mx-auto lg:mx-0">
                      Access **190 secure, premium cloud tools** to resize images, merge PDFs, format databases, and transcribe files entirely offline within your web browser.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                      <button
                        onClick={() => document.getElementById('tools-catalog')?.scrollIntoView({ behavior: 'smooth' })}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3.5 rounded-xl transition duration-200 shadow-xl shadow-blue-500/15 flex items-center justify-center gap-2"
                      >
                        Explore Tools Directory
                        <Icons.ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setActiveCategoryFilter('image');
                          document.getElementById('tools-catalog')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="w-full sm:w-auto bg-slate-900 hover:bg-slate-850 text-slate-300 font-semibold px-8 py-3.5 rounded-xl border border-slate-800 transition flex items-center justify-center gap-2"
                      >
                        Popular Image Editors
                      </button>
                    </div>
                  </div>

                  {/* Hero Right: 3D-styled animated custom panels! */}
                  <div className="relative flex justify-center items-center h-[350px] overflow-hidden">
                    <div className="absolute w-[280px] h-[280px] bg-blue-500/2 rounded-full blur-[80px]" />
                    
                    {/* Floating Rotating Icon elements */}
                    <div className="relative w-full max-w-[340px] h-full flex justify-center items-center">
                      
                      {/* Icon 1: PDF Icon 3D Glass Card */}
                      <div className="absolute -left-1 md:left-4 z-10 animate-float-slow transition hover:scale-110">
                        <div className="backdrop-blur-md bg-slate-900/60 border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col items-center justify-center w-28 h-28 transform -rotate-12 hover:-rotate-0 transition-transform">
                          <Icons.FileText className="w-10 h-10 text-rose-500 mb-2 animate-glow-pulse" />
                          <span className="text-[10.5px] font-bold text-white font-display">Shiny 3D PDF</span>
                        </div>
                      </div>

                      {/* Icon 2: JPG Icon 3D Glass Card */}
                      <div className="absolute -right-1 md:right-4 z-20 animate-float-medium transition hover:scale-110">
                        <div className="backdrop-blur-md bg-slate-900/60 border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col items-center justify-center w-28 h-28 transform rotate-12 hover:rotate-0 transition-transform">
                          <Icons.Image className="w-10 h-10 text-emerald-400 mb-2 animate-glow-pulse" />
                          <span className="text-[10.5px] font-bold text-white font-display">Shiny 3D JPG</span>
                        </div>
                      </div>

                      {/* Center Core: Conversion Icon with spin logic */}
                      <div className="absolute z-30 animate-slow-spin-3d">
                        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-600/80 to-indigo-600/80 border border-white/20 rounded-full p-6 shadow-2xl flex items-center justify-center w-24 h-24">
                          <Icons.RefreshCw className="w-10 h-10 text-white animate-spin" style={{ animationDuration: '6s' }} />
                        </div>
                      </div>
                      
                      {/* Anchor Badge */}
                      <div className="absolute bottom-6 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-full px-5 py-2 text-[11px] font-mono font-bold tracking-tight text-blue-400 shadow-xl flex items-center gap-2">
                        <Icons.ShieldCheck className="w-4 h-4 text-emerald-400" />
                        100% SECURE SANDBOX ENGINES
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* HUB DIRECTORY SEARCH & CATEGORY FILTERS */}
            <section id="tools-catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-white/10">
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <h2 className="font-display font-extrabold text-2xl md:text-3xl text-white tracking-tight mb-2">
                      Browse Sifting Catalog
                    </h2>
                    <p className="text-sm text-slate-300 max-w-lg leading-relaxed">
                      Instant file processors. Use filters or search for specific formats (total 190 items).
                    </p>
                  </div>

                  {/* Directory Search controls */}
                  <div className="relative w-full md:w-80">
                    <Icons.Search className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-300" />
                    <input
                      type="text"
                      placeholder="Search from 190 tools..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/10 border border-white/10 rounded-full py-3 px-12 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-md font-medium placeholder:text-slate-300"
                    />
                  </div>
                </div>

                {/* Categories Tab selectors */}
                <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
                  <button
                    onClick={() => setActiveCategoryFilter('all')}
                    className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider transition ${
                      activeCategoryFilter === 'all'
                        ? 'bg-blue-600 border border-blue-500 text-white shadow-lg shadow-blue-600/20'
                        : 'bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    All Catalog Tools [{TOOLS_LIST.length}]
                  </button>
                  {Object.entries(CATEGORIES).map(([catKey, catValue]) => {
                    const count = TOOLS_LIST.filter(t => t.category === catKey).length;
                    return (
                      <button
                        key={catKey}
                        onClick={() => setActiveCategoryFilter(catKey)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider transition ${
                          activeCategoryFilter === catKey
                            ? 'bg-blue-600 border border-blue-500 text-white shadow-lg shadow-blue-600/20'
                            : 'bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10'
                        }`}
                      >
                        {catValue.title} [{count}]
                      </button>
                    );
                  })}
                </div>

                {/* TOOLS GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedTools.map((tool) => (
                    <div
                      key={tool.id}
                      onClick={() => navigateTo(`tool-${tool.id}`)}
                      className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.3)] backdrop-blur-md cursor-pointer transition-all duration-300 relative flex flex-col justify-between"
                    >
                      <div>
                        {/* Tool Icon */}
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${CATEGORIES[tool.category].themeColor} text-white flex items-center justify-center shadow-md mb-4 group-hover:scale-105 transition`}>
                          <DynamicIcon name={tool.icon} className="w-5 h-5" />
                        </div>
                        {/* Label Name */}
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-display font-bold text-lg text-white group-hover:text-blue-400 transition leading-snug">
                            {tool.name}
                          </h3>
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed line-clamp-2">
                          {tool.description}
                        </p>
                      </div>

                      <div className="border-t border-white/10 pt-4 mt-5 flex items-center justify-between">
                        <span className="text-[10px] bg-white/5 text-slate-300 border border-white/10 px-2 py-1 rounded font-mono font-bold leading-normal uppercase">
                          ID: #{tool.num}
                        </span>
                        <span className="text-xs font-bold text-blue-400 group-hover:text-blue-300 inline-flex items-center gap-1">
                          Open workspace
                          <Icons.ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Empty State */}
                {filteredTools.length === 0 && (
                  <div className="text-center py-16 bg-slate-900/10 border border-slate-850 rounded-2xl flex flex-col items-center">
                    <Icons.FileQuestion className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
                    <p className="text-slate-450 font-bold">No format utility matches your search query.</p>
                    <button
                      onClick={() => { setSearchQuery(''); setActiveCategoryFilter('all'); }}
                      className="mt-4 text-xs font-bold text-blue-500 hover:text-blue-400 underline"
                    >
                      Reset and display all
                    </button>
                  </div>
                )}

                {/* PAGINATION PANEL */}
                {filteredTools.length > toolsPerPage && (
                  <div className="flex items-center justify-between border-t border-slate-850 pt-6">
                    <span className="text-xs text-slate-450 font-medium">
                      Displaying indices {(currentPage - 1) * toolsPerPage + 1} - {Math.min(currentPage * toolsPerPage, filteredTools.length)} outlines of {filteredTools.length}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="bg-slate-900 hover:bg-slate-850 border border-slate-850 text-slate-350 disabled:opacity-40 p-2 text-xs font-bold rounded-lg transition"
                      >
                        Prev Panel
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="bg-slate-900 hover:bg-slate-850 border border-slate-850 text-slate-350 disabled:opacity-40 p-2 text-xs font-bold rounded-lg transition"
                      >
                        Next Panel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ACTIVE TOOL CONVERSIONS WORKSPACE */}
        {activeTool && (
          <ToolWorkspace tool={activeTool} onNavigateToTool={(id) => navigateTo(id ? `tool-${id}` : 'home')} />
        )}

        {/* DETAILED CORPORATE ABOUT US */}
        {currentPath === 'about' && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 animate-fade-in">
            <div className="text-center space-y-3">
              <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider font-mono">
                Corporate Foundations
              </span>
              <h1 className="font-display font-extrabold text-3xl md:text-5xl text-white tracking-tight">
                About AuraTools
              </h1>
              <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
                Empowering developers, administrators, designers, and authors with localized browser calculators and converters since 2026.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-y border-white/10 py-10">
              <div className="space-y-4">
                <h3 className="font-display font-bold text-xl text-white">Our Master Mission</h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  To eliminate processing friction across standard business platforms. We establish modular tools frameworks that replace bulky paid cloud applications, preserving local computing speeds. We believe that professional conversions must be universally accessible, free from subscription paywalls.
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="font-display font-bold text-xl text-white">The Zero-Trust Vision</h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Data breaches are highly prevalent in centralized server databases. AuraTools represents a zero-trust alternative. By coding compilers that run 100% inside client-side canvas matrices, your corporate spreadsheets, code variables, and private photos never cross open networks, protecting complete intellectual assets.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="font-display font-bold text-2xl text-center text-white">Key Architectural Foundations</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white/5 p-5 rounded-xl border border-white/10 backdrop-blur-md text-center space-y-3">
                  <Icons.Zap className="w-8 h-8 text-blue-400 mx-auto" />
                  <h4 className="font-display font-bold text-white text-sm">Responsive Speed</h4>
                  <p className="text-slate-300 text-[11px] leading-relaxed">Runs on local threads bypassing slow network uploads completely.</p>
                </div>
                <div className="bg-white/5 p-5 rounded-xl border border-white/10 backdrop-blur-md text-center space-y-3">
                  <Icons.Lock className="w-8 h-8 text-blue-400 mx-auto" />
                  <h4 className="font-display font-bold text-white text-sm">Absolute Security</h4>
                  <p className="text-slate-300 text-[11px] leading-relaxed">No tracking tags, and zero-storage rules. Files process natively.</p>
                </div>
                <div className="bg-white/5 p-5 rounded-xl border border-white/10 backdrop-blur-md text-center space-y-3">
                  <Icons.Layers className="w-8 h-8 text-blue-400 mx-auto" />
                  <h4 className="font-display font-bold text-white text-sm">Robust Breadth</h4>
                  <p className="text-slate-300 text-[11px] leading-relaxed">190 specialized portals covering images, PDFs, formats, and speech.</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECURE TECHNICAL SUPPORT CONTACT SECTION */}
        {currentPath === 'contact' && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-5 space-y-6">
                <div className="space-y-3">
                  <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider font-mono">
                    Administrative Desk
                  </span>
                  <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">
                    Get in touch
                  </h1>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    Have questions about our client-side conversions? Fill in the form and our technical team will contact you.
                  </p>
                </div>

                <div className="space-y-4 text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <Icons.Mail className="w-4 h-4 text-blue-500" />
                    <span className="text-slate-300">contact@auratools.com</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Icons.MapPin className="w-4 h-4 text-blue-500" />
                    <span className="text-slate-300">Cloud Run Sandboxed Nodes</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Icons.ShieldAlert className="w-4 h-4 text-blue-400" />
                    <span className="text-slate-300">System Status: Active and Fully Secured</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-white/5 border border-white/10 p-6 md:p-8 rounded-2xl backdrop-blur-xl">
                {contactSubmitted ? (
                  <div className="text-center py-12 space-y-3">
                    <Icons.CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                    <h3 className="font-display font-bold text-white text-lg">Message Received</h3>
                    <p className="text-xs text-slate-350">Our support engineers have queued your request. Reference code: SEC-2026</p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-300 mb-1 font-medium">Your Name</label>
                        <input
                          type="text"
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-300 mb-1 font-medium">Your Email</label>
                        <input
                          type="email"
                          required
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-md text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1 font-medium">Subject Topic</label>
                      <input
                        type="text"
                        required
                        value={contactForm.subject}
                        onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                        className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1 font-medium">Message Details (Limit 500 chars)</label>
                      <textarea
                        required
                        rows={4}
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-md text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition duration-200 shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2"
                    >
                      <Icons.Send className="w-4 h-4" />
                      Send Secure Message
                    </button>
                  </form>
                )}
              </div>
            </div>
          </section>
        )}

        {/* INTELLECTUAL PRIVACY POLICY PAGE */}
        {currentPath === 'privacy' && (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-6 animate-fade-in text-sm leading-relaxed text-slate-300">
            <h1 className="font-display font-extrabold text-3xl text-white mb-2 tracking-tight">Privacy Policy</h1>
            <p className="text-[11px] text-slate-450 font-mono">Last Updated: May 31, 2026</p>
            <p className="bg-white/5 border border-white/10 p-4 rounded-xl text-slate-300 text-xs backdrop-blur-md animate-pulse">
              This notice outlines our strict client-side sandboxing standard, detailing our zero-retention rules.
            </p>

            <h3 className="font-display font-semibold text-lg text-white pt-4">1. Complete Data Shielding</h3>
            <p>
              AuraTools operates on a strict isolated sandbox methodology. All components calculations (such as parsing codes, trimming media clips, rendering QR vectors, and reducing photographic file sizes) are handled locally via web workers. No files, metadata, credentials, or databases items are transferred over online networks.
            </p>

            <h3 className="font-display font-semibold text-lg text-white">2. Cookies Controls</h3>
            <p>
              Our platform does not use diagnostic tracking pixels, advertising target networks, or cookie profiles. We preserve temporary configurations (such as active category lists or page themes) purely within the client's `localStorage` threads for convenient site sessions.
            </p>

            <h3 className="font-display font-semibold text-lg text-white">3. Platform Integration Security</h3>
            <p>
              All links routing to external programs are processed within client sandboxing. We do not incorporate backend administrative data streams, preventing potential exposure to digital security threats.
            </p>
          </section>
        )}

        {/* COMPREHENSIVE DISCLAIMER PAGE */}
        {currentPath === 'disclaimer' && (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-6 animate-fade-in text-sm leading-relaxed text-slate-300">
            <h1 className="font-display font-extrabold text-3xl text-white mb-2 tracking-tight">Legal Disclaimer</h1>
            <p className="text-[11px] text-slate-450 font-mono">Effective Date: May 31, 2026</p>

            <h3 className="font-display font-semibold text-lg text-white pt-4">General Educational Limitation</h3>
            <p>
              The files, utilities, formatting codes, and transcription systems supplied on AuraTools represent general utility resources. We provide no direct warranties on complete accuracy of output results. All operations are conducted automatically under browser-native controls.
            </p>

            <h3 className="font-display font-semibold text-lg text-white">Security Limitation</h3>
            <p>
              Since calculations occur within the viewer's personal workspace, the user is solely accountable for assessing data integrity, copyright terms, and processing rights of private documents. AuraTools bears no responsibility for hardware overflows resulting from heavy file computations.
            </p>
          </section>
        )}
      </main>

      {/* GLOBAL FOOTER */}
      <footer className="bg-black/40 backdrop-blur-md border-t border-white/10 pt-16 pb-8 text-xs text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            
            {/* Column 1: Logo, Description, and Social Platform Gradients */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigateTo('home')}>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                  <Icons.Cpu className="w-4 h-4 text-white" />
                </div>
                <span className="font-display font-black text-lg text-white tracking-tight">AuraTools</span>
              </div>
              <p className="leading-relaxed text-slate-300">
                The ultimate premium SaaS hub featuring **190 secure local converters** processing files, codes, and transcripts safely in your browser.
              </p>
              
              {/* Specialized social links with EXACT specified hover coloring logic */}
              <div className="flex gap-3 pt-2">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all hover:bg-[#1877F2]/15 hover:border-[#1877F2]/60 hover:text-[#1877F2]"
                >
                  <Icons.Facebook className="w-4 h-4" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all hover:bg-gradient-to-tr hover:from-[#f9ce34] hover:via-[#ee2a7b] hover:to-[#6228d7] hover:border-pink-500/60 hover:text-white"
                >
                  <Icons.Instagram className="w-4 h-4" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all hover:bg-white/15 hover:text-white"
                >
                  <span className="font-extrabold font-mono text-[11px]">𝕏</span>
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all hover:bg-[#0A66C2]/15 hover:border-[#0A66C2]/60 hover:text-[#0A66C2]"
                >
                  <Icons.Linkedin className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Column 2: Popular Tools lists */}
            <div className="space-y-4">
              <h4 className="font-display font-bold text-white uppercase text-xs tracking-wider">Popular Sifters</h4>
              <ul className="space-y-2 text-slate-300">
                <li>
                  <span onClick={() => navigateTo('tool-image-compressor')} className="hover:text-blue-400 transition cursor-pointer">Image Compressor</span>
                </li>
                <li>
                  <span onClick={() => navigateTo('tool-qr-code-generator')} className="hover:text-blue-400 transition cursor-pointer">QR Code Generator</span>
                </li>
                <li>
                  <span onClick={() => navigateTo('tool-invoice-pdf-generator')} className="hover:text-blue-400 transition cursor-pointer">Invoice PDF Generator</span>
                </li>
                <li>
                  <span onClick={() => navigateTo('tool-json-formatter')} className="hover:text-blue-400 transition cursor-pointer">JSON Code Formatter</span>
                </li>
                <li>
                  <span onClick={() => navigateTo('tool-resume-pdf-builder')} className="hover:text-blue-400 transition cursor-pointer">ATS Resume Builder</span>
                </li>
              </ul>
            </div>

            {/* Column 3: Quick links */}
            <div className="space-y-4">
              <h4 className="font-display font-bold text-white uppercase text-xs tracking-wider">Quick Channels</h4>
              <ul className="space-y-2 text-slate-300">
                <li>
                  <span onClick={() => navigateTo('about')} className="hover:text-blue-400 transition cursor-pointer">About Foundations</span>
                </li>
                <li>
                  <span onClick={() => navigateTo('contact')} className="hover:text-blue-400 transition cursor-pointer">Technical Support desk</span>
                </li>
                <li>
                  <span onClick={() => navigateTo('privacy')} className="hover:text-blue-400 transition cursor-pointer">Privacy & Cookie policy</span>
                </li>
                <li>
                  <span onClick={() => navigateTo('disclaimer')} className="hover:text-blue-400 transition cursor-pointer">Product Disclaimer</span>
                </li>
              </ul>
            </div>

            {/* Column 4: Newsletter Form */}
            <div className="space-y-4 col-span-1">
              <h4 className="font-display font-bold text-white uppercase text-xs tracking-wider font-sans">Corporate Newsletter</h4>
              <p className="leading-relaxed text-slate-300">
                Stay updated on browser converter optimizations. Releases log delivered monthly.
              </p>
              {newsletterSubscribed ? (
                <div className="bg-emerald-950/40 text-emerald-400 p-3 rounded-lg border border-emerald-800/20 text-center font-bold font-sans backdrop-blur-md">
                  Subscribed Successfully!
                </div>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/10 px-3 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-md text-xs font-semibold placeholder:text-slate-300"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 px-3.5 py-2 rounded-lg text-white font-bold transition flex items-center justify-center shadow-lg shadow-blue-500/10"
                  >
                    Join
                  </button>
                </form>
              )}
            </div>

          </div>

          {/* Copyright Row */}
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400">
            <p>
              &copy; 2026 AuraTools. Built in absolute compliance with Google AI Workspace directives. All rights reserved.
            </p>
            <div className="flex gap-4 items-center font-mono text-[10px]">
              <span className="opacity-75">SSL SECURE_BROWSER</span>
              <div className="bg-white/5 px-2.5 py-1 rounded-md border border-white/10 text-slate-300 text-[10px] flex items-center gap-1.5 font-sans">
                Status: <span className="text-emerald-400 font-bold flex items-center gap-1">Online <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /></span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
