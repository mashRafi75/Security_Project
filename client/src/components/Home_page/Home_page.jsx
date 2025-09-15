import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogout } from '../../contexts/logout';
import { useAuth } from '../../contexts/AuthContext';
import { 
  collection, addDoc, doc, deleteDoc, updateDoc, 
  arrayUnion, serverTimestamp, query, orderBy, onSnapshot,
  arrayRemove, where, limit  
} from 'firebase/firestore';
import { db } from '../../firebase';
import { formatDistanceToNow } from 'date-fns';
import { 
  FiMenu, FiX, FiUser, FiCalendar, FiMessageSquare, FiBookOpen,
  FiSearch, FiLogOut, FiArrowRight, FiHome, FiPlus, FiHeart 
} from 'react-icons/fi';
import { 
  FaClinicMedical, FaUserMd, FaRegHospital, 
  FaRobot, FaChevronRight 
} from 'react-icons/fa';
import { 
  MdHealthAndSafety, MdOutlineMedicalServices,
  MdOutlineHealthAndSafety 
} from 'react-icons/md';
import { BiBrain, BiPlusMedical } from 'react-icons/bi';
import { TbReportMedical, TbHeartbeat } from 'react-icons/tb';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import validator from 'validator';

const HomePage = () => {
  const navigate = useNavigate();
  const handleLogout = useLogout();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFeature, setActiveFeature] = useState(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [activeMobileTab, setActiveMobileTab] = useState('home');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef(null);
  const { currentUser } = useAuth();


  // Rate limiting state
  const [lastSubmissionTime, setLastSubmissionTime] = useState(0);
  const [submissionAttempts, setSubmissionAttempts] = useState(0);

  const onLogoutClick = async () => {
    await handleLogout();
  };

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    body: "",
    role: "user",
    userId: currentUser.uid
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("");


  // Enhanced input validation
  const validateInput = (name, value) => {
    switch (name) {
      case 'email':
        return validator.isEmail(value) ? DOMPurify.sanitize(value) : '';
      case 'name':
        return validator.isLength(value, { min: 2, max: 50 }) && 
               validator.matches(value, /^[a-zA-Z\s]+$/) ? 
               DOMPurify.sanitize(value) : '';
      case 'subject':
        return validator.isLength(value, { min: 5, max: 100 }) ? 
               DOMPurify.sanitize(value) : '';
      case 'body':
        return validator.isLength(value, { min: 10, max: 1000 }) ? 
               DOMPurify.sanitize(value) : '';
      default:
        return DOMPurify.sanitize(value);
    }
  };

  const handleChange = (e) => {
    const sanitizedValue = validateInput(e.target.name, e.target.value);
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: sanitizedValue
    }));
  };


  // Rate limiting for form submissions
  const canSubmitForm = () => {
    const now = Date.now();
    const timeDiff = now - lastSubmissionTime;
    
    if (timeDiff < 30000) { // for 30 second cooldown
      if (submissionAttempts >= 3) {
        setStatus("Too many attempts. Please wait 30 seconds.");
        return false;
      }
      setSubmissionAttempts(prev => prev + 1);
    } else {
      setSubmissionAttempts(1);
      setLastSubmissionTime(now);
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Rate limiting check
    if (!canSubmitForm()) {
      return;
    }

    // Additional validation
    if (!validator.isEmail(formData.email)) {
      setStatus("Please enter a valid email address.");
      return;
    }

    if (!validator.isLength(formData.name, { min: 2 })) {
      setStatus("Name must be at least 2 characters long.");
      return;
    }

    setIsSubmitting(true);
    setStatus("");

    try {
      await addDoc(collection(db, "report"), {
        ...formData,
        createdAt: serverTimestamp(),
        ipAddress: await getClientIP() // Log IP for security monitoring
      });

      setFormData({ name: "", email: "", subject: "", body: "", role: "non-user", userId: currentUser.uid });
      setStatus("Message sent successfully!");
    } catch (error) {
      console.error("Error sending message:", error);
      setStatus("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get client IP for security logging
  const getClientIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Secure search query
  const handleSearch = (e) => {
    e.preventDefault();
    const sanitizedQuery = DOMPurify.sanitize(searchQuery.trim());
    if (sanitizedQuery) {
      navigate(`/search?q=${encodeURIComponent(sanitizedQuery)}`);
    }
  };

  // Secure AI question
  const handleAiSubmit = (e) => {
    e.preventDefault();
    const sanitizedQuestion = DOMPurify.sanitize(aiQuestion.trim());
    if (sanitizedQuestion) {
      navigate('/chatbot', { state: { initialQuestion: sanitizedQuestion } });
    }
  };

  const handleMobileNavClick = (tab) => {
    setActiveMobileTab(tab);
    if (tab === 'profile') navigate(`/profile/${currentUser.uid}`);
    if (tab === 'appointments') navigate('/AppointmentManagement');
    if (tab === 'chat') navigate('/chatbot');
    if (tab === 'Blog_page') navigate('/Blog_page');
    if (tab === 'home') navigate('/');
  };

  const parseAnyTimestamp = (timestamp) => {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (typeof timestamp === 'string') return new Date(timestamp);
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return new Date();
  };

  const formatDateSafe = (date) => {
    const dateObj = parseAnyTimestamp(date);
    if (isNaN(dateObj.getTime())) return 'just now';
    return formatDistanceToNow(dateObj, { addSuffix: true });
  };

  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: parseAnyTimestamp(doc.data().createdAt)
      }));
      
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.read).length);
    });

    return unsubscribe;
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const colors = {
    primary: '#ffffff',
    secondary: '#f8f9fa',
    accent: '#4f46e5',
    accent2: '#10b981',
    accent3: '#3b82f6',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    highlight: '#e0e7ff',
    border: '#e2e8f0',
    success: '#10b981',
    danger: '#ef4444',
    purple: '#8b5cf6',
    pink: '#ec4899',
    lightGray: '#f1f5f9',
    mediumGray: '#e2e8f0',
    darkGray: '#94a3b8'
  };

  const containerStyle = {
    width: '100vw',
    minHeight: '100vh',
    margin: 0,
    padding: 0,
    backgroundColor: colors.primary,
    color: colors.textPrimary,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    overflowX: 'hidden',
    boxSizing: 'border-box',
    paddingBottom: isMobile ? '80px' : '0',
  };

  const navStyle = {
    display: 'flex',
    width: '100%', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '24px', 
    backgroundColor: 'white', 
    borderBottom: '1px solid #e2e8f0', 
    marginBottom: '24px', 
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
    boxSizing: 'border-box' 
  };

  const logoStyle = {
    display: 'flex',
    marginRight: '12rem',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: isMobile ? '1.25rem' : '1.5rem',
    fontWeight: '700',
    cursor: 'pointer',
    color: colors.accent,
  };

  const desktopNavLinksStyle = {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'center',
  };

  const navButtonStyle = {
    background: 'transparent',
    border: 'none',
    color: colors.textPrimary,
    fontSize: '0.95rem',
    fontWeight: '500',
    cursor: 'pointer',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    ':hover': {
      color: colors.accent,
    },
  };

  const mobileMenuButtonStyle = {
    background: 'transparent',
    border: 'none',
    color: colors.textPrimary,
    fontSize: '1.5rem',
    cursor: 'pointer',
    display: isMobile ? 'block' : 'none',
  };

  const mobileMenuVariants = {
    hidden: { x: '100%' },
    visible: { x: 0 },
    exit: { x: '100%' }
  };

  const MobileMenu = () => (
    <AnimatePresence>
      {mobileMenuOpen && (
        <>
          <motion.div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 150,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleMobileMenu}
          />
          <motion.div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: '85%',
              maxWidth: '320px',
              height: '100vh',
              background: colors.primary,
              boxShadow: '-5px 0 15px rgba(0, 0, 0, 0.1)',
              zIndex: 200,
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={mobileMenuVariants}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <button 
              style={{
                alignSelf: 'flex-end',
                background: 'transparent',
                border: 'none',
                fontSize: '1.5rem',
                color: colors.textPrimary,
                cursor: 'pointer',
                marginBottom: '1rem',
              }} 
              onClick={toggleMobileMenu}
            >
              <FiX />
            </button>
            <a 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                color: colors.textPrimary,
                textDecoration: 'none',
                fontSize: '1.1rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                ':hover': {
                  background: colors.highlight,
                  color: colors.accent,
                },
              }} 
              onClick={() => { navigate(`/profile/${currentUser.uid}`); toggleMobileMenu(); }}
            >
              <FiUser /> Profile
            </a>
            <a 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                color: colors.textPrimary,
                textDecoration: 'none',
                fontSize: '1.1rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                ':hover': {
                  background: colors.highlight,
                  color: colors.accent,
                },
              }} 
              onClick={() => { navigate('/AppointmentManagement'); toggleMobileMenu(); }}
            >
              <FiCalendar /> Appointments
            </a>
            <a 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                color: colors.textPrimary,
                textDecoration: 'none',
                fontSize: '1.1rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                ':hover': {
                  background: colors.highlight,
                  color: colors.accent,
                },
              }} 
              onClick={() => { navigate('/chatbot'); toggleMobileMenu(); }}
            >
              <FiMessageSquare /> AI Assistant
            </a>
            <a 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#333',
                textDecoration: 'none',
                fontSize: '1.1rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                transition: 'background 0.2s ease',
                ':hover': {
                  background: '#f0f0f0',
                },
              }} 
              onClick={() => navigate('/blog')}
            >
              <FiBookOpen /> Blog
            </a>
            <a 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                color: colors.textPrimary,
                textDecoration: 'none',
                fontSize: '1.1rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                ':hover': {
                  background: colors.highlight,
                  color: colors.accent,
                },
              }} 
              onClick={() => { navigate('/medical-list'); toggleMobileMenu(); }}
            >
              <FaRegHospital /> Medical Centers
            </a>
            <a 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                color: colors.textPrimary,
                textDecoration: 'none',
                fontSize: '1.1rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                ':hover': {
                  background: colors.highlight,
                  color: colors.accent,
                },
              }} 
              onClick={() => { navigate('/doctors'); toggleMobileMenu(); }}
            >
              <FaUserMd /> Doctors
            </a>
            <a 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                color: colors.accent,
                textDecoration: 'none',
                fontSize: '1.1rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                ':hover': {
                  background: colors.highlight,
                },
              }} 
              onClick={() => { onLogoutClick(); toggleMobileMenu(); }}
            >
              <FiLogOut /> Logout
            </a>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  const mobileNavBarStyle = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: colors.primary,
    display: isMobile ? 'flex' : 'none',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderTop: `1px solid ${colors.border}`,
    zIndex: 90,
    boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
  };

  const mobileNavButtonStyle = (active) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: active ? colors.accent : colors.textSecondary,
    fontSize: '0.7rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
    padding: '0.5rem 0',
  });

  const mobileNavIconStyle = (active) => ({
    fontSize: '1.4rem',
    marginBottom: '0.25rem',
    color: active ? colors.accent : colors.textSecondary,
    transition: 'all 0.2s ease',
  });

  const NotificationBell = () => (
    <div style={{ position: 'relative' }} ref={notificationsRef}>
      <button 
        style={{
          background: 'none',
          border: 'none',
          color: colors.textPrimary,
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'all 0.2s ease',
          ':hover': {
            backgroundColor: colors.highlight,
          }
        }}
        onClick={() => {
          setShowNotifications(!showNotifications);
          if (!showNotifications && unreadCount > 0) {
            notifications.forEach(async (notification) => {
              if (!notification.read) {
                await markAsRead(notification.id);
              }
            });
          }
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.37 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.64 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" fill="currentColor"/>
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            backgroundColor: colors.danger,
            color: colors.primary,
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            border: `2px solid ${colors.primary}`
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <motion.div 
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 10px)',
            width: isMobile ? '90vw' : '350px',
            maxHeight: '400px',
            overflowY: 'auto',
            backgroundColor: colors.primary,
            borderRadius: '12px',
            boxShadow: '0 5px 20px rgba(0,0,0,0.15)',
            zIndex: 1100,
            border: `1px solid ${colors.border}`,
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <div style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            backgroundColor: colors.primary,
            zIndex: 1,
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '1rem', 
              fontWeight: '600',
              color: colors.textPrimary 
            }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button 
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.accent,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  ':hover': {
                    backgroundColor: colors.highlight,
                  }
                }}
                onClick={async () => {
                  await Promise.all(
                    notifications
                      .filter(n => !n.read)
                      .map(n => markAsRead(n.id))
                  );
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ 
              padding: '24px', 
              textAlign: 'center', 
              color: colors.textSecondary,
              fontSize: '0.9rem'
            }}>
              No notifications yet
            </div>
          ) : (
            notifications.map(notification => (
              <div 
                key={notification.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: `1px solid ${colors.border}`,
                  backgroundColor: !notification.read ? colors.highlight : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  ':hover': {
                    backgroundColor: colors.highlight,
                  }
                }}
                onClick={async () => {
                  await markAsRead(notification.id);
                  setShowNotifications(false);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: colors.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.primary,
                    flexShrink: 0,
                  }}>
                    {notification.senderName ? notification.senderName.charAt(0) : 'N'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px'
                    }}>
                      <strong style={{ 
                        fontSize: '0.9rem', 
                        color: colors.textPrimary 
                      }}>
                        {notification.senderName || 'System'}
                      </strong>
                      {!notification.read && (
                        <span style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: colors.accent
                        }}></span>
                      )}
                    </div>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '0.9rem',
                      color: colors.textPrimary,
                      lineHeight: '1.4'
                    }}>
                      {notification.message}
                    </p>
                    <div style={{ 
                      fontSize: '0.75rem',
                      color: colors.textSecondary,
                      marginTop: '6px'
                    }}>
                      {formatDateSafe(notification.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}
    </div>
  );

  const FeatureCard = ({ icon, title, description, onClick, isActive }) => {
    return (
      <motion.div
        style={{
          background: isActive ? colors.highlight : colors.primary,
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          border: isActive ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
          transform: isActive ? 'translateY(-5px)' : 'none',
        }}
        onClick={onClick}
        onMouseEnter={() => !isMobile && setActiveFeature(title)}
        onMouseLeave={() => !isMobile && setActiveFeature(null)}
        whileHover={{ y: -5 }}
      >
        <div style={{
          fontSize: '2rem',
          marginBottom: '1.25rem',
          color: isActive ? colors.accent : colors.textPrimary,
          transition: 'all 0.3s ease',
        }}>
          {icon}
        </div>
        <h3 style={{
          fontSize: '1.1rem',
          fontWeight: '600',
          marginBottom: '0.75rem',
          color: colors.textPrimary,
        }}>
          {title}
        </h3>
        <p style={{
          fontSize: '0.9rem',
          color: colors.textSecondary,
          lineHeight: '1.6',
        }}>
          {description}
        </p>
      </motion.div>
    );
  };

  return (
    <div style={containerStyle}>
      <meta http-equiv="X-Content-Type-Options" content="nosniff" />
      <meta http-equiv="X-Frame-Options" content="DENY" />
      <meta http-equiv="X-XSS-Protection" content="1; mode=block" />
      
      {/* Navigation */}
      <nav style={navStyle}>
        <div style={logoStyle} onClick={() => navigate('/')}>
          <MdHealthAndSafety style={{ fontSize: '1.5em' }} />
          <span>SympticAI</span>
        </div>

        {/* Desktop Navigation */}
        <div style={{ ...desktopNavLinksStyle, display: isMobile ? 'none' : 'flex' }}>
          <button
            style={navButtonStyle}
            onClick={() => navigate('/AppointmentManagement')}
          >
            <FiCalendar style={{ marginRight: '0.5rem' }} />
            Appointments
          </button>
          <button
            style={navButtonStyle}
            onClick={() => navigate('/Blog_page')}
          >
            <FiBookOpen style={{ marginRight: '0.5rem' }} />
            Blogs
          </button>
          <button
            style={navButtonStyle}
            onClick={() => navigate('/MedicalList')}
          >
            <FiHeart style={{ marginRight: '0.5rem' }} />
            Medicals
          </button>
          <button
            style={navButtonStyle}
            onClick={() => navigate(`/profile/${currentUser.uid}`)}
          >
            <FiUser style={{ marginRight: '0.5rem' }} />
            Profile
          </button>

          <NotificationBell /> 
          
          <button
            style={{
              ...navButtonStyle,
              background: colors.accent,
              color: colors.primary,
              fontWeight: '600',
              padding: '0.5rem 1.25rem',
            }}
            onClick={onLogoutClick}
          >
            <FiLogOut style={{ marginRight: '0.5rem' }} />
            Logout
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div style={{ display: 'flex', alignItems: 'center', }}>
          <button style={mobileMenuButtonStyle} onClick={toggleMobileMenu}>
            <FiMenu />
          </button>
          {isMobile && <NotificationBell />}
        </div>
      </nav>

      {/* Mobile Menu */}
      <MobileMenu />

      {/* AI Assistant Section */}
      <section
        style={{
          maxWidth: isMobile ? '90%' : '100%',
          padding: isMobile ? '1.5rem 1.5rem 1.5rem 1rem' : '2rem',
          background: `linear-gradient(135deg, ${colors.highlight}, ${colors.primary})`,
        }}
      >
        <div
          style={{
            maxWidth: isMobile ? '95%' : '95%',
            margin: '0 auto',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              textAlign: isMobile ? 'center' : 'center',
            }}
          >
            <h2
              style={{
                fontSize: isMobile ? '1.5rem' : '2rem',
                fontWeight: '700',
                marginBottom: '.1rem',
                background: `linear-gradient(90deg, ${colors.accent}, ${colors.purple})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Ask Our AI Health Assistant
            </h2>
            <p
              style={{
                fontSize: '1rem',
                color: colors.textSecondary,
                lineHeight: '1.6',
              }}
            >
              Get instant, reliable answers to your health questions from our advanced
              artificial intelligence system.
            </p>

            <motion.div
              whileHover={{ x: 5 }}
              style={{
                display: 'flex',
                width: isMobile ? '90%' : '40%',
                alignItems: 'center',
                gap: '1rem',
                background: colors.primary,
                padding: '1rem',
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)',
                flexWrap: isMobile ? 'wrap' : 'nowrap',
              }}
            >
              <div
                style={{
                  background: colors.accent,
                  color: colors.primary,
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FaRobot />
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontWeight: '600',
                    marginBottom: '0.25rem',
                    fontSize: '0.9rem',
                  }}
                >
                  Try asking:
                </p>
                <p style={{ color: colors.textSecondary, fontSize: '0.9rem' }}>
                  "What are the symptoms of migraines?"
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/HealthAIChat')}
                style={{
                  padding: '1rem',
                  background: `linear-gradient(90deg, ${colors.accent}, ${colors.purple})`,
                  color: colors.primary,
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease',
                }}
              >
                Ask AI <FiArrowRight />
              </button>

              <FaChevronRight
                style={{ marginLeft: isMobile ? '0' : 'auto', color: colors.textSecondary }}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{
        width: isMobile ? '90%' : '100%',
        padding: isMobile ? '3rem 1.5rem' : '4rem 2rem',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <motion.h2 
          style={{
            textAlign: 'center',
            fontSize: isMobile ? '1.75rem' : '2.25rem',
            fontWeight: '700',
            marginBottom: '1rem',
            color: colors.textPrimary,
          }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          Comprehensive Health Services
        </motion.h2>
        <motion.p 
          style={{
            textAlign: 'center',
            fontSize: '1rem',
            color: colors.textSecondary,
            maxWidth: '700px',
            margin: '0 auto 3rem',
            lineHeight: '1.6',
          }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          We provide a complete ecosystem for all your healthcare needs with premium quality services.
        </motion.p>

        <div style={{
          display: 'grid',
          gap: '1.5rem',
          gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
        }}>
          <FeatureCard
            icon={<FaUserMd />}
            title="Specialist Doctors"
            description="Find and consult with top-rated medical specialists in various fields."
            isActive={activeFeature === 'Specialist Doctors'}
            onClick={() => navigate('/DoctorInformation')}
          />
          <FeatureCard
            icon={<MdOutlineMedicalServices />}
            title="Medical Facilities"
            description="Locate accredited hospitals and clinics with detailed information."
            isActive={activeFeature === 'Medical Facilities'}
            onClick={() => navigate('/MedicalList')}
          />
          <FeatureCard
            icon={<BiPlusMedical />}
            title="Appointments"
            description="Manage your medical appointments and history with ease."
            isActive={activeFeature === 'Appointments'}
            onClick={() => navigate('/appointmentManagement')}
          />
          <FeatureCard
            icon={<FaRobot />}
            title="AI Diagnostics"
            description="Get preliminary assessments from our advanced AI system."
            isActive={activeFeature === 'AI Diagnostics'}
            onClick={() => navigate('/HealthAIChat')}
          />
          <FeatureCard
            icon={<BiBrain />}
            title="Blogs for your Health"
            description="Access resources and professionals for mental wellbeing."
            isActive={activeFeature === 'Mental Health'}
            onClick={() => navigate('/Blog_page')}
          />
        </div>
      </section>

      {/* Stats Section */}
      <section style={{
        width: isMobile ? '90%' : '100%',
        padding: isMobile ? '3rem 1.5rem' : '4rem 2rem',
        background: `linear-gradient(135deg, ${colors.secondary}, ${colors.primary})`,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gap: '1.5rem',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        }}>
          <motion.div 
            style={{
              textAlign: 'center',
              padding: '2rem',
              background: colors.primary,
              borderRadius: '16px',
              boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)',
              border: `1px solid ${colors.border}`,
              transition: 'all 0.3s ease',
              ':hover': {
                transform: 'translateY(-5px)',
                boxShadow: `0 10px 25px -5px ${colors.highlight}`,
              },
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div style={{
              fontSize: isMobile ? '2.25rem' : '2.75rem',
              fontWeight: '700',
              marginBottom: '0.5rem',
              background: `linear-gradient(90deg, ${colors.accent}, ${colors.purple})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>500+</div>
            <div style={{
              fontSize: '1rem',
              color: colors.textSecondary,
            }}>Qualified Specialists</div>
          </motion.div>
          <motion.div 
            style={{
              textAlign: 'center',
              padding: '2rem',
              background: colors.primary,
              borderRadius: '16px',
              boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)',
              border: `1px solid ${colors.border}`,
              transition: 'all 0.3s ease',
              ':hover': {
                transform: 'translateY(-5px)',
                boxShadow: `0 10px 25px -5px ${colors.highlight}`,
              },
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div style={{
              fontSize: isMobile ? '2.25rem' : '2.75rem',
              fontWeight: '700',
              marginBottom: '0.5rem',
              background: `linear-gradient(90deg, ${colors.accent}, ${colors.purple})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>24/7</div>
            <div style={{
              fontSize: '1rem',
              color: colors.textSecondary,
            }}>AI Support Availability</div>
          </motion.div>
          <motion.div 
            style={{
              textAlign: 'center',
              padding: '2rem',
              background: colors.primary,
              borderRadius: '16px',
              boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)',
              border: `1px solid ${colors.border}`,
              transition: 'all 0.3s ease',
              ':hover': {
                transform: 'translateY(-5px)',
                boxShadow: `0 10px 25px -5px ${colors.highlight}`,
              },
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <div style={{
              fontSize: isMobile ? '2.25rem' : '2.75rem',
              fontWeight: '700',
              marginBottom: '0.5rem',
              background: `linear-gradient(90deg, ${colors.accent}, ${colors.purple})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>98%</div>
            <div style={{
              fontSize: '1rem',
              color: colors.textSecondary,
            }}>Patient Satisfaction</div>
          </motion.div>
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
              onError={(e) => {
                e.target.style.display = 'none';
              }}
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
                minLength="2"
                maxLength="50"
                pattern="[a-zA-Z\s]+"
                title="Name should only contain letters and spaces"
              />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                required
                pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                title="Please enter a valid email address"
              />
              <input
                name="subject"
                placeholder="Subject"
                value={formData.subject}
                onChange={handleChange}
                required
                minLength="5"
                maxLength="100"
              />      
              <textarea
                name="body"
                rows="4"
                placeholder="Your Message"
                value={formData.body}
                onChange={handleChange}
                required
                minLength="10"
                maxLength="1000"
              ></textarea>
              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>
              {status && <p className="form-status">{status}</p>}
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        width: '100%',
        padding: isMobile ? '2rem 1.5rem' : '3rem 2rem',
        background: colors.textPrimary,
        color: colors.primary,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gap: '2rem',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              marginBottom: '1rem',
            }}>SympticAI</h3>
            <p style={{ color: colors.textSecondary, lineHeight: '1.6', fontSize: '0.9rem' }}>
              Revolutionizing healthcare through technology and personalized service.
            </p>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              marginBottom: '1rem',
            }}>Services</h3>
            <a href="#" style={{
              color: colors.textSecondary,
              textDecoration: 'none',
              transition: 'color 0.2s ease',
              fontSize: '0.9rem',
              ':hover': {
                color: colors.primary,
              },
            }} onClick={() => navigate('/doctors')}>
              Find Doctors
            </a>
            <a href="#" style={{
              color: colors.textSecondary,
              textDecoration: 'none',
              transition: 'color 0.2s ease',
              fontSize: '0.9rem',
              ':hover': {
                color: colors.primary,
              },
            }} onClick={() => navigate('/medical-list')}>
              Medical Centers
            </a>
            <a href="#" style={{
              color: colors.textSecondary,
              textDecoration: 'none',
              transition: 'color 0.2s ease',
              fontSize: '0.9rem',
              ':hover': {
                color: colors.primary,
              },
            }} onClick={() => navigate('/appointmentManagement')}>
              Appointments
            </a>
            <a href="#" style={{
              color: colors.textSecondary,
              textDecoration: 'none',
              transition: 'color 0.2s ease',
              fontSize: '0.9rem',
              ':hover': {
                color: colors.primary,
              },
            }} onClick={() => navigate('/chatbot')}>
              AI Assistant
            </a>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              marginBottom: '1rem',
            }}>Company</h3>
            <a href="#" style={{
              color: colors.textSecondary,
              textDecoration: 'none',
              transition: 'color 0.2s ease',
              fontSize: '0.9rem',
              ':hover': {
                color: colors.primary,
              },
            }}>
              About Us
            </a>
            <a href="#" style={{
              color: colors.textSecondary,
              textDecoration: 'none',
              transition: 'color 0.2s ease',
              fontSize: '0.9rem',
              ':hover': {
                color: colors.primary,
              },
            }}>
              Careers
            </a>
            <a href="#" style={{
              color: colors.textSecondary,
              textDecoration: 'none',
              transition: 'color 0.2s ease',
              fontSize: '0.9rem',
              ':hover': {
                color: colors.primary,
              },
            }}>
              Press
            </a>
            <a href="#" style={{
              color: colors.textSecondary,
              textDecoration: 'none',
              transition: 'color 0.2s ease',
              fontSize: '0.9rem',
              ':hover': {
                color: colors.primary,
              },
            }}>
              Contact
            </a>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              marginBottom: '1rem',
            }}>Legal</h3>
            <a href="#" style={{
              color: colors.textSecondary,
              textDecoration: 'none',
              transition: 'color 0.2s ease',
              fontSize: '0.9rem',
              ':hover': {
                color: colors.primary,
              },
            }}>
              Privacy Policy
            </a>
            <a href="#" style={{
              color: colors.textSecondary,
              textDecoration: 'none',
              transition: 'color 0.2s ease',
              fontSize: '0.9rem',
              ':hover': {
                color: colors.primary,
              },
            }}>
              Terms of Service
            </a>
            <a href="#" style={{
              color: colors.textSecondary,
              textDecoration: 'none',
              transition: 'color 0.2s ease',
              fontSize: '0.9rem',
              ':hover': {
                color: colors.primary,
              },
            }}>
              HIPAA Compliance
            </a>
            <a href="#" style={{
              color: colors.textSecondary,
              textDecoration: 'none',
              transition: 'color 0.2s ease',
              fontSize: '0.9rem',
              ':hover': {
                color: colors.primary,
              },
            }}>
              Accessibility
            </a>
          </div>
        </div>
        <div style={{
          textAlign: 'center',
          paddingTop: '2rem',
          marginTop: '2rem',
          borderTop: `1px solid ${colors.textSecondary}`,
          color: colors.textSecondary,
          fontSize: '0.85rem',
        }}>
          © {new Date().getFullYear()} SympticAI. All rights reserved.
        </div>
      </footer>

      <style jsx>{`        
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

        .contact-form input:invalid,
        .contact-form textarea:invalid {
          border-color: #ef4444;
        }

        .contact-form input:valid,
        .contact-form textarea:valid {
          border-color: #10b981;
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

        .submit-btn:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .form-status {
          text-align: center;
          padding: 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
};

export default HomePage;