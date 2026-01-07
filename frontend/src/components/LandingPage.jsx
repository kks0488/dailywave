import React, { useEffect } from 'react';
import { 
    ArrowRight, Check, Layout, Smartphone, 
    RefreshCw, Layers, Zap, Command, Shield 
} from 'lucide-react';
import './LandingPage.css';

const LandingPage = () => {
    useEffect(() => {
        // Ensure we start at the top
        window.scrollTo(0, 0);
    }, []);

    const features = [
        {
            icon: <Layout className="text-white" size={28} />,
            color: 'bg-gradient-blue',
            title: "Visual Pipelines",
            desc: "Organize workflows in Kanban-style boards. Drag, drop, and visualize your progress with satisfying physics."
        },
        {
            icon: <RefreshCw className="text-white" size={28} />,
            color: 'bg-gradient-purple',
            title: "Daily Routines",
            desc: "Smart checklists that adapt to your morning and evening rhythms. Never miss a beat in your daily schedule."
        },
        {
            icon: <Smartphone className="text-white" size={28} />,
            color: 'bg-gradient-orange',
            title: "Multi-platform Sync",
            desc: "Seamlessly switch between Web, iOS, and Android. Your flow stays consistent wherever you are."
        },
        {
            icon: <Zap className="text-white" size={28} />,
            color: 'bg-gradient-green',
            title: "Real-time Action",
            desc: "Powered by Supabase for instant updates. Collaborate with your team without refresh delays."
        }
    ];

    const pricing = [
        {
            name: "Free",
            price: "$0",
            period: "/ forever",
            features: ["3 Pipelines", "Basic Routines", "7-day History", "Web Access"],
            cta: "Get Started",
            primary: false
        },
        {
            name: "Pro",
            price: "$9",
            period: "/ month",
            features: ["Unlimited Pipelines", "Advanced Analytics", "Priority Support", "Custom Themes", "API Access"],
            cta: "Try Free for 14 Days",
            primary: true,
            badge: "Most Popular"
        },
        {
            name: "Team",
            price: "$19",
            period: "/ user",
            features: ["Collaborative Workspaces", "Admin Controls", "SSO Integration", "Audit Logs", "Dedicated Manager"],
            cta: "Contact Sales",
            primary: false
        }
    ];

    return (
        <div className="landing-page-container">
            {/* Navigation */}
            <nav className="landing-nav">
                <div className="landing-logo">
                    <Command size={24} strokeWidth={3} className="text-[#0A84FF]" />
                    DAILYWAVE
                </div>
                <div className="landing-nav-links">
                    <a href="#features" className="landing-nav-link">Features</a>
                    <a href="#testimonials" className="landing-nav-link">Testimonials</a>
                    <a href="#pricing" className="landing-nav-link">Pricing</a>
                    <a href="#" className="landing-nav-link" style={{ fontWeight: 600 }}>Login</a>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="landing-hero">
                <div className="hero-wave-bg">
                    <div className="wave-shape"></div>
                    <div className="wave-shape"></div>
                </div>
                
                <div className="hero-badge">
                    <span className="dot active" style={{width: 8, height: 8, background: '#0A84FF', borderRadius: '50%'}}></span>
                    v2.0 is now live
                </div>
                
                <h1 className="hero-title">
                    Transform your daily chaos into a <br/>
                    <span style={{ color: '#0A84FF' }}>flowing rhythm</span>
                </h1>
                
                <p className="hero-subtitle">
                    The workflow management tool designed for creative minds. 
                    Structure your habits, visualize your goals, and find your daily flow state.
                </p>
                
                <div className="hero-cta-group">
                    <button className="btn-primary">
                        Get Started Free
                    </button>
                    <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        Watch Demo <ArrowRight size={16} />
                    </button>
                </div>
            </header>

            {/* Features Grid */}
            <section id="features" className="features-section">
                <div className="section-header">
                    <span className="section-eyebrow">Features</span>
                    <h2 className="section-title">Designed for flow state</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Tools that get out of your way and let you work.</p>
                </div>
                
                <div className="features-grid">
                    {features.map((f, idx) => (
                        <div key={idx} className="feature-card">
                            <div className={`feature-icon ${f.color}`}>
                                {f.icon}
                            </div>
                            <h3>{f.title}</h3>
                            <p>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Social Proof */}
            <section id="testimonials" className="social-proof-section">
                <div className="section-header">
                    <span className="section-eyebrow">Community</span>
                    <h2 className="section-title">Loved by thousands</h2>
                </div>
                
                <div className="testimonials-grid">
                    {[
                        { name: "Sarah J.", role: "Product Designer", quote: "DailyWave completely changed how I start my mornings. The visual pipelines are a game changer for my ADHD." },
                        { name: "Mike T.", role: "Indie Developer", quote: "Finally, a workflow tool that feels like a native Apple app. Fast, beautiful, and intuitive." },
                        { name: "Elena R.", role: "Creative Director", quote: "The focus mode helps me ship faster without getting overwhelmed. It's essential software." }
                    ].map((t, i) => (
                        <div key={i} className="testimonial-card">
                            <p className="quote">"{t.quote}"</p>
                            <div className="user-profile">
                                <div className="avatar">{t.name[0]}</div>
                                <div className="user-info">
                                    <h4>{t.name}</h4>
                                    <span>{t.role}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="pricing-section">
                <div className="section-header">
                    <span className="section-eyebrow">Pricing</span>
                    <h2 className="section-title">Simple, transparent pricing</h2>
                </div>
                
                <div className="pricing-grid">
                    {pricing.map((p, idx) => (
                        <div key={idx} className={`pricing-card ${p.primary ? 'popular' : ''}`}>
                            {p.badge && <div className="popular-badge">{p.badge}</div>}
                            <h3>{p.name}</h3>
                            <div className="price-lockup">
                                <span className="price">{p.price}</span>
                                <span className="period">{p.period}</span>
                            </div>
                            
                            <ul className="features-list">
                                {p.features.map((feat, i) => (
                                    <li key={i}>
                                        <Check size={16} color="#0A84FF" strokeWidth={3} />
                                        {feat}
                                    </li>
                                ))}
                            </ul>
                            
                            <button className={p.primary ? 'btn-primary' : 'btn-secondary'} style={{ width: '100%' }}>
                                {p.cta}
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-content">
                    <div className="footer-col" style={{ maxWidth: 300 }}>
                        <div className="landing-logo" style={{ marginBottom: 20 }}>
                            <Command size={20} className="text-[#0A84FF]" />
                            DAILYWAVE
                        </div>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: 14 }}>
                            Crafting tools for the modern creative. <br/>
                            San Francisco, CA.
                        </p>
                    </div>
                    
                    <div className="footer-col">
                        <h4>Product</h4>
                        <ul>
                            <li><a href="#">Features</a></li>
                            <li><a href="#">Integrations</a></li>
                            <li><a href="#">Changelog</a></li>
                            <li><a href="#">Docs</a></li>
                        </ul>
                    </div>
                    
                    <div className="footer-col">
                        <h4>Company</h4>
                        <ul>
                            <li><a href="#">About</a></li>
                            <li><a href="#">Careers</a></li>
                            <li><a href="#">Blog</a></li>
                            <li><a href="#">Twitter</a></li>
                        </ul>
                    </div>
                    
                    <div className="footer-col">
                        <h4>Legal</h4>
                        <ul>
                            <li><a href="#">Privacy</a></li>
                            <li><a href="#">Terms</a></li>
                            <li><a href="#">Security</a></li>
                        </ul>
                    </div>
                </div>
                
                <div className="footer-bottom">
                    <span>© 2024 DailyWave Inc. All rights reserved.</span>
                    <div style={{ display: 'flex', gap: 24 }}>
                        <Shield size={16} />
                        <span>Encrypted & Secure</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
