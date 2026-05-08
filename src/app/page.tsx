'use client';

import { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import './landing.css';

export default function LandingPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const overlayRefs = useRef<(HTMLDivElement | null)[]>([]);

  const overlayConfig = [
    { start: 0, end: 0.15 },
    { start: 0.15, end: 0.35 },
    { start: 0.35, end: 0.55 },
    { start: 0.55, end: 0.75 },
    { start: 0.75, end: 1.0 },
  ];

  const setOverlayState = useCallback((progress: number) => {
    overlayConfig.forEach((config, index) => {
      const element = overlayRefs.current[index];
      if (!element) return;
      element.classList.remove('active', 'exit');
      if (progress >= config.start && progress < config.end) {
        element.classList.add('active');
      } else if (progress >= config.end) {
        element.classList.add('exit');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setNavAndIndicatorState = useCallback((progress: number) => {
    const nav = navRef.current;
    const indicator = scrollIndicatorRef.current;
    if (!nav || !indicator) return;

    nav.classList.remove('active', 'exit');
    indicator.classList.remove('active', 'exit');

    if (progress < 0.15) {
      nav.classList.add('active');
    } else {
      nav.classList.add('exit');
    }

    if (progress < 0.1) {
      indicator.classList.add('active');
    } else {
      indicator.classList.add('exit');
    }
  }, []);

  const updateFromScroll = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const maxScrollable = document.body.scrollHeight - window.innerHeight;
    const scrollProgress = maxScrollable > 0 ? window.scrollY / maxScrollable : 0;
    const clampedProgress = Math.min(Math.max(scrollProgress, 0), 1);

    video.currentTime = clampedProgress * 22;
    setOverlayState(clampedProgress);
    setNavAndIndicatorState(clampedProgress);
  }, [setOverlayState, setNavAndIndicatorState]);

  useEffect(() => {
    const video = videoRef.current;
    const cursor = cursorRef.current;
    if (!video || !cursor) return;

    // Set body styles for landing page
    document.body.style.background = '#000';
    document.body.style.overflow = 'auto';

    const handleMetadata = () => {
      video.currentTime = 0;
      updateFromScroll();
    };

    video.addEventListener('loadedmetadata', handleMetadata);
    window.addEventListener('scroll', updateFromScroll);
    window.addEventListener('resize', updateFromScroll);
    updateFromScroll();

    // Custom cursor
    const handleMouseMove = (event: MouseEvent) => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Hover effects for interactive elements
    const hoverIn = () => cursor.classList.add('is-hovering');
    const hoverOut = () => cursor.classList.remove('is-hovering');
    const interactiveElements = document.querySelectorAll('a, button');
    interactiveElements.forEach((el) => {
      el.addEventListener('mouseenter', hoverIn);
      el.addEventListener('mouseleave', hoverOut);
    });

    return () => {
      video.removeEventListener('loadedmetadata', handleMetadata);
      window.removeEventListener('scroll', updateFromScroll);
      window.removeEventListener('resize', updateFromScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      interactiveElements.forEach((el) => {
        el.removeEventListener('mouseenter', hoverIn);
        el.removeEventListener('mouseleave', hoverOut);
      });
      document.body.style.background = '';
    };
  }, [updateFromScroll]);

  const scrollToProgress = (targetProgress: number) => {
    const maxScrollable = document.body.scrollHeight - window.innerHeight;
    const targetScrollY = targetProgress * maxScrollable;
    window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      <div className="accent-line" aria-hidden="true" />
      <div ref={cursorRef} className="custom-cursor" aria-hidden="true" />

      <video ref={videoRef} id="hero-video" muted playsInline preload="auto">
        <source src="/parkshare-scroll.mp4" type="video/mp4" />
      </video>

      {/* ── Top Navigation ── */}
      <nav ref={navRef} id="hero-nav" className="top-nav">
        <div className="brand">
          <span className="logo-box">PS</span>
          <span>ParkShare</span>
        </div>
        <ul className="nav-links">
          <li>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); scrollToProgress(0); }}
            >
              Home
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); scrollToProgress(0.18); }}
            >
              How It Works
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); scrollToProgress(0.38); }}
            >
              Features
            </a>
          </li>
          <li>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); scrollToProgress(0.78); }}
            >
              Contact
            </a>
          </li>
          <li>
            <Link href="/login" className="cta-nav-button">
              Get Started →
            </Link>
          </li>
        </ul>
      </nav>

      {/* ── Scroll Indicator ── */}
      <div ref={scrollIndicatorRef} id="scroll-indicator" className="scroll-indicator">
        <span className="scroll-text">SCROLL</span>
        <span className="scroll-line" aria-hidden="true" />
      </div>

      {/* ── Overlay 1: The City Moves ── */}
      <div
        ref={(el) => { overlayRefs.current[0] = el; }}
        className="overlay"
      >
        <div className="hero-copy">
          <h1 className="headline">The City Moves.</h1>
          <p className="subtitle">Find your space, instantly.</p>
        </div>
      </div>

      {/* ── Overlay 2: AI That Thinks Ahead (How It Works) ── */}
      <div
        ref={(el) => { overlayRefs.current[1] = el; }}
        className="overlay"
      >
        <div className="hero-copy">
          <h2 className="headline">AI That Thinks Ahead.</h2>
          <p className="subtitle">Dynamic pricing. Real-time conflicts resolved.</p>
        </div>
      </div>

      {/* ── Overlay 3: For Drivers (Features) ── */}
      <div
        ref={(el) => { overlayRefs.current[2] = el; }}
        className="overlay"
      >
        <div className="hero-copy">
          <h2 className="headline">For Drivers.</h2>
          <p className="subtitle">Search. Book. Extend. All in seconds.</p>
        </div>
      </div>

      {/* ── Overlay 4: For Owners ── */}
      <div
        ref={(el) => { overlayRefs.current[3] = el; }}
        className="overlay"
      >
        <div className="hero-copy">
          <h2 className="headline">For Owners.</h2>
          <p className="subtitle">List your space. Earn while you sleep.</p>
        </div>
      </div>

      {/* ── Overlay 5: Welcome / CTA (Contact) ── */}
      <div
        ref={(el) => { overlayRefs.current[4] = el; }}
        className="overlay"
      >
        <div className="hero-copy">
          <h2 className="headline">Welcome to ParkShare.</h2>
          <Link href="/login" className="cta-button">
            Explore the Platform
          </Link>
        </div>
      </div>

      {/* ── Scroll Space (drives the video scrubbing) ── */}
      <div className="hero-scroll-space" aria-hidden="true" />

      {/* ── After Hero ── */}
      <section className="after-hero">
        <p>More coming soon</p>
      </section>
    </div>
  );
}
