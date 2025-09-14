import React, { useState, useEffect } from 'react';
import { FaUser, FaUserMd, FaArrowRight, FaClinicMedical, FaLock, FaEye, FaEyeSlash, FaBars, FaTimes } from 'react-icons/fa';
import { MdHealthAndSafety, MdEmail } from 'react-icons/md';
import { Link } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import ReCAPTCHA from "react-google-recaptcha";
import validator from 'validator';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [role, setRole] = useState('patient');
  const [linkedIn, setLinkedIn] = useState('');
  const [Cv, setCv] = useState('');
  const [medicalReg, setMedicalReg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [otpPopup, setOtpPopup] = useState(false);
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  // Add this useEffect to simulate suspicious behavior
useEffect(() => {
  // Force image challenges by simulating bot-like behavior
  if (window.grecaptcha) {
    // This increases chances of image challenges
    window.grecaptcha.execute = () => {
      return new Promise((resolve) => {
        // Simulate automated behavior that triggers image challenges
        setTimeout(resolve, 100);
      });
    };
  }
}, []);

  // Input validation functions
  const validateEmail = (email) => {
    if (!email) return "Email is required";
    if (!validator.isEmail(email)) return "Please enter a valid email address";
    return null;
  };

  const validatePassword = (password) => {
    if (!password) return "Password is required";
    if (password.length < 12) return "Password must be at least 12 characters long";
    if (!/(?=.*[a-z])/.test(password)) return "Password must contain at least one lowercase letter";
    if (!/(?=.*[A-Z])/.test(password)) return "Password must contain at least one uppercase letter";
    if (!/(?=.*\d)/.test(password)) return "Password must contain at least one number";
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) return "Password must contain at least one special character";
    return null;
  };

  const validateFullName = (name) => {
    if (!name) return "Full name is required";
    if (name.length < 2) return "Full name must be at least 2 characters long";
    if (!/^[a-zA-Z\s]+$/.test(name)) return "Full name can only contain letters and spaces";
    return null;
  };

  const validatePhone = (phone) => {
    if (!phone) return "Phone number is required";
    if (!/^\d+$/.test(phone)) return "Phone number can only contain digits";
    if (phone.length < 10) return "Phone number must be at least 10 digits long";
    return null;
  };

  const validateCountry = (country) => {
    if (!country) return "Country is required";
    if (!/^[a-zA-Z\s]+$/.test(country)) return "Country can only contain letters and spaces";
    return null;
  };

  const validateLinkedIn = (url) => {
    if (!url) return "LinkedIn URL is required for doctors";
    if (!validator.isURL(url)) return "Please enter a valid URL";
    return null;
  };

  const validateMedicalReg = (reg) => {
    if (!reg) return "Medical registration number is required for doctors";
    return null;
  };

  const validateCv = (cv) => {
    if (!cv) return "CV URL is required for doctors";
    if (!validator.isURL(cv)) return "Please enter a valid URL";
    return null;
  };

  const validateForm = () => {
    const newErrors = {};
    
    newErrors.email = validateEmail(email);
    newErrors.password = validatePassword(password);
    newErrors.confirmPassword = password !== confirmPassword ? "Passwords do not match" : null;
    newErrors.fullName = validateFullName(fullName);
    newErrors.phone = validatePhone(phone);
    newErrors.country = validateCountry(country);
    
    if (role === 'doctor') {
      newErrors.linkedIn = validateLinkedIn(linkedIn);
      newErrors.medicalReg = validateMedicalReg(medicalReg);
      newErrors.Cv = validateCv(Cv);
    }
    
    if (!recaptchaToken) {
      newErrors.recaptcha = "Please complete the reCAPTCHA verification";
    }
    
    setErrors(newErrors);
    
    // Check if any errors exist
    return Object.values(newErrors).every(error => error === null);
  };

  // Generate OTP function
  const generateOtp = () => {
    const otpCode = Math.floor(1000 + Math.random() * 9000); // Generate 4-digit OTP
    console.log("Generated OTP: ", otpCode); // Log OTP to console for demo
    setDemoOtp(otpCode); // Save the OTP for comparison
  }

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validate form
    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      // Generate OTP and show the OTP pop-up before creating user
      generateOtp();
      setOtpPopup(true);  // Open OTP pop-up
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle OTP submission and verify
  const handleOtpSubmit = async () => {
    if (otp === demoOtp.toString()) {
      try {
        setIsSubmitting(true);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Saving user data in Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), {
          email,
          fullName,
          phone,
          country,
          role,
          status: role === 'doctor' ? 'pending' : 'approved',
          createdAt: new Date().toISOString(),
          ...(role === 'doctor' && { 
            linkedIn, 
            Cv,
            medicalReg,
            appliedAt: new Date().toISOString() 
          })
        });

        alert("Account created successfully!");
        setOtpPopup(false);  // Close OTP popup
        window.location.href = role === 'patient' ? '/login' : '/'; // Redirect after OTP verification
      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          alert("This email is already registered. Please use a different email or try logging in.");
        } else {
          alert("Error creating account: " + error.message);
        }
      } finally {
        setIsSubmitting(false);
      }
    } else {
      alert("Invalid OTP. Please try again.");
    }
  };

  const handleRecaptchaChange = (token) => {
    setRecaptchaToken(token);
    // Clear recaptcha error if it exists
    if (errors.recaptcha) {
      setErrors({...errors, recaptcha: null});
    }
  };

  const recaptchaSiteKey = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

  // Base styles
  const styles = {
    otpPopupContainer: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      zIndex: 1001,
      width: '80%',
      maxWidth: '400px',
      textAlign: 'center',
    },
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
    },
    otpInput: {
      width: '100%',
      padding: '12px',
      margin: '8px 0',
      borderRadius: '8px',
      border: '1px solid #d1d5db',
      fontSize: '1rem',
      backgroundColor: '#f9fafb',
    },
    otpButton: {
      padding: '12px 20px',
      backgroundColor: '#2563eb',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '1rem',
      marginTop: '8px',
      marginRight: '8px',
    },
    otpCloseButton: {
      padding: '8px 16px',
      backgroundColor: '#f44336',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '1rem',
      marginTop: '8px',
    },
    appContainer: {
      minHeight: '100vh',
      width: '98.8vw',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overflowX: 'hidden',
      boxSizing: 'border-box',
    },
    nav: {
      backgroundColor: 'white',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      height: '64px',
      flexShrink: 0,
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      width: '100%',
    },
    navContainer: {
      height: '100%',
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '0 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      boxSizing: 'border-box',
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      fontSize: '1.25rem',
      fontWeight: 700,
      color: '#2563eb',
      textDecoration: 'none',
      zIndex: 1001
    },
    navLinks: {
      display: 'flex',
      gap: '24px',
      alignItems: 'center'
    },
    navLink: {
      color: '#4b5563',
      textDecoration: 'none',
      fontWeight: 500,
      fontSize: '0.9375rem',
      transition: 'color 0.2s',
      '&:hover': {
        color: '#2563eb'
      }
    },
    mobileMenuButton: {
      background: 'none',
      border: 'none',
      color: '#4b5563',
      fontSize: '1.25rem',
      cursor: 'pointer',
      display: 'none',
      zIndex: 1001
    },
    mobileMenu: {
      position: 'fixed',
      top: '64px',
      left: 0,
      right: 0,
      backgroundColor: 'white',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      zIndex: 999,
      transform: mobileMenuOpen ? 'translateY(0)' : 'translateY(-130%)',
      transition: 'transform 0.3s ease-in-out'
    },
    mainContent: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      minHeight: 'calc(100vh - 64px)',
      marginTop: '64px',
      width: '100%',
      position: 'relative'
    },
    heroSection: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      width: isMobile ? '100%' : '50%',
      padding: isMobile ? '40px 20px' : '0',
      minHeight: isMobile ? '300px' : 'calc(100vh - 64px)',
      position: isMobile ? 'relative' : 'fixed',
      left: isMobile ? 'auto' : 0,
      top: isMobile ? 'auto' : '64px'
    },
    heroContent: {
      maxWidth: '500px',
      width: '100%',
      padding: '32px',
    },
    heroIcon: {
      marginBottom: '24px'
    },
    heroTitle: {
      fontSize: isMobile ? '1.75rem' : '2rem',
      fontWeight: 700,
      marginBottom: '16px',
      lineHeight: 1.2
    },
    heroSubtitle: {
      fontSize: isMobile ? '1rem' : '1.125rem',
      opacity: 0.9,
      marginBottom: '32px',
      lineHeight: 1.5
    },
    statsContainer: {
      display: 'flex',
      justifyContent: 'center',
      gap: '16px',
      marginTop: '32px',
      flexWrap: 'wrap'
    },
    statBox: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      padding: '16px',
      borderRadius: '8px',
      minWidth: '96px'
    },
    statNumber: {
      fontSize: '1.5rem',
      fontWeight: 700
    },
    statLabel: {
      fontSize: '0.75rem'
    },
    loginSection: {
      backgroundColor: 'white',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      width: isMobile ? '100%' : '50%',
      marginLeft: isMobile ? '0' : '50%',
      padding: '40px 0',
      minHeight: isMobile ? 'auto' : 'calc(100vh - 64px)',
      overflowY: 'auto'
    },
    loginFormContainer: {
      width: '100%',
      maxWidth: '450px',
      margin: 'auto',
      padding: '0 24px',
    },
    loginHeader: {
      textAlign: 'center',
      marginBottom: '32px'
    },
    loginTitle: {
      fontSize: isMobile ? '1.5rem' : '1.875rem',
      fontWeight: 700,
      color: '#111827',
      marginBottom: '8px'
    },
    loginSubtitle: {
      color: '#6b7280',
      fontSize: '0.9375rem',
      marginBottom: '24px'
    },
    loginForm: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      width: '100%'
    },
    inputGroup: {
      position: 'relative',
      marginBottom: '16px',
      width: '100%'
    },
    inputIcon: {
      position: 'absolute',
      left: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#9ca3af',
      fontSize: '1rem',
      display: 'flex',
      alignItems: 'center'
    },
    formInput: {
      width: '100%',
      padding: '12px 16px 12px 44px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '0.9375rem',
      backgroundColor: '#f9fafb',
      transition: 'all 0.2s',
      height: '48px',
      boxSizing: 'border-box',
      color: '#3b82f6',
    },
    errorInput: {
      borderColor: '#f44336',
    },
    errorText: {
      color: '#f44336',
      fontSize: '0.75rem',
      marginTop: '4px',
    },
    passwordToggle: {
      position: 'absolute',
      right: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#9ca3af',
      cursor: 'pointer',
      background: 'none',
      border: 'none',
      fontSize: '1rem'
    },
    roleToggle: {
      display: 'flex',
      margin: '0 0 24px 0',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      overflow: 'hidden',
      width: '100%'
    },
    toggleButton: {
      flex: 1,
      padding: '12px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontWeight: 500,
      transition: 'all 0.2s',
      fontSize: '0.9375rem'
    },
    activeToggle: {
      background: '#2563eb',
      color: 'white'
    },
    loginButton: {
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '12px',
      border: 'none',
      borderRadius: '8px',
      backgroundColor: '#2563eb',
      color: 'white',
      fontWeight: 600,
      fontSize: '0.9375rem',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      height: '48px',
      marginTop: '8px',
      opacity: isSubmitting ? 0.7 : 1,
    },
    signupLink: {
      textAlign: 'center',
      marginTop: '24px',
      color: '#6b7280',
      fontSize: '0.875rem'
    },
    authLink: {
      color: '#2563eb',
      fontWeight: 500,
      textDecoration: 'none',
      '&:hover': {
        textDecoration: 'underline'
      }
    },
    formRow: {
      display: 'flex',
      gap: '16px',
      width: '100%',
      flexDirection: isMobile ? 'column' : 'row'
    },
    halfWidthInput: {
      flex: 1,
      minWidth: 0
    },
    recaptchaContainer: {
      display: 'flex',
      justifyContent: 'center',
      margin: '16px 0',
    },
    recaptchaError: {
      color: '#f44336',
      fontSize: '0.75rem',
      marginTop: '4px',
      textAlign: 'center',
    }
  };

  // Mobile-specific style overrides
  if (isMobile) {
    styles.mobileMenuButton.display = 'block';
    styles.navLinks.display = 'none';
  }

  return (
    <div style={styles.appContainer}>
      {/* Fixed Navigation Bar */}
      <nav style={styles.nav}>
        <div style={styles.navContainer}>
          <Link to="/" style={styles.logo}>
            <MdHealthAndSafety style={{ marginRight: '8px' }} />
            SympticAi
          </Link>
          
          <div style={styles.navLinks}>
            <Link to="/" style={styles.navLink}>Home</Link>
            <Link to="/services" style={styles.navLink}>Services</Link>
            <Link to="/doctors" style={styles.navLink}>Doctors</Link>
            <Link to="/about" style={styles.navLink}>About</Link>
            <Link to="/contact" style={styles.navLink}>Contact</Link>
          </div>
          
          <button 
            style={styles.mobileMenuButton}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
        
        {isMobile && (
          <div style={styles.mobileMenu}>
            <Link to="/" style={styles.navLink} onClick={() => setMobileMenuOpen(false)}>Home</Link>
            <Link to="/services" style={styles.navLink} onClick={() => setMobileMenuOpen(false)}>Services</Link>
            <Link to="/doctors" style={styles.navLink} onClick={() => setMobileMenuOpen(false)}>Doctors</Link>
            <Link to="/about" style={styles.navLink} onClick={() => setMobileMenuOpen(false)}>About</Link>
            <Link to="/contact" style={styles.navLink} onClick={() => setMobileMenuOpen(false)}>Contact</Link>
          </div>
        )}
      </nav>

      {/* OTP Popup */}
      {otpPopup && (
        <>
          <div style={styles.overlay} onClick={() => !isSubmitting && setOtpPopup(false)}></div>
          <div style={styles.otpPopupContainer}>
            <h3>Confirm Your OTP</h3>
            <p>A verification OTP has been sent to your email. Please enter it below:</p>
            <p>Demo OTP: {demoOtp}</p>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter OTP"
              style={styles.otpInput}
              disabled={isSubmitting}
            />
            <div>
              <button 
                onClick={handleOtpSubmit} 
                style={styles.otpButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Verifying...' : 'Submit OTP'}
              </button>
              <button 
                onClick={() => setOtpPopup(false)} 
                style={styles.otpCloseButton}
                disabled={isSubmitting}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main style={styles.mainContent}>
        {/* Hero Section - Fixed on desktop, normal on mobile */}
        <section style={styles.heroSection}>
          <div style={styles.heroContent}>
            <div style={styles.heroIcon}>
              <FaClinicMedical size={48} />
            </div>
            <h2 style={styles.heroTitle}>Compassionate Care When You Need It Most</h2>
            <p style={styles.heroSubtitle}>
              Access to top medical professionals 24/7. Your health is our highest priority.
            </p>
            <div style={styles.statsContainer}>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>100+</div>
                <div style={styles.statLabel}>Certified Doctors</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>24/7</div>
                <div style={styles.statLabel}>Availability</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>10K+</div>
                <div style={styles.statLabel}>Patients Helped</div>
              </div>
            </div>
          </div>
        </section>

        {/* Form Section - Scrollable on desktop, full width on mobile */}
        <section style={styles.loginSection}>
          <div style={styles.loginFormContainer}>
            <div style={styles.loginHeader}>
              <h1 style={styles.loginTitle}>Create Account</h1>
              <p style={styles.loginSubtitle}>Join our health community today</p>
            </div>

            <form onSubmit={handleSignup} style={styles.loginForm}>
              <div style={styles.roleToggle}>
                <button 
                  type="button"
                  style={{
                    ...styles.toggleButton,
                    ...(role === 'patient' && styles.activeToggle)
                  }}
                  onClick={() => setRole('patient')}
                >
                  <FaUser /> Patient
                </button>
                <button 
                  type="button"
                  style={{
                    ...styles.toggleButton,
                    ...(role === 'doctor' && styles.activeToggle)
                  }}
                  onClick={() => setRole('doctor')}
                >
                  <FaUserMd /> Doctor
                </button>
              </div>

              <div style={styles.inputGroup}>
                <div style={styles.inputIcon}>
                  <FaUser />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors({...errors, fullName: null});
                  }}
                  required
                  placeholder="Full Name"
                  style={{
                    ...styles.formInput,
                    ...(errors.fullName && styles.errorInput)
                  }}
                />
                {errors.fullName && <div style={styles.errorText}>{errors.fullName}</div>}
              </div>

              <div style={styles.inputGroup}>
                <div style={styles.inputIcon}>
                  <MdEmail />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({...errors, email: null});
                  }}
                  required
                  placeholder="Email Address"
                  style={{
                    ...styles.formInput,
                    ...(errors.email && styles.errorInput)
                  }}
                />
                {errors.email && <div style={styles.errorText}>{errors.email}</div>}
              </div>

              <div style={styles.inputGroup}>
                <div style={styles.inputIcon}>
                  <FaLock />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({...errors, password: null});
                  }}
                  required
                  placeholder="Password (min. 12 characters)"
                  style={{
                    ...styles.formInput,
                    ...(errors.password && styles.errorInput)
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.passwordToggle}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
                {errors.password && <div style={styles.errorText}>{errors.password}</div>}
              </div>

              <div style={styles.inputGroup}>
                <div style={styles.inputIcon}>
                  <FaLock />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors({...errors, confirmPassword: null});
                  }}
                  required
                  placeholder="Confirm Password"
                  style={{
                    ...styles.formInput,
                    ...(errors.confirmPassword && styles.errorInput)
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.passwordToggle}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
                {errors.confirmPassword && <div style={styles.errorText}>{errors.confirmPassword}</div>}
              </div>

              <div style={styles.formRow}>
                <div style={{ ...styles.inputGroup, ...styles.halfWidthInput }}>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/\D/g, '');
                      setPhone(numericValue);
                      if (errors.phone) setErrors({...errors, phone: null});
                    }}
                    required
                    placeholder="Phone"
                    style={{
                      ...styles.formInput,
                      ...(errors.phone && styles.errorInput)
                    }}
                  />
                  {errors.phone && <div style={styles.errorText}>{errors.phone}</div>}
                </div>
                <div style={{ ...styles.inputGroup, ...styles.halfWidthInput }}>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^[A-Za-z\s]*$/.test(value)) {
                        setCountry(value);
                        if (errors.country) setErrors({...errors, country: null});
                      }
                    }}
                    required
                    placeholder="Country"
                    style={{
                      ...styles.formInput,
                      ...(errors.country && styles.errorInput)
                    }}
                  />
                  {errors.country && <div style={styles.errorText}>{errors.country}</div>}
                </div>
              </div>

              {role === 'doctor' && (
                <>
                  <div style={styles.inputGroup}>
                    <input
                      type="text"
                      value={linkedIn}
                      onChange={(e) => {
                        setLinkedIn(e.target.value);
                        if (errors.linkedIn) setErrors({...errors, linkedIn: null});
                      }}
                      required
                      placeholder="LinkedIn Profile URL"
                      style={{
                        ...styles.formInput,
                        ...(errors.linkedIn && styles.errorInput)
                      }}
                    />
                    {errors.linkedIn && <div style={styles.errorText}>{errors.linkedIn}</div>}
                  </div>
                  <div style={styles.inputGroup}>
                    <input
                      type="text"
                      value={medicalReg}
                      onChange={(e) => {
                        setMedicalReg(e.target.value);
                        if (errors.medicalReg) setErrors({...errors, medicalReg: null});
                      }}
                      required
                      placeholder="Medical Registration Number"
                      style={{
                        ...styles.formInput,
                        ...(errors.medicalReg && styles.errorInput)
                      }}
                    />
                    {errors.medicalReg && <div style={styles.errorText}>{errors.medicalReg}</div>}
                  </div>
                  <div style={styles.inputGroup}>
                    <input
                      type="text"
                      value={Cv}
                      onChange={(e) => {
                        setCv(e.target.value);
                        if (errors.Cv) setErrors({...errors, Cv: null});
                      }}
                      required
                      placeholder="CV URL"
                      style={{
                        ...styles.formInput,
                        ...(errors.Cv && styles.errorInput)
                      }}
                    />
                    {errors.Cv && <div style={styles.errorText}>{errors.Cv}</div>}
                  </div>
                </>
              )}

              <div style={styles.recaptchaContainer}>
                <ReCAPTCHA
                  sitekey={recaptchaSiteKey}
                  onChange={handleRecaptchaChange}
                  data-test-type="image"
                />
              </div>
              {errors.recaptcha && <div style={styles.recaptchaError}>{errors.recaptcha}</div>}

              <button
                type="submit"
                style={styles.loginButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Continue'} <FaArrowRight style={{ marginLeft: '8px' }} />
              </button>
            </form>

            <div style={styles.signupLink}>
              Already have an account?{' '}
              <Link to="/login" style={styles.authLink}>
                Log in
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}