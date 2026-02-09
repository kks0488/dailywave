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
            title: "Chaos Dump",
            desc: "Dump everything on your mind. AI organizes the mess into clear, actionable next steps — so you don't have to."
        },
        {
            icon: <RefreshCw className="text-white" size={28} />,
            color: 'bg-gradient-purple',
            title: "Daily Routines",
            desc: "Morning and evening checklists that reset daily. Build consistency without overthinking what comes next."
        },
        {
            icon: <Smartphone className="text-white" size={28} />,
            color: 'bg-gradient-orange',
            title: "Works Everywhere",
            desc: "PWA that feels native on any device. Open it on your phone, tablet, or desktop — your flow follows you."
        },
        {
            icon: <Zap className="text-white" size={28} />,
            color: 'bg-gradient-green',
            title: "One Next Step",
            desc: "No overwhelm, no endless lists. AI picks the single most important thing to do right now, based on your energy."
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
                    One clear next step.<br/>
                    <span style={{ color: '#0A84FF' }}>Then the next.</span>
                </h1>

                <p className="hero-subtitle">
                    ADHD-friendly productivity that actually works.
                    Dump your chaos, get one actionable step, repeat. No overwhelm, just flow.
                </p>
                
                <div className="hero-cta-group">
                    <button className="btn-primary">
                        Get Started Free
                    </button>
                    <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        Watch Demo <ArrowRight size={16} />
                    </button>
                </div>

                <div className="app-preview-container">
                    <div className="browser-frame">
                        <div className="browser-header">
                            <div className="browser-dots">
                                <span className="dot red"></span>
                                <span className="dot yellow"></span>
                                <span className="dot green"></span>
                            </div>
                            <div className="browser-url">
                                <span>dailywave.app</span>
                            </div>
                        </div>
                        <div className="browser-content">
                            <div className="mock-sidebar">
                                <div className="mock-logo">DailyWave</div>
                                <div className="mock-date">01.08 Wed</div>
                                <div className="mock-section-title">Morning</div>
                                <div className="mock-routine done">
                                    <div className="mock-check"></div>
                                    <span>09:00 Check emails</span>
                                </div>
                                <div className="mock-routine">
                                    <div className="mock-circle"></div>
                                    <span>10:00 Team standup</span>
                                </div>
                                <div className="mock-section-title">Afternoon</div>
                                <div className="mock-routine">
                                    <div className="mock-circle evening"></div>
                                    <span>14:00 Design review</span>
                                </div>
                            </div>
                            <div className="mock-main">
                                <div className="mock-header">
                                    <span className="mock-title">Workflows</span>
                                    <div className="mock-btn">+ New</div>
                                </div>
                                <div className="mock-cards">
                                    <div className="mock-card">
                                        <div className="mock-card-header">
                                            <div className="mock-icon blue"></div>
                                            <div className="mock-card-text">
                                                <strong>Product Launch</strong>
                                                <small>Q1 Campaign</small>
                                            </div>
                                        </div>
                                        <div className="mock-steps">
                                            <div className="mock-step done"></div>
                                            <div className="mock-step-line"></div>
                                            <div className="mock-step done"></div>
                                            <div className="mock-step-line"></div>
                                            <div className="mock-step active"></div>
                                            <div className="mock-step-line dim"></div>
                                            <div className="mock-step pending"></div>
                                        </div>
                                    </div>
                                    <div className="mock-card">
                                        <div className="mock-card-header">
                                            <div className="mock-icon green"></div>
                                            <div className="mock-card-text">
                                                <strong>System Architecture</strong>
                                                <small>Automation</small>
                                            </div>
                                        </div>
                                        <div className="mock-steps">
                                            <div className="mock-step done"></div>
                                            <div className="mock-step-line"></div>
                                            <div className="mock-step active"></div>
                                            <div className="mock-step-line dim"></div>
                                            <div className="mock-step pending"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
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
