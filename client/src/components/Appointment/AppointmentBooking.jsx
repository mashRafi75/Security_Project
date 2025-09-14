import { useState, useEffect, useMemo, useRef } from 'react';
import { db,auth } from '../../firebase';
import { doc, getDoc, updateDoc, getFirestore, collection, query, where, getDocs,
   orderBy, limit, onSnapshot, addDoc, serverTimestamp 
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
import moment from 'moment'; // Added moment for proper date handling
Modal.setAppElement('#root');


const AppointmentBooking = () => {
  const { id } = useParams();

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




  // State management
  const [doctor, setDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [patientInfo, setPatientInfo] = useState({
    name: currentUser?.fullName || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    patientId: currentUser?.uid || '',
    reason: ''
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Fetch doctor data
  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const doctorRef = doc(db, "doctors", id);
        const doctorSnap = await getDoc(doctorRef);
        
        if (!doctorSnap.exists()) {
          throw new Error("Doctor not found");
        }

        setDoctor({
          id: doctorSnap.id,
          ...doctorSnap.data()
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctor();
  }, [id]);

  // Generate available dates based on doctor's working days
const getAvailableDates = () => {
  if (!doctor?.workingHours) return [];
  
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize time
  
  for (let i = 0; i < 14; i++) { // Next 14 days
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Check if this day has working hours defined
    if (doctor.workingHours[dayName]) {
      // Check if date is in unavailableDates
      const dateStr = moment(date).format('YYYY-MM-DD');
      if (!doctor.unavailableDates?.includes(dateStr)) {
        dates.push(date);
      }
    }
  }
  
  return dates;
};

  // Generate time slots considering breaks
  const generateTimeSlots = (date) => {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dayHours = doctor.workingHours[dayName] || doctor.workingHours;
    if (!dayHours) return [];
    
    const slots = [];
    const breaks = doctor.breaks?.filter(b => b.day === dayName) || [];
    
    // Convert breaks to minutes for easier comparison
    const breakIntervals = breaks.map(b => ({
      start: b.start * 60,
      end: b.end * 60
    }));
    
    // Generate slots in 30-minute intervals
    for (let minutes = dayHours.start * 60; minutes < dayHours.end * 60; minutes += 30) {
      const isInBreak = breakIntervals.some(
        b => minutes >= b.start && minutes + 30 <= b.end
      );
      
      if (!isInBreak) {
        const startHour = Math.floor(minutes / 60);
        const startMin = minutes % 60;
        const endHour = Math.floor((minutes + 30) / 60);
        const endMin = (minutes + 30) % 60;
        
        const timeStr = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')} - ${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
        
        slots.push({
          time: timeStr,
          startMinutes: minutes,
          endMinutes: minutes + 30
        });
      }
    }
    
    return slots;
  };

  // Fetch available slots and check bookings
  const fetchAvailableSlots = async (date) => {
    if (!date || !doctor) return;
    
    setLoadingSlots(true);
    try {
      // 1. Generate all possible slots
      const allSlots = generateTimeSlots(date);
      
      // 2. Fetch existing appointments for this date
      const dateStr = moment(date).format('YYYY-MM-DD'); // Consistent date format
      const q = query(
        collection(db, "appointments"),
        where("doctorId", "==", id),
        where("date", "==", dateStr),
        where("status", "in", ["requested", "accepted", "confirmed"]) // Only count active appointments
      );
      
      const querySnapshot = await getDocs(q);
      const bookedSlots = querySnapshot.docs.map(doc => doc.data().timeSlot);
      
      // 3. Mark availability
      const slotsWithAvailability = allSlots.map(slot => ({
        ...slot,
        isAvailable: !bookedSlots.includes(slot.time)
      }));
      
      setAvailableSlots(slotsWithAvailability);
    } catch (err) {
      setError("Failed to fetch availability");
      console.error(err);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Handle date selection
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    fetchAvailableSlots(date);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Validate required fields
      if (!patientInfo.reason) {
        throw new Error("Please provide a reason for your appointment");
      }

      // Create appointment in Firestore with properly formatted date
      await addDoc(collection(db, "appointments"), {
        doctorId: id,
        doctorName: doctor.name,
        doctorSpeciality: doctor.speciality,
        patientInfo,
        date: moment(selectedDate).format('YYYY-MM-DD'), // Fixed date format
        timeSlot: selectedSlot,
        status: "requested",
        paymentStatus: "pending",
        createdAt: serverTimestamp()
      });
      
      setBookingSuccess(true);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (date) => {
    return moment(date).format('ddd, MMM Do YYYY'); // Using moment for consistent display
  };

  // Loading state
  if (loading || !doctor) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        Loading doctor information...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
        Error: {error}
        <button 
          onClick={() => setError(null)}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Success state
  if (bookingSuccess) {
    return (
      <div style={{
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        minHeight: '100vh',
        backgroundColor: '#f5f7fa'
      }}>
        <header style={{
          backgroundColor: '#2c3e50',
          color: 'white',
          padding: '1rem 2rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Medical Appointment System</h1>
          </div>
        </header>

        <div style={{
          maxWidth: '800px',
          margin: '2rem auto',
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 2px 15px rgba(0,0,0,0.05)',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '60px',
            color: '#4CAF50',
            marginBottom: '20px'
          }}>✓</div>
          <h2 style={{
            margin: '0 0 15px 0',
            color: '#2c3e50',
            fontSize: '28px'
          }}>Appointment Confirmed!</h2>
          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '20px',
            margin: '30px 0',
            textAlign: 'left'
          }}>
            <p style={{ margin: '10px 0', fontSize: '16px' }}>
              <strong>Doctor:</strong> {doctor.name}
            </p>
            <p style={{ margin: '10px 0', fontSize: '16px' }}>
              <strong>Speciality:</strong> {doctor.speciality}
            </p>
            <p style={{ margin: '10px 0', fontSize: '16px' }}>
              <strong>Date:</strong> {selectedDate && formatDate(selectedDate)}
            </p>
            <p style={{ margin: '10px 0', fontSize: '16px' }}>
              <strong>Time:</strong> {selectedSlot}
            </p>
          </div>
          <button 
            onClick={() => navigate('/Home_page')}
            style={{
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              padding: '12px 25px',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Main booking UI
  const availableDates = getAvailableDates();

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      minHeight: '100vh',
      width: '98.8vw',
      backgroundColor: '#f5f7fa'
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



      <main style={{
        maxWidth: '1200px',
        margin: '2rem auto',
        padding: '0 1rem'
      }}>
        {/* Doctor Info Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          padding: '2rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          marginBottom: '2rem',
          width: '60vw',
          margin: '0 auto',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
            flexWrap: 'wrap'
          }}>
            <img 
              src={doctor.image} 
              alt={doctor.name}
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                e.target.src = 'https://img.icons8.com/fluency/96/000000/doctor-male.png';
              }}
            />
            <div>
              <h2 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50' }}>
                {doctor.name}
              </h2>
              <p style={{ margin: '0 0 0.5rem 0', color: '#3498db', fontWeight: '500' }}>
                {doctor.speciality}
              </p>
              <p style={{ margin: '0', color: '#7f8c8d' }}>
                {doctor.hospital}
              </p>
            </div>
            <div style={{
              marginLeft: 'auto',
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.9rem'
              }}>
                ⭐ {doctor.rating}
              </div>
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.9rem'
              }}>
                Fee: ${doctor.consultationFee}
              </div>
            </div>
          </div>
        </div>

        {/* Date Selection */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          padding: '2rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          marginBottom: '2rem',
          width: '60vw',
          margin: '0 auto',
        }}>
          <h3 style={{
            margin: '0 0 1.5rem 0',
            color: '#2c3e50',
            fontSize: '1.25rem'
          }}>Select Date</h3>
          
          {availableDates.length === 0 ? (
            <p style={{ color: '#7f8c8d' }}>
              No available dates in the next two weeks. Please check back later.
            </p>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '1rem'
            }}>
              {availableDates.map((date, index) => {
                const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                return (
                  <button
                    key={index}
                    onClick={() => handleDateSelect(date)}
                    style={{
                      backgroundColor: selectedDate?.toDateString() === date.toDateString() 
                        ? '#3498db' 
                        : '#f8f9fa',
                      color: selectedDate?.toDateString() === date.toDateString() 
                        ? 'white' 
                        : '#2c3e50',
                      border: 'none',
                      padding: '1rem 0.5rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: '600' }}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div>
                      {date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Time Slot Selection */}
        {selectedDate && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '2rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            marginBottom: '2rem',
            width: '60vw',
            margin: '0 auto',
          }}>
            <h3 style={{
              margin: '0 0 1.5rem 0',
              color: '#2c3e50',
              fontSize: '1.25rem'
            }}>Select Time Slot</h3>
            
            {loadingSlots ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '2rem'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '4px solid #f3f3f3',
                  borderTop: '4px solid #3498db',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              </div>
            ) : availableSlots.length === 0 ? (
              <p style={{ color: '#7f8c8d' }}>
                No available slots for this date. Please select another date.
              </p>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '1rem'
              }}>
                {availableSlots.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedSlot(slot.time)}
                    style={{
                      backgroundColor: selectedSlot === slot.time 
                        ? '#3498db' 
                        : slot.isAvailable 
                          ? '#f8f9fa' 
                          : '#f1f1f1',
                      color: selectedSlot === slot.time 
                        ? 'white' 
                        : slot.isAvailable 
                          ? '#2c3e50' 
                          : '#95a5a6',
                      border: 'none',
                      padding: '1rem 0.5rem',
                      borderRadius: '8px',
                      cursor: slot.isAvailable ? 'pointer' : 'not-allowed',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    disabled={!slot.isAvailable}
                  >
                    {slot.time}
                    {!slot.isAvailable && (
                      <span style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(-10deg)',
                        backgroundColor: 'rgba(231, 76, 60, 0.8)',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        Booked
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Patient Information Form */}
        {selectedSlot && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '2rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            width: '60vw',
            margin: '0 auto',
            
          }}>
            <h3 style={{
              margin: '0 0 1.5rem 0',
              color: '#2c3e50',
              fontSize: '1.25rem'
            }}>Your Information</h3>
            
            <form onSubmit={handleSubmit}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: '#2c3e50',
                    fontWeight: '500'
                  }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={patientInfo.name}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      backgroundColor: '#f8f9fa'
                    }}
                  />
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.5rem'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      color: '#2c3e50',
                      fontWeight: '500'
                    }}>
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={patientInfo.email}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        backgroundColor: '#f8f9fa'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      color: '#2c3e50',
                      fontWeight: '500'
                    }}>
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={patientInfo.phone}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        backgroundColor: '#f8f9fa'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: '#2c3e50',
                    fontWeight: '500'
                  }}>
                    Reason for Appointment *
                  </label>
                  <textarea
                    name="reason"
                    value={patientInfo.reason}
                    onChange={(e) => setPatientInfo({...patientInfo, reason: e.target.value})}
                    rows="3"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      resize: 'vertical'
                    }}
                  ></textarea>
                </div>
              </div>

              {error && (
                <div style={{ 
                  color: 'red', 
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  padding: '1rem',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                  width: '100%',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Booking...' : 'Confirm Appointment'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default AppointmentBooking;