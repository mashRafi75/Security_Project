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


const MedicalInformation = () => {
  const { id } = useParams();
  const [medical, setMedical] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
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
    const fetchData = async () => {
      try {
        // Fetch medical data
        const medicalDoc = await getDoc(doc(db, "medicals", id));
        if (!medicalDoc.exists()) {
          setLoading(false);
          return;
        }

        const medicalData = {
          id: medicalDoc.id,
          ...medicalDoc.data(),
          name: medicalDoc.data().name || 'Medical Facility',
          type: medicalDoc.data().type || 'Clinic',
          location: medicalDoc.data().location || 'City',
          address: medicalDoc.data().address || 'Address not specified',
          image: medicalDoc.data().image || 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
          rating: medicalDoc.data().rating || 0,
          emergencyNumber: medicalDoc.data().emergencyNumber || 'Not available',
          ambulanceNumber: medicalDoc.data().ambulanceNumber || 'Not available',
          generalNumber: medicalDoc.data().generalNumber || 'Not available',
          email: medicalDoc.data().email || 'No email provided',
          website: medicalDoc.data().website || 'No website',
          description: medicalDoc.data().description || 'Healthcare facility providing medical services',
          services: medicalDoc.data().services || [],
          facilities: medicalDoc.data().facilities || [],
          doctorIds: medicalDoc.data().doctorIds || []
        };
        setMedical(medicalData);

        // Fetch associated doctors
        if (medicalData.doctorIds && medicalData.doctorIds.length > 0) {
          const doctorsPromises = medicalData.doctorIds.map(doctorRef => {
            const doctorId = typeof doctorRef === 'string' ? doctorRef : doctorRef.id;
            return getDoc(doc(db, "doctors", doctorId));
          });
          
          const doctorsSnapshots = await Promise.all(doctorsPromises);
          const doctorsData = doctorsSnapshots
            .filter(doc => doc.exists())
            .map(doc => ({
              id: doc.id,
              userId: doc.data().userId, 
              name: doc.data().name || 'Doctor',
              speciality: doc.data().speciality || 'General Practitioner',
              image: doc.data().image || 'https://img.icons8.com/fluency/96/000000/doctor-male.png',
              workingHours: doc.data().workingHours || {},
              consultationFee: doc.data().consultationFee || 'Contact for pricing',
              hospital: medicalData.name,
              location: medicalData.location,
              rating: doc.data().rating || 4.5,
              experience: doc.data().experience || '5+ years experience',
              bio: doc.data().bio || 'Experienced medical professional with expertise in their field.',
              education: doc.data().education || 'MD, Medical University',
              languages: doc.data().languages || ['English'],
              diseases: doc.data().diseases || ['General Health', 'Preventive Care']
            }));
          setDoctors(doctorsData);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

const formatWorkingHours = (workingHours) => {
  if (!workingHours || typeof workingHours !== 'object') {
    return "Not available";
  }

  const days = Object.keys(workingHours);
  if (days.length === 0) return "Not available";

  return days.map(day => {
    const hours = workingHours[day];
    if (!hours || hours.start === undefined || hours.end === undefined) {
      return `${day}: Not available`;
    }
    return `${day}: ${formatHour(hours.start)} - ${formatHour(hours.end)}`;
  }).join(', ');
};

const formatHour = (hour) => {
  if (hour === undefined) return '';
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
};  


  const openDoctorDetails = (doctor) => {
    setSelectedDoctor(doctor);
    document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
  };

  const closeDoctorDetails = () => {
    setSelectedDoctor(null);
    document.body.style.overflow = 'auto'; // Re-enable scrolling
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading medical information...</div>;
  }

  if (!medical) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Medical facility not found</div>;
  }

  // Styles object for the modal
  const styles = {
    modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '0.5rem',
    backdropFilter: 'blur(2px)'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative',
    padding: '1rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  closeButton: {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '1.25rem',
    cursor: 'pointer',
    color: '#94a3b8',
    transition: 'color 0.15s ease',
    padding: '0.125rem',
    ':hover': {
      color: '#64748b'
    }
  },
  
  // Doctor Header in Modal
  doctorHeader: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem',
    alignItems: 'center'
  },
  modalDoctorImage: {
    width: '60px',
    height: '60px',
    borderRadius: '60px',
    objectFit: 'cover',
    border: '1px solid #f1f5f9',
    flexShrink: 0
  },
  doctorHeaderInfo: {
    flex: 1
  },
  modalDoctorName: {
    margin: '0 0 0.125rem 0',
    fontSize: '1.125rem',
    color: '#1e293b',
    fontWeight: '600'
  },
  modalDoctorSpeciality: {
    margin: '0 0 0.375rem 0',
    color: '#3b82f6',
    fontSize: '0.8125rem',
    fontWeight: '500'
  },
  modalDoctorHospital: {
    margin: '0 0 0.375rem 0',
    color: '#64748b',
    fontSize: '0.75rem'
  },
  modalRating: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.125rem',
    color: '#475569',
    fontSize: '0.75rem',
    fontWeight: '500'
  },
  
  // Details Sections
  detailsSection: {
    marginBottom: '1rem'
  },
  sectionTitle: {
    color: '#1e293b',
    marginBottom: '0.5rem',
    fontSize: '0.9375rem',
    fontWeight: '600'
  },
  doctorBio: {
    margin: 0,
    lineHeight: 1.5,
    color: '#475569',
    fontSize: '0.8125rem'
  },
  
  // Stats Grid in Modal
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '0.75rem',
    marginBottom: '1rem'
  },
  statCard: {
    backgroundColor: '#f8fafc',
    padding: '0.5rem',
    borderRadius: '0.375rem',
    border: '1px solid #f1f5f9'
  },
  statLabel: {
    margin: '0 0 0.125rem 0',
    color: '#64748b',
    fontSize: '0.6875rem',
    fontWeight: '500'
  },
  statValue: {
    margin: 0,
    color: '#1e293b',
    fontWeight: '500',
    fontSize: '0.8125rem'
  },
  
  // Diseases List
  diseasesList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.25rem'
  },
  diseaseTag: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    padding: '0.125rem 0.5rem',
    borderRadius: '9999px',
    fontSize: '0.6875rem',
    fontWeight: '500'
  },
  
  // Action Buttons
  actionButtons: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem'
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: '500',
    transition: 'background-color 0.15s ease',
    flex: 1,
    ':hover': {
      backgroundColor: '#2563eb'
    }
  },
  secondaryButton: {
    backgroundColor: 'white',
    color: '#3b82f6',
    border: '1px solid #3b82f6',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: '500',
    transition: 'all 0.15s ease',
    flex: 1,
    ':hover': {
      backgroundColor: '#f8fafc'
    }
  },
    // Responsive styles
    '@media (max-width: 768px)': {
      modalContent: {
        padding: '20px',
        width: '95%'
      },
      doctorHeader: {
        flexDirection: 'column',
        textAlign: 'center'
      },
      modalDoctorImage: {
        width: '100px',
        height: '100px'
      },
      statsGrid: {
        gridTemplateColumns: '1fr 1fr'
      }
    },
    '@media (max-width: 480px)': {
      statsGrid: {
        gridTemplateColumns: '1fr'
      },
      actionButtons: {
        flexDirection: 'column'
      }
    },
 
availabilityDay: {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
 // padding: '0.5rem',
  borderRadius: '6px',
  transition: 'all 0.2s ease',
},

dayAvailable: {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
},

dayClosed: {
  backgroundColor: '#fee2e2',
  border: '1px solid #fecaca',
  opacity: 0.7,
},

availabilityDayName: {
  fontWeight: '600',
  fontSize: '0.75rem',
  marginBottom: '0.25rem',
  textTransform: 'capitalize',
},

timeRange: {
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
},

time: {
  fontSize: '0.7rem',
  fontWeight: '500',
},

timeSeparator: {
  fontSize: '0.6rem',
  color: '#64748b',
},

closedLabel: {
  fontSize: '0.7rem',
  fontWeight: '500',
  color: '#ef4444',
}      
  };

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      minHeight: '100vh',
      minWidth: '98vw',
      width: '100%',
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
        <button 
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#3498db',
            padding: '0.5rem 0',
            fontSize: '1rem',
            cursor: 'pointer',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
          }}
          onClick={() => navigate('/MedicalList')}
        >
          ← Back to Medicals
        </button>

        <div style={{
          display: 'flex',
          gap: '2rem',
          marginBottom: '2rem',
          flexDirection: 'row',
          alignItems: 'flex-end',
          backgroundColor: 'white',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 15px rgba(0,0,0,0.05)',
        }}>
          <img 
            src={medical.image} 
            alt={medical.name}
            style={{
              width: '300px',
              height: '200px',
              objectFit: 'cover',
            }}
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60';
            }}
          />
          <div style={{
            padding: '1.5rem',
            flex: 1,
          }}>
            <h1 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '2rem',
              color: '#2c3e50',
            }}>{medical.name}</h1>
            <p style={{
              margin: '0 0 1rem 0',
              color: '#7f8c8d',
              fontSize: '1.1rem',
            }}>{medical.type}, {medical.location}</p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span style={{
                color: '#f39c12',
                fontWeight: '600',
                fontSize: '1.2rem',
              }}>⭐ {medical.rating}</span>
              <span style={{
                color: '#7f8c8d',
                fontSize: '0.9rem',
              }}>based on 245 reviews</span>
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          boxShadow: '0 2px 15px rgba(0,0,0,0.05)',
        }}>
          <div style={{
            marginBottom: '3rem',
          }}>
            <h2 style={{
              color: '#2c3e50',
              marginBottom: '1.5rem',
              fontSize: '1.5rem',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid #eee',
            }}>Overview</h2>
            <p style={{
              margin: '0 0 2rem 0',
              color: '#34495e',
              lineHeight: '1.6',
              fontSize: '1.1rem',
            }}>{medical.description}</p>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem',
            }}>
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '1rem',
                borderRadius: '6px',
              }}>
                <h3 style={{
                  margin: '0 0 0.5rem 0',
                  color: '#7f8c8d',
                  fontSize: '0.9rem',
                }}>Address</h3>
                <p>{medical.address}</p>
              </div>
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '1rem',
                borderRadius: '6px',
              }}>
                <h3 style={{
                  margin: '0 0 0.5rem 0',
                  color: '#7f8c8d',
                  fontSize: '0.9rem',
                }}>General Contact</h3>
                <p>{medical.generalNumber}</p>
              </div>
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '1rem',
                borderRadius: '6px',
              }}>
                <h3 style={{
                  margin: '0 0 0.5rem 0',
                  color: '#7f8c8d',
                  fontSize: '0.9rem',
                }}>Emergency</h3>
                <p style={{
                  color: '#e74c3c',
                  fontWeight: '600',
                }}>{medical.emergencyNumber}</p>
              </div>
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '1rem',
                borderRadius: '6px',
              }}>
                <h3 style={{
                  margin: '0 0 0.5rem 0',
                  color: '#7f8c8d',
                  fontSize: '0.9rem',
                }}>Ambulance</h3>
                <p style={{
                  color: '#e74c3c',
                  fontWeight: '600',
                }}>{medical.ambulanceNumber}</p>
              </div>
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '1rem',
                borderRadius: '6px',
              }}>
                <h3 style={{
                  margin: '0 0 0.5rem 0',
                  color: '#7f8c8d',
                  fontSize: '0.9rem',
                }}>Email</h3>
                <p>{medical.email}</p>
              </div>
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '1rem',
                borderRadius: '6px',
              }}>
                <h3 style={{
                  margin: '0 0 0.5rem 0',
                  color: '#7f8c8d',
                  fontSize: '0.9rem',
                }}>Website</h3>
                <a href={`https://${medical.website}`} style={{
                  color: '#3498db',
                  textDecoration: 'none',
                }} target="_blank" rel="noopener noreferrer">{medical.website}</a>
              </div>
            </div>
          </div>

          <div style={{
            marginBottom: '3rem',
          }}>
            <h2 style={{
              color: '#2c3e50',
              marginBottom: '1.5rem',
              fontSize: '1.5rem',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid #eee',
            }}>Services</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '1.5rem',
            }}>
              {medical.services.map((service, index) => (
                <div key={index} style={{
                  backgroundColor: '#f8f9fa',
                  padding: '1.5rem',
                  borderRadius: '6px',
                  borderLeft: '4px solid #3498db',
                }}>
                  <h3 style={{
                    margin: '0 0 0.5rem 0',
                    color: '#2c3e50',
                  }}>{service.name}</h3>
                  <p style={{
                    margin: 0,
                    color: '#7f8c8d',
                    fontSize: '0.9rem',
                  }}>Available: {service.available}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            marginBottom: '3rem',
          }}>
            <h2 style={{
              color: '#2c3e50',
              marginBottom: '1.5rem',
              fontSize: '1.5rem',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid #eee',
            }}>Facilities</h2>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.8rem',
            }}>
              {medical.facilities.map((facility, index) => (
                <span key={index} style={{
                  backgroundColor: '#e8f5e9',
                  color: '#2e7d32',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                }}>{facility}</span>
              ))}
            </div>
          </div>

          {doctors.length > 0 && (
            <div style={{
              marginBottom: '3rem',
            }}>
              <h2 style={{
                color: '#2c3e50',
                marginBottom: '1.5rem',
                fontSize: '1.5rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid #eee',
              }}>Available Doctors</h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem',
              }}>
                {doctors.map(doctor => (
                  <div 
                    key={doctor.id} 
                    style={{
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      display: 'flex',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      ':hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
                      }
                    }}
                    onClick={() => openDoctorDetails(doctor)}
                  >
                    <img 
                      src={doctor.image} 
                      alt={doctor.name}
                      style={{
                        width: '100px',
                        height: '100px',
                        objectFit: 'cover',
                      }}
                      onError={(e) => {
                        e.target.src = 'https://img.icons8.com/fluency/96/000000/doctor-male.png';
                      }}
                    />
                    <div style={{
                      padding: '1rem',
                      flex: 1,
                    }}>
                      <h3 style={{
                        margin: '0 0 0.3rem 0',
                        fontSize: '1.1rem',
                        color: '#2c3e50',
                      }}>{doctor.name}</h3>
                      <p style={{
                        margin: '0 0 0.3rem 0',
                        color: '#3498db',
                        fontSize: '0.9rem',
                      }}>{doctor.speciality}</p>
                      <p style={{
                        margin: '0 0 0.3rem 0',
                        color: '#7f8c8d',
                        fontSize: '0.9rem',
                      }}>Available: {doctor.available}</p>
                      <p style={{
                        margin: 0,
                        color: '#27ae60',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                      }}>Consultation: {doctor.consultationFee}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Doctor Details Modal */}
      {selectedDoctor && (
        <div style={styles.modalOverlay} onClick={closeDoctorDetails}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeButton} onClick={closeDoctorDetails}>×</button>
            
            {/* Doctor Header */}
            <div style={styles.doctorHeader}>
              <img 
                src={selectedDoctor.image} 
                alt={selectedDoctor.name}
                style={styles.modalDoctorImage}
                onError={(e) => {
                  e.target.src = 'https://img.icons8.com/fluency/96/000000/doctor-male.png';
                }}
              />
              <div style={styles.doctorHeaderInfo}>
                <h2 style={styles.modalDoctorName}>{selectedDoctor.name}</h2>
                <p style={styles.modalDoctorSpeciality}>{selectedDoctor.speciality}</p>
                <p style={styles.modalDoctorHospital}>
                  {selectedDoctor.hospital && `${selectedDoctor.hospital}, `}
                  {selectedDoctor.location}
                </p>
                <div style={styles.modalRating}>
                  ⭐ {selectedDoctor.rating} • {selectedDoctor.experience}
                </div>
              </div>
            </div>
            
            {/* Doctor Details */}
            <div style={styles.detailsSection}>
              <h3 style={styles.sectionTitle}>About</h3>
              <p style={styles.doctorBio}>{selectedDoctor.bio}</p>
            </div>
            
            {/* Doctor Stats */}
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <h4 style={styles.statLabel}>Consultation Fee</h4>
                <p style={styles.statValue}>{selectedDoctor.consultationFee}</p>
              </div>
<div style={styles.statCard}>
  <div style={styles.detailsSection}>
    <h3 style={styles.statLabel}>Working Hours</h3>
    <div style={styles.availabilityGrid}>
      {selectedDoctor.workingHours && Object.entries(selectedDoctor.workingHours).map(([day, hours]) => (
        <div key={day} style={{
          ...styles.availabilityDay,
          ...(hours.start !== undefined ? styles.dayAvailable : styles.dayClosed)
        }}>
          <span style={styles.availabilityDayName}>{day}</span>
          {hours.start !== undefined ? (
            <div style={styles.timeRange}>
              <span style={styles.time}>{formatHour(hours.start)}</span>
              <span style={styles.timeSeparator}>-</span>
              <span style={styles.time}>{formatHour(hours.end)}</span>
            </div>
          ) : (
            <span style={styles.closedLabel}>Closed</span>
          )}
        </div>
      ))}
    </div>
  </div>
</div>
              <div style={styles.statCard}>
                <h4 style={styles.statLabel}>Education</h4>
                <p style={styles.statValue}>{selectedDoctor.education}</p>
              </div>
              <div style={styles.statCard}>
                <h4 style={styles.statLabel}>Languages</h4>
                <p style={styles.statValue}>{selectedDoctor.languages.join(', ')}</p>
              </div>
            </div>
            
            {/* Treated Conditions */}
            {selectedDoctor.diseases.length > 0 && (
              <div style={styles.detailsSection}>
                <h3 style={styles.sectionTitle}>Treats</h3>
                <div style={styles.diseasesList}>
                  {selectedDoctor.diseases.map(disease => (
                    <span key={disease} style={styles.diseaseTag}>{disease}</span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div style={styles.actionButtons}>
              <button style={styles.primaryButton}
              onClick={() => navigate(`/AppointmentBooking/${selectedDoctor.id}`)}>Book Appointment</button>
              <button style={styles.secondaryButton}
              onClick={() => navigate(`/Profile/${selectedDoctor.userId}`)}>View Profile</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalInformation;