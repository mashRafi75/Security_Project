import { useState, useEffect, useMemo, useRef } from 'react';
import { db,auth } from '../../firebase';
import { doc, getDoc, updateDoc, getFirestore, collection, query, where, getDocs,
   orderBy, limit, onSnapshot 
 } from 'firebase/firestore';
import { useMediaQuery } from 'react-responsive';
import { FiMenu, FiX, FiEdit2, FiPlus, FiTrash2, FiClock, FiCalendar, FiHeart, FiActivity,
  FiBookOpen, FiLogOut, FiHome 
 } from 'react-icons/fi';
import { FaUserMd } from 'react-icons/fa'; 
import { useParams } from 'react-router-dom';
import { MdHealthAndSafety } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { useLogout } from '../../contexts/logout';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import Modal from 'react-modal';
Modal.setAppElement('#root');




const MedicalList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [medicals, setMedicals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
  const { userId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const onLogoutClick = async () => {
    await handleLogout();
  };
  const handleLogout = useLogout();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

    // Safe date formatter
    const formatDateSafe = (date) => {
      const dateObj = parseAnyTimestamp(date);
      if (isNaN(dateObj.getTime())) return 'just now';
      return formatDistanceToNow(dateObj, { addSuffix: true });
    };

    const parseAnyTimestamp = (timestamp) => {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (typeof timestamp === 'string') return new Date(timestamp);
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return new Date();
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

  const notificationsRef = useRef(null);
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
  

  const navStyle = { 
    display: 'flex',
    width: '98.8vw', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '24px', 
    backgroundColor: 'white', 
    borderBottom: '1px solid #e2e8f0', 
    marginBottom: '24px', 
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
    boxSizing: 'border-box' 
  };
  const mobileNavStyle = {
    position: 'fixed',
    top: '0',
    right: '0',
    width: '280px',
    height: '100vh',
    backgroundColor: 'white',
    padding: '24px',
    boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
    zIndex: '1000',
    transform: isMenuOpen ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 0.3s ease-in-out',
  };
  const modalStyle = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      maxWidth: '500px',
      width: '90%',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      padding: '24px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    },
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
    },

  };
  const logoStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: isMobile ? '1.25rem' : '1.5rem',
    fontWeight: '700',
    cursor: 'pointer',
    color: '#4f46e5',
  };
    const colors = {
    primary: '#ffffff',
    secondary: '#f8f9fa',
    accent: '#4f46e5',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    highlight: '#e0e7ff',
    border: '#e2e8f0',
    danger: '#ef4444',
    purple: '#8b5cf6',
    darkGray: '#94a3b8'
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



  useEffect(() => {
    const fetchMedicals = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "medicals"));
        const medicalsData = querySnapshot.docs.map(doc => ({
          // Default values
          id: doc.id,
          name: 'Medical Facility',
          type: 'Clinic',
          location: 'City',
          image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
          rating: 0,
          emergencyNumber: 'Not available',
          ambulanceNumber: 'Not available',
          description: 'Healthcare facility providing medical services',
          services: [],
          doctorIds: [],
          // Override with Firestore data
          ...doc.data()
        }));
        setMedicals(medicalsData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching medicals:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchMedicals();
  }, []);

  const filteredMedicals = useMemo(() => {
    return medicals.filter(medical => {
      const searchLower = searchTerm.toLowerCase();
      const nameLower = medical.name?.toLowerCase() || '';
      const typeLower = medical.type?.toLowerCase() || '';
      
      const matchesSearch = nameLower.includes(searchLower) || 
                          typeLower.includes(searchLower);
      const matchesLocation = !locationFilter || 
                            medical.location?.toLowerCase() === locationFilter.toLowerCase();
      
      return matchesSearch && matchesLocation;
    });
  }, [medicals, searchTerm, locationFilter]);

  const locations = useMemo(() => 
    [...new Set(medicals.map(m => m.location).filter(Boolean))],
  [medicals]
  );

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading medical facilities...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>
      Error loading data: {error}
    </div>;
  }

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      minHeight: '100vh',
      minWidth: '98.8vw',
      backgroundColor: '#f5f7fa',
      color: '#333',
    }}>
      <div style={navStyle}>
        <div style={logoStyle} onClick={() => navigate('/Home_page')}>
          <MdHealthAndSafety style={{ fontSize: '1.5em',}} />
          <span>SympticAI</span>
        </div>

        {isMobile ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', }}>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}
              >
                {isMenuOpen ? <FiX /> : <FiMenu />}
              </button>
              {isMobile && <NotificationBell />}
            </div>

            <div style={mobileNavStyle}>
              <button 
                onClick={() => setIsMenuOpen(false)} 
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}
              >
                <FiX />
              </button>
              <ul style={{ listStyle: 'none', padding: 0, marginTop: '40px' }}>
                <li style={{ padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}onClick={() => navigate('/Home_page')}>Home</li>
                <li style={{ padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}onClick={() => navigate('/AppointmentManagement')}>Appointments</li>
                <li style={{ padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}onClick={() => navigate('/Blog_page')}>Blogs</li>
                <li style={{ padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}onClick={() => navigate('/DoctorInformation')}>Doctors</li>
                <li style={{ padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}onClick={() => navigate(`/profile/${currentUser.uid}`)}>Profile</li>
                <li style={{ padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}onClick={onLogoutClick}>Log Out</li>
              </ul>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '5px' }}>
            <button style={navButtonStyle} onClick={() => navigate('/Home_page')}>
            <FiHome  style={{ marginRight: '0.5rem' }} /> Home </button>
            <button style={navButtonStyle} onClick={() => navigate('/AppointmentManagement')}>
            <FiCalendar style={{ marginRight: '0.5rem' }} /> Appointments </button>
            <button style={navButtonStyle} onClick={() => navigate('/Blog_page')}>
            <FiBookOpen style={{ marginRight: '0.5rem' }} /> Blogs </button>
            <button style={navButtonStyle} onClick={() => navigate('/DoctorInformation')}>
            <FaUserMd  style={{ marginRight: '0.5rem' }} /> Doctors </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img 
                  src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.fullName || currentUser.email.split('@')[0])}`} 
                  alt={currentUser.fullName} 
                  style={{width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${colors.white}`      
                  }}/>
                      <span 
                        style={{ fontWeight: '500', cursor: 'pointer', color:'black', }}
                        onClick={() => navigate(`/profile/${currentUser.uid}`)}
                      >
                        {currentUser.fullName || currentUser.email}
                      </span>
              </div>             
            <NotificationBell /> 
            <button style={navButtonStyle} onClick={onLogoutClick}>
            <FiLogOut style={{ marginRight: '0.5rem' }} /> Log Out </button>



          </div>
        )}
        
      </div>






      <div style={{
        maxWidth: '1200px',
        margin: '2rem auto',
        padding: '0 1rem',
      }}>
        {/* <h2 style={{ fontSize: '2rem', color: '#2c3e50', marginBottom: '1.5rem' }}>Find Medical Facilities</h2> */}
        
        <div style={{
          backgroundColor: 'white',
          padding: '.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 15px rgba(0,0,0,0.05)',
          marginBottom: '2rem',
          display: "flex",
          justifyContent: "flex-start", // Aligns everything to the left
          alignItems: "center",
          gap: "1rem",
          
          
        }}>
          <input
            type="text"
            aria-label="Search medical facilities"
            placeholder="Search medicals..."
            style={{
              width: '100%',        // fill available space, if container allows
              maxWidth: '200px',    // but no wider than 200px
              padding: '0.5rem 0.75rem',
              fontSize: '0.8125rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              transition: 'all 0.15s ease',
              ':focus': {
                outline: 'none',
                borderColor: '#3b82f6',
                boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)'
              },
              
            }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '0.5rem',
              width: '100%'
          }}>
            <select 
              aria-label="Filter by location"
              style={{
                width: '100%',
                padding: '0.5rem 0.625rem',
                fontSize: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                backgroundColor: 'white',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                appearance: 'none',
                backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.375rem center',
                backgroundSize: '0.5rem auto',
              }}
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="">All Locations</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', // Fixed card size
            gap: '1rem',
        }}>
        {filteredMedicals.length > 0 ? (
          filteredMedicals.map(medical => (
            <div 
              key={medical.id} 
              style={{
                backgroundColor: 'white',
                borderRadius: '6px',
                overflow: 'hidden',
                boxShadow: '0 1px 10px rgba(0,0,0,0.05)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                minHeight: '400px', // Fixed height for all cards
                display: 'flex', // Makes sure the content is contained
                flexDirection: 'column', // Stack elements properly
                justifyContent: 'space-between', // Keep spacing balanced
                ':hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: '0 3px 12px rgba(0,0,0,0.1)'
                }
              }}
            >
              <img 
                src={medical.image} 
                alt={`${medical.name} facility`}
                style={{
                  width: '100%',
                  height: '150px', // Reduced image height
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60';
                }}
              />
              <div style={{ padding: '1rem', flex: '1' }}> {/* Content fits evenly */}
                <h3 style={{
                  margin: '0 0 0.3rem 0',
                  fontSize: '1.1rem',
                  color: '#2c3e50',
                  whiteSpace: 'nowrap', // Prevents multi-line overflow
                  overflow: 'hidden',
                  textOverflow: 'ellipsis', // Adds "..." for overflow text
                }}>{medical.name}</h3>
                <p style={{
                  margin: '0 0 0.8rem 0',
                  color: '#7f8c8d',
                  fontSize: '0.85rem',
                }}>{medical.type}, {medical.location}</p>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.8rem',
                  fontSize: '0.85rem',
                }}>
                  <span style={{
                    color: '#f39c12',
                    fontWeight: '600',
                  }}>
                    ⭐ {medical.rating.toFixed(1)}
                  </span>
                  <span style={{
                    color: '#e74c3c',
                    fontWeight: '600',
                  }}>
                    Emergency: {medical.emergencyNumber}
                  </span>
                </div>

                <p style={{
                  margin: '0 0 1rem 0',
                  color: '#34495e',
                  fontSize: '0.85rem',
                  lineHeight: '1.4',
                  maxHeight: '60px', // Limits text to prevent resizing
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>{medical.description}</p>

                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.4rem',
                  marginBottom: '1rem',
                }}>
                  {(medical.services || []).slice(0, 3).map((service, index) => (
                    <span 
                      key={index} 
                      style={{
                        backgroundColor: '#e8f5e9',
                        color: '#2e7d32',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '16px',
                        fontSize: '0.75rem',
                      }}
                    >
                      {service.name || service}
                    </span>
                  ))}
                  {(medical.services || []).length > 3 && (
                    <span style={{
                      color: '#7f8c8d',
                      fontSize: '0.75rem',
                      alignSelf: 'center',
                    }}>
                      +{(medical.services || []).length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <button 
                aria-label={`View details for ${medical.name}`}
                style={{
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  padding: '0.6rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  width: '100%',
                  transition: 'background-color 0.3s ease',
                  ':hover': {
                    backgroundColor: '#2980b9'
                  }
                }}
                onClick={() => navigate(`/MedicalInformation/${medical.id}`)}
              >
                View Details
              </button>
            </div>
          ))
        ) : (


            <div style={{
              textAlign: 'center',
              gridColumn: '1 / -1',
              padding: '2rem',
            }}>
              <p style={{
                color: '#7f8c8d',
                fontSize: '1.2rem',
                marginBottom: '1rem'
              }}>
                No medical facilities found matching your criteria.
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setLocationFilter('');
                }}
                style={{
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MedicalList;