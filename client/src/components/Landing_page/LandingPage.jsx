import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebook, faLinkedin, faGoogle } from '@fortawesome/free-brands-svg-icons';
import { faBars, faTimes, faChevronRight, faCheckCircle, faUserMd, faCalendarAlt, faChartLine, faComments, faDatabase } from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import ReactPlayer from 'react-player';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

import { getAuth, onAuthStateChanged } from "firebase/auth";



const TypingEffect = ({ text, speed = 50, delay = 1000 }) => {
  const [displayText, setDisplayText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setTimeout(() => {
      if (index < text.length) {
        setDisplayText(text.substring(0, index + 1));
        setIndex(index + 1);
      } else {
        setTimeout(() => {
          setDisplayText("");
          setIndex(0);
        }, delay); // Wait before restarting
      }
    }, speed);

    return () => clearTimeout(interval);
  }, [index, text, speed, delay]);

  return <p>{displayText}</p>;
};





export const LandingPage = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const auth = getAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    body: "",
    role: "non-user"
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus("");

    try {
      await addDoc(collection(db, "report"), {
        ...formData,
        createdAt: serverTimestamp()
      });

      setFormData({ name: "", email: "", subject: "", body: "", role: "non-user" });
      setStatus("Message sent successfully!");
    } catch (error) {
      console.error("Error sending message:", error);
      setStatus("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [auth]);

  const handleClick = (e) => {
    if (!user) {
      e.preventDefault();
      alert("Please log in to access the Home page.");
    }
  };




  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 50;
      setScrolled(isScrolled);
      
      // Show hero content when scrolled slightly
      if (window.scrollY > 10 && !heroVisible) {
        setHeroVisible(true);
      } else if (window.scrollY <= 10 && heroVisible) {
        setHeroVisible(false);
      }
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [heroVisible]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const features = [
    {
      icon: faCheckCircle,
      title: "Symptom Checker",
      description: "AI-powered analysis of symptoms and medical reports with personalized suggestions.",
      color: "blue"
    },
    {
      icon: faUserMd,
      title: "Test Suggestions",
      description: "Tailored recommendations for medical tests based on your symptoms and history.",
      color: "purple"
    },
    {
      icon: faCalendarAlt,
      title: "Doctor Finder",
      description: "Find and book appointments with healthcare providers matching your needs.",
      color: "green"
    },
    {
      icon: faChartLine,
      title: "Health Tracker",
      description: "Monitor your health trends with interactive visual graphs and alerts.",
      color: "yellow"
    },
    {
      icon: faComments,
      title: "Community Forum",
      description: "Engage with others in discussions about health conditions and wellness.",
      color: "red"
    },
    {
      icon: faDatabase,
      title: "Data Integration",
      description: "Combine health data from multiple sources for comprehensive insights.",
      color: "indigo"
    }
  ];

  const blogs = [
    {
      title: "AI in Healthcare: The Future is Now",
      excerpt: "How artificial intelligence is revolutionizing patient care and diagnosis.",
      image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"
    },
    {
      title: "Understanding Your Symptoms",
      excerpt: "A guide to interpreting common symptoms and when to seek medical help.",
      image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"
    },
    {
      title: "Preventive Healthcare Tips",
      excerpt: "Simple daily habits that can significantly improve your long-term health.",
      image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80"
    }
  ];

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className={`nav ${scrolled ? 'nav-scrolled' : ''} ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
        <div className="nav-container">
          <Link to="/" className="logo">Symptic<span>Ai</span></Link>

          {/* Desktop Menu */}
          <div className="desktop-menu">
            <div className="menu-links">
              <Link to="/home_page" className="menu-link" onClick={handleClick}>Home</Link>
              <Link to="#features" className="menu-link">Features</Link>
              <Link to="#about" className="menu-link">About</Link>
              <Link to="#blogs" className="menu-link">Blog</Link>
              <Link to="#contact" className="menu-link">Contact</Link>
            </div>
            <div className="auth-buttons">
              <Link to="/login" className="login-btn">Login</Link>
              <Link to="/signup" className="signup-btn">Sign Up</Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button className="mobile-menu-btn" onClick={toggleMobileMenu} aria-label="Toggle menu">
            <FontAwesomeIcon icon={isMobileMenuOpen ? faTimes : faBars} />
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="mobile-menu-links">
            <Link to="/home_page" className="mobile-menu-link" onClick={handleClick}>Home</Link>
            <Link to="#features" className="mobile-menu-link" onClick={toggleMobileMenu}>Features</Link>
            <Link to="#about" className="mobile-menu-link" onClick={toggleMobileMenu}>About</Link>
            <Link to="#blogs" className="mobile-menu-link" onClick={toggleMobileMenu}>Blog</Link>
            <Link to="#contact" className="mobile-menu-link" onClick={toggleMobileMenu}>Contact</Link>
            <div className="mobile-auth-buttons">
              <Link to="/login" className="mobile-login-btn" onClick={toggleMobileMenu}>Login</Link>
              <Link to="/signup" className="mobile-signup-btn" onClick={toggleMobileMenu}>Sign Up</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Video Background */}
      <section className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-video">
          <ReactPlayer
            url="/videos/landing.mp4" 
            playing
            loop
            muted
            width="100%"
            height="100%"
            style={{ objectFit: 'cover' }}
            playsinline
          />
        </div>
        <div className={`hero-content ${heroVisible ? 'hero-content-visible' : ''}`}>
          <h1>Your <span>Health</span> Matters<br />Know More, Worry Less</h1>
    <div>
      <TypingEffect text="SympticAi is your intelligent healthcare assistant, designed to understand your symptoms and support accurate diagnosis. With powerful AI and explainable insights, we help you stay informed and in control of your health journey." />
    </div>

          <div className="hero-buttons">
            <Link to="/login" className="primary-btn">Get Started</Link>
            <Link to="#features" className="secondary-btn">Learn More</Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="about-container">
          <div className="about-image">
            <img 
              src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80" 
              alt="Doctor using digital tablet" 
              loading="lazy"
            />
          </div>
          <div className="about-content">
            <h2>About <span>SympticAi</span></h2>
            <p>
              At SympticAi, we create intelligent and user-friendly tools to improve how people understand and manage their health. Using advanced medical AI and explainable technology, we deliver accurate symptom analysis and helpful insights.
            </p>
            <p>
              Our goal is to make healthcare smarter, clearer, and more accessible—empowering both individuals and professionals to make confident decisions, every day.
            </p>
            <div className="about-features">
              <div className="about-feature">
                <div className="feature-icon blue">
                  <FontAwesomeIcon icon={faCheckCircle} />
                </div>
                <span>AI-Powered Analysis</span>
              </div>
              <div className="about-feature">
                <div className="feature-icon green">
                  <FontAwesomeIcon icon={faUserMd} />
                </div>
                <span>Doctor Verified</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2>Powerful <span>Features</span></h2>
          <p>Everything you need to take control of your health journey</p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className={`feature-card feature-${feature.color}`}>
              <div className="feature-icon-container">
                <FontAwesomeIcon icon={feature.icon} />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <div className="feature-link">
                <span>Learn more</span>
                <FontAwesomeIcon icon={faChevronRight} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-number">10K+</div>
            <div className="stat-label">Active Users</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">500+</div>
            <div className="stat-label">Healthcare Partners</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">95%</div>
            <div className="stat-label">Accuracy Rate</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">24/7</div>
            <div className="stat-label">Support Available</div>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section id="blogs" className="blog-section">
        <div className="section-header">
          <h2>Latest <span>Health Insights</span></h2>
          <p>Stay informed with our expert articles and health tips</p>
        </div>

        <div className="blog-grid">
          {blogs.map((blog, index) => (
            <div key={index} className="blog-card">
              <img src={blog.image} alt={blog.title} loading="lazy" />
              <div className="blog-content">
                <h3>{blog.title}</h3>
                <p>{blog.excerpt}</p>
                <Link to="#" className="blog-link">
                  Read article <FontAwesomeIcon icon={faChevronRight} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="view-all">
          <Link to="#" className="view-all-btn">View all articles</Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section">
        <div className="section-header">
          <h2>What Our <span>Users Say</span></h2>
          <p>Don't just take our word for it - hear from our community</p>
        </div>

        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="testimonial-rating">★★★★★</div>
            <p className="testimonial-text">
              "SympticAi helped me identify a condition I didn't even know I had. The doctor confirmed the AI's suggestion was correct!"
            </p>
            <div className="testimonial-author">
              <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Sarah J." loading="lazy" />
              <div>
                <div className="author-name">Sarah J.</div>
                <div className="author-title">Patient</div>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-rating">★★★★★</div>
            <p className="testimonial-text">
              "As a busy professional, I love how SympticAi saves me time by helping me understand if I need to see a doctor or not."
            </p>
            <div className="testimonial-author">
              <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="Michael T." loading="lazy" />
              <div>
                <div className="author-name">Michael T.</div>
                <div className="author-title">Business Owner</div>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-rating">★★★★★</div>
            <p className="testimonial-text">
              "I use SympticAi in my practice to help patients understand their symptoms before they come in. It's a game-changer."
            </p>
            <div className="testimonial-author">
              <img src="https://randomuser.me/api/portraits/women/68.jpg" alt="Dr. Patel" loading="lazy" />
              <div>
                <div className="author-name">Dr. Patel</div>
                <div className="author-title">General Practitioner</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <h2>Ready to take control of your health?</h2>
          <p>
            Join thousands of users who are making informed health decisions every day.
          </p>
          <div className="cta-buttons">
            <Link to="/signup" className="cta-primary-btn">Sign Up Free</Link>
            <Link to="/login" className="cta-secondary-btn">Login</Link>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="contact-container">
          <div className="contact-image">
            <img 
              src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80" 
              alt="Contact us" 
              loading="lazy"
            />
          </div>
          <div className="contact-form-container">
            <h2>Get in <span>Touch</span></h2>
            <p>
              Have questions or feedback? We'd love to hear from you. Our team is ready to help.
            </p>
            
    <form className="contact-form" onSubmit={handleSubmit}>
      <input
        type="text"
        name="name"
        placeholder="Your Name"
        value={formData.name}
        onChange={handleChange}
        required
      />
      <input
        type="email"
        name="email"
        placeholder="Email Address"
        value={formData.email}
        onChange={handleChange}
        required
      />
      <input
        name="subject"
        placeholder="Subject"
        value={formData.subject}
        onChange={handleChange}
        required
      />      
      <textarea
        name="body"
        rows="4"
        placeholder="Your Message"
        value={formData.body}
        onChange={handleChange}
        required
      ></textarea>
      <button type="submit" className="submit-btn" disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : "Send Message"}
      </button>
      {status && <p className="form-status">{status}</p>}
    </form>


            <div className="social-links">
              <h3>Connect with us</h3>
              <div className="social-icons">
                <a href="#" aria-label="Facebook">
                  <FontAwesomeIcon icon={faFacebook} />
                </a>
                <a href="#" aria-label="LinkedIn">
                  <FontAwesomeIcon icon={faLinkedin} />
                </a>
                <a href="#" aria-label="Google">
                  <FontAwesomeIcon icon={faGoogle} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-about">
            <div className="footer-logo">Symptic<span>Ai</span></div>
            <p>
              Simplify healthcare with intelligent insights and better decisions.
            </p>
            <div className="footer-social">
              <a href="#" aria-label="Facebook">
                <FontAwesomeIcon icon={faFacebook} />
              </a>
              <a href="#" aria-label="LinkedIn">
                <FontAwesomeIcon icon={faLinkedin} />
              </a>
              <a href="#" aria-label="Google">
                <FontAwesomeIcon icon={faGoogle} />
              </a>
            </div>
          </div>

          <div className="footer-links">
            <h3>Product</h3>
            <ul>
              <li><Link to="#features">Features</Link></li>
              <li><Link to="#">Pricing</Link></li>
              <li><Link to="#">API</Link></li>
              <li><Link to="#">Integrations</Link></li>
            </ul>
          </div>

          <div className="footer-links">
            <h3>Company</h3>
            <ul>
              <li><Link to="#about">About</Link></li>
              <li><Link to="#">Careers</Link></li>
              <li><Link to="#">Privacy</Link></li>
              <li><Link to="#">Terms</Link></li>
            </ul>
          </div>

          <div className="footer-links">
            <h3>Resources</h3>
            <ul>
              <li><Link to="#">Documentation</Link></li>
              <li><Link to="#">Guides</Link></li>
              <li><Link to="#blogs">Blog</Link></li>
              <li><Link to="#contact">Support</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} SympticAi. All rights reserved.</p>
        </div>
      </footer>

      {/* CSS Styles */}
      <style jsx>{`
        /* Base Styles */
        .landing-page {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          color: #333;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        img {
          max-width: 100%;
          height: auto;
          display: block;
        }

        a {
          text-decoration: none;
          color: inherit;
        }

        button {
          cursor: pointer;
          border: none;
          background: none;
          font-family: inherit;
        }

        /* Navigation */
        .nav {
          position: fixed;
          width: 100%;
          z-index: 1000;
          padding: 1.25rem 0;
          transition: all 0.3s ease;
          background-color: transparent;
        }

        .nav-scrolled {
          background-color: white;
          padding: 0.75rem 0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        .nav-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          font-size: 1.75rem;
          font-weight: 700;
          color: #2563eb;
          z-index: 1001;
        }

        .logo span {
          color: #60a5fa;
        }

        .desktop-menu {
          display: flex;
          align-items: center;
        }

        .menu-links {
          display: flex;
          margin-right: 1.875rem;
          gap: 1.25rem;
        }

        .menu-link {
          color: #1f2937;
          font-weight: 500;
          font-size: 1rem;
          transition: color 0.2s ease;
          position: relative;
          padding: 0.5rem 0;
        }

        .menu-link:hover {
          color: #2563eb;
        }

        .menu-link::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 2px;
          background-color: #2563eb;
          transition: width 0.3s ease;
        }

        .menu-link:hover::after {
          width: 100%;
        }

        .auth-buttons {
          display: flex;
          gap: 0.625rem;
        }

        .login-btn {
          padding: 0.5rem 1.25rem;
          color: #2563eb;
          font-weight: 500;
          border-radius: 50px;
          transition: all 0.2s ease;
        }

        .login-btn:hover {
          color: #1d4ed8;
          background-color: #eff6ff;
        }

        .signup-btn {
          padding: 0.5rem 1.25rem;
          background-color: #2563eb;
          color: white;
          font-weight: 500;
          border-radius: 50px;
          border: 2px solid #2563eb;
          transition: all 0.2s ease;
        }

        .signup-btn:hover {
          background-color: #1d4ed8;
          border-color: #1d4ed8;
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          color: #1f2937;
          font-size: 1.5rem;
          z-index: 1001;
          padding: 0.5rem;
        }

        .mobile-menu {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          background-color: white;
          z-index: 1000;
          transform: translateY(-100%);
          opacity: 0;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 5rem 1.25rem 2rem;
        }

        .mobile-menu.open {
          transform: translateY(0);
          opacity: 1;
        }

        .mobile-menu-links {
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 400px;
          gap: 1.5rem;
        }

        .mobile-menu-link {
          color: #1f2937;
          font-size: 1.25rem;
          font-weight: 500;
          padding: 0.75rem 0;
          text-align: center;
          transition: color 0.2s ease;
          border-bottom: 1px solid #e5e7eb;
        }

        .mobile-menu-link:hover {
          color: #2563eb;
        }

        .mobile-auth-buttons {
          margin-top: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
          max-width: 400px;
        }

        .mobile-login-btn {
          padding: 0.75rem;
          color: #2563eb;
          font-weight: 500;
          border-radius: 50px;
          border: 2px solid #2563eb;
          text-align: center;
          transition: all 0.2s ease;
        }

        .mobile-login-btn:hover {
          background-color: #eff6ff;
        }

        .mobile-signup-btn {
          padding: 0.75rem;
          background-color: #2563eb;
          color: white;
          font-weight: 500;
          border-radius: 50px;
          text-align: center;
          transition: all 0.2s ease;
        }

        .mobile-signup-btn:hover {
          background-color: #1d4ed8;
        }

        /* Hero Section */
        .hero-section {
          position: relative;
          min-height: 100vh;
          width: 98.8vw;
          display: flex;
          align-items: center;
          padding-top: 5rem;
          overflow: hidden;
        }

        .hero-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(6, 182, 212, 0.9) 100%);
          z-index: 1;
          opacity: 0.4;
        }

        .hero-video {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          object-fit: cover;
        }

        .hero-video video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.25rem;
          text-align: center;
          color: white;
          opacity: 0;
          transform: translateY(50px);
          transition: all 0.8s ease;
          width: 100%;
        }

        .hero-content-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .hero-content h1 {
          font-size: clamp(2rem, 5vw, 3.5rem);
          font-weight: 800;
          margin-bottom: 1.5rem;
          line-height: 1.2;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .hero-content h1 span {
          color: #93c5fd;
        }

        .hero-content p {
          font-size: clamp(1rem, 2vw, 1.25rem);
          max-width: 800px;
          margin: 0 auto 2.5rem;
          color: #e5e7eb;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .hero-buttons {
          display: flex;
          justify-content: center;
          gap: 1.25rem;
          flex-wrap: wrap;
        }

        .primary-btn {
          padding: 1rem 2rem;
          background-color: white;
          color: #2563eb;
          font-weight: 600;
          border-radius: 50px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          font-size: 1rem;
          border: 2px solid white;
        }

        .primary-btn:hover {
          background-color: #eff6ff;
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .secondary-btn {
          padding: 1rem 2rem;
          color: white;
          font-weight: 600;
          border: 2px solid white;
          border-radius: 50px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          font-size: 1rem;
        }

        .secondary-btn:hover {
          background-color: white;
          color: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        /* About Section */
        .about-section {
          padding: 5rem 0;
          background-color: #f9fafb;
        }

        .about-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.25rem;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 2.5rem;
        }

        .about-image {
          flex: 1;
          min-width: 300px;
          border-radius: 0.75rem;
          overflow: hidden;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .about-image img {
          width: 100%;
          height: auto;
          transition: transform 0.3s ease;
        }

        .about-image:hover img {
          transform: scale(1.02);
        }

        .about-content {
          flex: 1;
          min-width: 300px;
        }

        .about-content h2 {
          font-size: 2.25rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: #111827;
        }

        .about-content h2 span {
          color: #2563eb;
        }

        .about-content p {
          font-size: 1.1rem;
          color: #4b5563;
          margin-bottom: 1.5rem;
          line-height: 1.7;
        }

        .about-features {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        .about-feature {
          display: flex;
          align-items: center;
          background-color: white;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
          transition: all 0.2s ease;
        }

        .about-feature:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          transform: translateY(-2px);
        }

        .feature-icon {
          width: 2.25rem;
          height: 2.25rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 0.75rem;
          flex-shrink: 0;
        }

        .feature-icon.blue {
          background-color: #dbeafe;
          color: #2563eb;
        }

        .feature-icon.green {
          background-color: #dcfce7;
          color: #16a34a;
        }

        /* Features Section */
        .features-section {
          padding: 5rem 0;
          background-color: white;
        }

        .section-header {
          max-width: 800px;
          margin: 0 auto 3.75rem;
          text-align: center;
          padding: 0 1.25rem;
        }

        .section-header h2 {
          font-size: 2.25rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: #111827;
        }

        .section-header h2 span {
          color: #2563eb;
        }

        .section-header p {
          font-size: 1.1rem;
          color: #4b5563;
          line-height: 1.6;
        }

        .features-grid {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.25rem;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .feature-card {
          background-color: white;
          border-radius: 0.75rem;
          padding: 2rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .feature-icon-container {
          width: 3.75rem;
          height: 3.75rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
          font-size: 1.5rem;
        }

        .feature-blue .feature-icon-container {
          background-color: #dbeafe;
          color: #2563eb;
        }

        .feature-purple .feature-icon-container {
          background-color: #f3e8ff;
          color: #7e22ce;
        }

        .feature-green .feature-icon-container {
          background-color: #dcfce7;
          color: #16a34a;
        }

        .feature-yellow .feature-icon-container {
          background-color: #fef9c3;
          color: #ca8a04;
        }

        .feature-red .feature-icon-container {
          background-color: #fee2e2;
          color: #dc2626;
        }

        .feature-indigo .feature-icon-container {
          background-color: #e0e7ff;
          color: #4f46e5;
        }

        .feature-card h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #111827;
        }

        .feature-card p {
          color: #4b5563;
          margin-bottom: 1.5rem;
          line-height: 1.6;
          flex-grow: 1;
        }

        .feature-link {
          display: flex;
          align-items: center;
          color: #2563eb;
          font-weight: 500;
          transition: color 0.2s ease;
          margin-top: auto;
        }

        .feature-link:hover {
          color: #1d4ed8;
        }

        .feature-link svg {
          margin-left: 0.5rem;
          font-size: 0.9rem;
          transition: transform 0.2s ease;
        }

        .feature-link:hover svg {
          transform: translateX(3px);
        }

        /* Stats Section */
        .stats-section {
          padding: 5rem 0;
          background: linear-gradient(to right, #2563eb, #1d4ed8);
          color: white;
        }

        .stats-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.25rem;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 2.5rem;
          text-align: center;
        }

        .stat-item {
          padding: 1.875rem 1.25rem;
        }

        .stat-number {
          font-size: 3rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          line-height: 1;
        }

        .stat-label {
          font-size: 1.1rem;
          color: #bfdbfe;
        }

        /* Blog Section */
        .blog-section {
          padding: 5rem 0;
          background-color: #f9fafb;
        }

        .blog-grid {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.25rem;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .blog-card {
          background-color: white;
          border-radius: 0.75rem;
          overflow: hidden;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .blog-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .blog-card img {
          width: 100%;
          height: 200px;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .blog-card:hover img {
          transform: scale(1.03);
        }

        .blog-content {
          padding: 1.5rem;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
        }

        .blog-content h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
          color: #111827;
        }

        .blog-content p {
          color: #4b5563;
          margin-bottom: 1.5rem;
          line-height: 1.6;
          flex-grow: 1;
        }

        .blog-link {
          display: flex;
          align-items: center;
          color: #2563eb;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .blog-link:hover {
          color: #1d4ed8;
        }

        .blog-link svg {
          margin-left: 0.5rem;
          font-size: 0.9rem;
          transition: transform 0.2s ease;
        }

        .blog-link:hover svg {
          transform: translateX(3px);
        }

        .view-all {
          text-align: center;
          margin-top: 3.125rem;
        }

        .view-all-btn {
          display: inline-block;
          padding: 0.75rem 1.875rem;
          background-color: #2563eb;
          color: white;
          font-weight: 500;
          border-radius: 50px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3), 0 2px 4px -1px rgba(37, 99, 235, 0.2);
          border: 2px solid #2563eb;
        }

        .view-all-btn:hover {
          background-color: #1d4ed8;
          border-color: #1d4ed8;
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3), 0 4px 6px -2px rgba(37, 99, 235, 0.2);
        }

        /* Testimonials */
        .testimonials-section {
          padding: 5rem 0;
          background-color: white;
        }

        .testimonials-grid {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.25rem;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .testimonial-card {
          background-color: #f9fafb;
          border-radius: 0.75rem;
          padding: 2rem;
          transition: all 0.3s ease;
          border: 1px solid #e5e7eb;
        }

        .testimonial-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .testimonial-rating {
          color: #f59e0b;
          margin-bottom: 1.25rem;
          font-size: 1.2rem;
        }

        .testimonial-text {
          color: #4b5563;
          margin-bottom: 1.5rem;
          line-height: 1.7;
          font-style: italic;
          position: relative;
          padding-left: 1.5rem;
        }

        .testimonial-text::before {
          content: '"';
          position: absolute;
          left: 0;
          top: -0.5rem;
          font-size: 3rem;
          color: #e5e7eb;
          line-height: 1;
        }

        .testimonial-author {
          display: flex;
          align-items: center;
        }

        .testimonial-author img {
          width: 3rem;
          height: 3rem;
          border-radius: 50%;
          margin-right: 0.9375rem;
          object-fit: cover;
        }

        .author-name {
          font-weight: 600;
          color: #111827;
        }

        .author-title {
          font-size: 0.9rem;
          color: #6b7280;
        }

        /* CTA Section */
        .cta-section {
          padding: 5rem 0;
          background: linear-gradient(to right, #2563eb, #1d4ed8);
          color: white;
          text-align: center;
        }

        .cta-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 1.25rem;
        }

        .cta-container h2 {
          font-size: 2.25rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          line-height: 1.2;
        }

        .cta-container p {
          font-size: 1.2rem;
          margin-bottom: 2.5rem;
          color: #bfdbfe;
          line-height: 1.6;
        }

        .cta-buttons {
          display: flex;
          justify-content: center;
          gap: 1.25rem;
          flex-wrap: wrap;
        }

        .cta-primary-btn {
          padding: 1rem 2rem;
          background-color: white;
          color: #2563eb;
          font-weight: 600;
          border-radius: 50px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border: 2px solid white;
          font-size: 1rem;
        }

        .cta-primary-btn:hover {
          background-color: #eff6ff;
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .cta-secondary-btn {
          padding: 1rem 2rem;
          color: white;
          font-weight: 600;
          border: 2px solid white;
          border-radius: 50px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          font-size: 1rem;
        }

        .cta-secondary-btn:hover {
          background-color: white;
          color: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        /* Contact Section */
        .contact-section {
          padding: 5rem 0;
          background-color: white;
        }

        .contact-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.25rem;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 2.5rem;
        }

        .contact-image {
          flex: 1;
          min-width: 300px;
          border-radius: 0.75rem;
          overflow: hidden;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .contact-image img {
          width: 100%;
          height: auto;
          transition: transform 0.3s ease;
        }

        .contact-image:hover img {
          transform: scale(1.02);
        }

        .contact-form-container {
          flex: 1;
          min-width: 300px;
        }

        .contact-form-container h2 {
          font-size: 2.25rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: #111827;
        }

        .contact-form-container h2 span {
          color: #2563eb;
        }

        .contact-form-container p {
          font-size: 1.1rem;
          color: #4b5563;
          margin-bottom: 2rem;
          line-height: 1.7;
        }

        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .contact-form input,
        .contact-form textarea {
          width: 100%;
          padding: 0.9375rem 1.25rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 1rem;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .contact-form input:focus,
        .contact-form textarea:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
        }

        .contact-form textarea {
          resize: vertical;
          min-height: 120px;
        }

        .submit-btn {
          padding: 0.9375rem;
          background-color: #2563eb;
          color: white;
          font-weight: 500;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3), 0 2px 4px -1px rgba(37, 99, 235, 0.2);
          font-size: 1rem;
        }

        .submit-btn:hover {
          background-color: #1d4ed8;
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3), 0 4px 6px -2px rgba(37, 99, 235, 0.2);
        }

        .social-links {
          margin-top: 2.5rem;
        }

        .social-links h3 {
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #111827;
        }

        .social-icons {
          display: flex;
          gap: 0.9375rem;
        }

        .social-icons a {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          background-color: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4b5563;
          transition: all 0.2s ease;
        }

        .social-icons a:hover {
          background-color: #2563eb;
          color: white;
          transform: translateY(-3px);
        }

        /* Footer */
        .footer {
          background-color: #111827;
          color: white;
          padding: 3.75rem 0 0;
        }

        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.25rem;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 2.5rem;
        }

        .footer-about {
          max-width: 300px;
        }

        .footer-logo {
          font-size: 1.75rem;
          font-weight: 700;
          color: white;
          margin-bottom: 1rem;
        }

        .footer-logo span {
          color: #60a5fa;
        }

        .footer-about p {
          color: #9ca3af;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .footer-social {
          display: flex;
          gap: 0.9375rem;
        }

        .footer-social a {
          color: #9ca3af;
          font-size: 1.2rem;
          transition: color 0.2s ease;
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(156, 163, 175, 0.1);
        }

        .footer-social a:hover {
          color: white;
          background-color: rgba(59, 130, 246, 0.5);
        }

        .footer-links h3 {
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          color: white;
        }

        .footer-links ul {
          list-style: none;
        }

        .footer-links li {
          margin-bottom: 0.75rem;
        }

        .footer-links a {
          color: #9ca3af;
          transition: color 0.2s ease;
        }

        .footer-links a:hover {
          color: white;
        }

        .footer-bottom {
          text-align: center;
          padding: 1.25rem 0;
          margin-top: 3.75rem;
          border-top: 1px solid #374151;
        }

        .footer-bottom p {
          color: #9ca3af;
          font-size: 0.9rem;
        }

        /* Animations */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Responsive Styles */
        @media (max-width: 1024px) {
          .hero-content h1 {
            font-size: 2.5rem;
          }
          
          .features-grid {
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .desktop-menu {
            display: none;
          }

          .mobile-menu-btn {
            display: block;
          }

          .hero-section {
            padding-top: 4.5rem;
          }

          .hero-content h1 {
            font-size: 2rem;
            margin-bottom: 1rem;
          }

          .hero-content p {
            margin-bottom: 2rem;
          }

          .hero-buttons {
            gap: 1rem;
          }

          .primary-btn,
          .secondary-btn,
          .cta-primary-btn,
          .cta-secondary-btn {
            padding: 0.75rem 1.5rem;
            font-size: 0.9rem;
          }

          .about-container,
          .contact-container {
            flex-direction: column;
          }

          .about-image,
          .contact-image {
            margin-right: 0;
            margin-bottom: 2rem;
            width: 100%;
          }

          .section-header h2 {
            font-size: 2rem;
          }

          .testimonials-grid,
          .blog-grid {
            grid-template-columns: 1fr;
          }

          .stats-container {
            grid-template-columns: repeat(2, 1fr));
          }
        }

        @media (max-width: 480px) {
          .nav-container {
            padding: 0 1rem;
          }

          .logo {
            font-size: 1.5rem;
          }

          .hero-content h1 {
            font-size: 1.75rem;
          }

          .hero-content p {
            font-size: 1rem;
          }

          .hero-buttons,
          .cta-buttons {
            flex-direction: column;
            width: 100%;
          }

          .primary-btn,
          .secondary-btn,
          .cta-primary-btn,
          .cta-secondary-btn {
            width: 100%;
            text-align: center;
          }

          .section-header h2 {
            font-size: 1.75rem;
          }

          .section-header p {
            font-size: 1rem;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .stats-container {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .stat-item {
            padding: 1rem;
          }

          .stat-number {
            font-size: 2.5rem;
          }

          .footer-container {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .footer-about {
            max-width: 100%;
          }
        }

        /* Accessibility Improvements */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }

        /* Focus styles for keyboard navigation */
        a:focus-visible,
        button:focus-visible,
        input:focus-visible,
        textarea:focus-visible {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
          border-radius: 0.25rem;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;