import moment from 'moment';
import { FaUser, FaUserMd, FaCalendarAlt, FaClock, FaMoneyBillWave, FaInfoCircle, FaVideo, FaCheck, FaTimes, FaSpinner, FaEye } from 'react-icons/fa';
import { isWithinInterval, subMinutes, addMinutes, parseISO } from 'date-fns';

import { useState, useEffect, useMemo, useRef } from 'react';
import { db,auth } from '../../firebase';
import { doc as firestoreDoc, getDoc, updateDoc, getFirestore, collection, query, where, getDocs,
   orderBy, limit, onSnapshot 
 } from 'firebase/firestore';
import { useMediaQuery } from 'react-responsive';
import { FiMenu, FiX, FiEdit2, FiPlus, FiTrash2, FiClock, FiCalendar, FiHeart, FiActivity,
  FiBookOpen, FiLogOut, FiHome 
 } from 'react-icons/fi';

import { useParams } from 'react-router-dom';
import { MdHealthAndSafety } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { useLogout } from '../../contexts/logout';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import Modal from 'react-modal';
Modal.setAppElement('#root');

const AppointmentManagement = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [doctorId, setDoctorId] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);


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




  // First, fetch doctorId if user is a doctor
  useEffect(() => {
    if (!currentUser?.uid) return;

    const fetchDoctorId = async () => {
      try {
        setLoading(true);
        
        if (currentUser.role === 'doctor') {
          // Query doctors collection to find the doctor document with matching userId
          const doctorsQuery = query(
            collection(db, 'doctors'),
            where('userId', '==', currentUser.uid)
          );

          const unsubscribeDoctors = onSnapshot(doctorsQuery, (querySnapshot) => {
            if (!querySnapshot.empty) {
              // Assuming one doctor per user
              const doctorDoc = querySnapshot.docs[0];
              setDoctorId(doctorDoc.id);
            } else {
              setError("Doctor profile not found");
              setLoading(false);
            }
          });

          return () => unsubscribeDoctors();
        } else {
          // For patients, we can proceed directly
          setDoctorId(null);
          fetchAppointments(currentUser.uid, 'patientInfo.patientId');
        }
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchDoctorId();
  }, [currentUser]);

  // Then, fetch appointments based on role and doctorId (if doctor)
  useEffect(() => {
    if (currentUser?.role === 'doctor' && doctorId) {
      fetchAppointments(doctorId, 'doctorId');
    }
  }, [doctorId, currentUser]);

  const fetchAppointments = async (id, fieldToQuery) => {
    try {
      setLoading(true);
      
      const q = query(
        collection(db, 'appointments'),
        where(fieldToQuery, '==', id)
      );

      // Real-time listener
      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        const appointmentsData = [];
        
        for (const document of querySnapshot.docs) {
          const appointment = {
            id: document.id,
            ...document.data()
          };
          
          // Fix date issue - convert to correct timezone
          if (appointment.date) {
            appointment.date = moment(appointment.date).format('YYYY-MM-DD');
          }
          
          // If patient, fetch doctor's profile picture if available
          if (currentUser.role === 'patient') {
            try {
              const doctorDoc = await getDoc(firestoreDoc(db, 'doctors', appointment.doctorId));
              if (doctorDoc.exists() && doctorDoc.data().profilePicture) {
                appointment.doctorProfilePicture = doctorDoc.data().profilePicture;
              }
            } catch (err) {
              console.error("Couldn't fetch doctor profile picture:", err);
            }
          }
          
          // If doctor, fetch patient info from users collection
          if (currentUser.role === 'doctor') {
            try {
              const patientDoc = await getDoc(firestoreDoc(db, 'users', appointment.patientInfo.patientId));
              if (patientDoc.exists() && patientDoc.data().profilePicture) {
                appointment.patientInfo.profilePicture = patientDoc.data().profilePicture;
              }
            } catch (err) {
              console.error("Couldn't fetch patient profile picture:", err);
            }
          }
          
          appointmentsData.push(appointment);
        }

        // Sort by date and time (newest first)
        appointmentsData.sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.timeSlot.split(' - ')[0]}`);
          const dateB = new Date(`${b.date} ${b.timeSlot.split(' - ')[0]}`);
          return dateB - dateA;
        });

        setAppointments(appointmentsData);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Handle appointment status update
  const handleStatusUpdate = async (appointmentId, newStatus) => {
    try {
      setUpdating(appointmentId);
      await updateDoc(firestoreDoc(db, 'appointments', appointmentId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // If the appointment was rejected, release the time slot
      if (newStatus === 'cancelled') {
        await releaseTimeSlot(appointmentId);
      }
    } catch (err) {
      setError(`Failed to update appointment: ${err.message}`);
    } finally {
      setUpdating(null);
    }
  };

  // Function to release time slot when appointment is rejected
  const releaseTimeSlot = async (appointmentId) => {
    try {
      // Get the appointment data
      const appointmentRef = firestoreDoc(db, 'appointments', appointmentId);
      const appointmentSnap = await getDoc(appointmentRef);
      
      if (!appointmentSnap.exists()) {
        console.warn(`Appointment ${appointmentId} not found`);
        return;
      }

      const appointment = appointmentSnap.data();
      
      if (!appointment.doctorId || !appointment.date || !appointment.timeSlot) {
        console.warn('Invalid appointment data:', { 
          doctorId: appointment.doctorId,
          date: appointment.date,
          timeSlot: appointment.timeSlot
        });
        return;
      }

      // Get the doctor's document
      const doctorRef = firestoreDoc(db, 'doctors', appointment.doctorId);
      const doctorSnap = await getDoc(doctorRef);
      
      if (!doctorSnap.exists()) {
        console.warn(`Doctor ${appointment.doctorId} not found`);
        return;
      }

      const doctorData = doctorSnap.data();
      const availability = doctorData.availability || {};

      // Use the same date format as when the slot was booked
      const appointmentDate = moment(appointment.date).format('YYYY-MM-DD');
      const dateAvailability = availability[appointmentDate] || {};

      // Only proceed if this time slot was actually marked as booked
      if (dateAvailability[appointment.timeSlot] === false) {
        // Mark the time slot as available
        dateAvailability[appointment.timeSlot] = true;

        // Update the doctor's availability
        await updateDoc(doctorRef, {
          availability: {
            ...availability,
            [appointmentDate]: dateAvailability
          }
        });
        
        console.log(`Released time slot for appointment ${appointmentId}`);
      } else {
        console.warn(`Time slot ${appointment.timeSlot} on ${appointmentDate} was not marked as booked`);
      }

    } catch (err) {
      console.error("Error releasing time slot for appointment", appointmentId, ":", err);
    }
  };

  // Handle payment confirmation
  const handlePaymentConfirmation = async (appointmentId) => {
    try {
      setUpdating(appointmentId);
      await updateDoc(firestoreDoc(db, 'appointments', appointmentId), {
        status: 'confirmed',
        paymentStatus: 'paid',
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      setError(`Failed to confirm payment: ${err.message}`);
    } finally {
      setUpdating(null);
    }
  };

  // Check if appointment time is current (for join session button)
  const isAppointmentCurrent = (appointment) => {
    const now = new Date();
    const [startTime, endTime] = appointment.timeSlot.split(' - ');
    
    const appointmentStart = new Date(`${appointment.date} ${startTime}`);
    const appointmentEnd = new Date(`${appointment.date} ${endTime}`);
    
    // Consider 15 minutes before and 1 hour after as "current"
    return now >= new Date(appointmentStart.getTime() - 15 * 60000) && 
           now <= new Date(appointmentEnd.getTime() + 60 * 60000);
  };

  // Format date for display
  const formatDate = (dateString) => {
    return moment(dateString).format('ddd, MMM Do YYYY');
  };

  // Format time slot for display
  const formatTimeSlot = (timeSlot) => {
    const [start, end] = timeSlot.split(' - ');
    return `${moment(start, 'HH:mm').format('h:mm A')} - ${moment(end, 'HH:mm').format('h:mm A')}`;
  };

  // Show reason in modal
  const showReason = (appointment) => {
    setSelectedAppointment(appointment);
    setIsReasonModalOpen(true);
  };

  const showPrescription = (appointment) => {
    setSelectedAppointment(appointment);
    setIsPrescriptionModalOpen(true);
  };


// Add this helper function
const isWithinCallWindow = (appointment) => {
  if (!appointment.date || !appointment.timeSlot) return false;
  
  try {
    const [startTime] = appointment.timeSlot.split(' - ');
    const appointmentStart = new Date(`${appointment.date} ${startTime}`);
    
    // 5 minutes before and 30 minutes after appointment time
    const startWindow = subMinutes(appointmentStart, 5);
    const endWindow = addMinutes(appointmentStart, 30);
    const now = new Date();
    
    return isWithinInterval(now, { start: startWindow, end: endWindow });
  } catch (err) {
    console.error('Error checking call window:', err);
    return false;
  }
};
  


  if (loading) {
    return (
      <div className="loading-container">
        <FaSpinner className="spinner" />
        <p>Loading appointments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <FaTimes className="error-icon" />
          <p>Error: {error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="retry-button"
        >
          Try Again
        </button>
      </div>
    );
  }

  const upcomingAppointments = appointments.filter(a => 
    a.status !== 'completed' && a.status !== 'cancelled' && 
    new Date(`${a.date} ${a.timeSlot.split(' - ')[0]}`) > new Date()
  );

  const pastAppointments = appointments.filter(a => 
    a.status === 'completed' || a.status === 'cancelled' ||
    new Date(`${a.date} ${a.timeSlot.split(' - ')[0]}`) <= new Date()
  );

  return (
    <div className="appointment-management-container">
      {/* Header */}
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





      <main className="appointment-main-content">
        {/* Current Appointments Section */}
        <section className="appointment-section">
          <h2>
            {currentUser?.role === 'doctor' ? 'Appointment Requests' : 'Your Appointments'}
          </h2>

          {upcomingAppointments.length === 0 ? (
            <div className="empty-state">
              <FaCalendarAlt className="empty-icon" />
              <p>
                {currentUser?.role === 'doctor' 
                  ? 'You have no appointment requests at this time.' 
                  : 'You have no upcoming appointments.'}
              </p>
            </div>
          ) : (
            <div className="appointment-cards">
              {upcomingAppointments.map(appointment => (
                <div 
                  key={appointment.id} 
                  className={`appointment-card ${appointment.status}`}
                >
                  <div className="appointment-header">
                    <div className="user-info">
                      <div className="avatar-container">
                        {currentUser?.role === 'doctor' ? (
                          appointment.patientInfo.profilePicture ? (
                            <img 
                              src={appointment.patientInfo.profilePicture} 
                              alt={appointment.patientInfo.name}
                              className="avatar-image"
                            />
                          ) : (
                            <FaUser className="avatar-icon patient" />
                          )
                        ) : (
                          appointment.doctorProfilePicture ? (
                            <img 
                              src={appointment.doctorProfilePicture} 
                              alt={appointment.doctorName}
                              className="avatar-image"
                            />
                          ) : (
                            <FaUserMd className="avatar-icon doctor" />
                          )
                        )}
                      </div>
                      <div className="user-details">
                        <h3>
                          {currentUser?.role === 'doctor' 
                            ? appointment.patientInfo.name 
                            : appointment.doctorName}
                        </h3>
                        <p>
                          {currentUser?.role === 'doctor' 
                            ? 'Patient' 
                            : appointment.doctorSpeciality}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate(
                        currentUser?.role === 'doctor' 
                          ? `/profile/${appointment.patientInfo.patientId}` 
                          : `/profile/${appointment.doctorId}`
                      )}
                      className="profile-button"
                    >
                      View Profile
                    </button>
                  </div>

                  <div className="appointment-details">
                    <div className="detail-item">
                      <FaCalendarAlt className="detail-icon" />
                      <span>{formatDate(appointment.date)}</span>
                    </div>
                    <div className="detail-item">
                      <FaClock className="detail-icon" />
                      <span>
                        {formatTimeSlot(appointment.timeSlot)}
                        {(appointment.status === 'accepted' || appointment.status === 'confirmed') && (
                          <span className="booked-badge">Booked</span>
                        )}
                      </span>
                    </div>
                    {appointment.patientInfo?.reason && (
                      <div className="detail-item">
                        <button 
                          onClick={() => showReason(appointment)}
                          className="view-reason-button"
                        >
                          <FaEye className="button-icon" />
                          View Reason
                        </button>
                      </div>
                    )}
                    <div className="detail-item">
                      <FaMoneyBillWave className="detail-icon" />
                      <span className={`payment-status ${appointment.paymentStatus}`}>
                        {appointment.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  <div className="appointment-actions">
                    {appointment.status === 'confirmed' && isWithinCallWindow(appointment) ? (
                      <button
                        onClick={() => navigate(`/video-session/${appointment.id}`)}
                        className="join-session-button"
                        disabled={!isWithinCallWindow(appointment)}
                      >
                        <FaVideo className="button-icon" />
                        {isWithinCallWindow(appointment) ? 'Join Session' : 'Session Not Available'}
                      </button>
                    ) : currentUser?.role === 'doctor' ? (
                      <div className="doctor-actions">
                        {appointment.status === 'requested' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(appointment.id, 'accepted')}
                              className="accept-button"
                              disabled={updating === appointment.id}
                            >
                              {updating === appointment.id ? (
                                <FaSpinner className="spinner" />
                              ) : (
                                <>
                                  <FaCheck className="button-icon" />
                                  Accept
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                              className="decline-button"
                              disabled={updating === appointment.id}
                            >
                              {updating === appointment.id ? (
                                <FaSpinner className="spinner" />
                              ) : (
                                <>
                                  <FaTimes className="button-icon" />
                                  Decline
                                </>
                              )}
                            </button>
                          </>
                        )}
                        {appointment.status === 'accepted' && (
                          <span className="status-badge waiting-payment">
                            <FaClock className="button-icon" />
                            Waiting for Payment
                          </span>
                        )}
                        {appointment.status === 'confirmed' && (
                          <span className="status-badge confirmed">
                            <FaCheck className="button-icon" />
                            Confirmed
                            {isWithinCallWindow(appointment) && (
                              <span className="call-available-badge">Call Available</span>
                            )}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="patient-actions">
                        {appointment.status === 'requested' && (
                          <span className="status-badge requested">
                            <FaClock className="button-icon" />
                            Requested
                          </span>
                        )}
                        {appointment.status === 'accepted' && (
                          <button
                            onClick={() => handlePaymentConfirmation(appointment.id)}
                            className="confirm-payment-button"
                            disabled={updating === appointment.id}
                          >
                            {updating === appointment.id ? (
                              <FaSpinner className="spinner" />
                            ) : (
                              <>
                                <FaMoneyBillWave className="button-icon" />
                                Confirm Payment
                              </>
                            )}
                          </button>
                        )}
                        {appointment.status === 'confirmed' && (
                          <span className="status-badge confirmed">
                            <FaCheck className="button-icon" />
                            Confirmed
                            {isWithinCallWindow(appointment) && (
                              <span className="call-available-badge">Call Available</span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Appointment History Section */}
        <section className="appointment-section">
          <h2>Appointment History</h2>

          {pastAppointments.length === 0 ? (
            <div className="empty-state">
              <FaCalendarAlt className="empty-icon" />
              <p>No appointment history found.</p>
            </div>
          ) : (
            <div className="history-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>{currentUser?.role === 'doctor' ? 'Patient' : 'Doctor'}</th>
                    <th>Profile</th>
                    <th>Date & Time</th>
                    <th>Reason</th>
                    <th>Prescription</th>
                    <th>Status</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {pastAppointments.map(appointment => (
                    <tr key={appointment.id}>
                      <td>
                        <div className="history-user-info">
                          {currentUser?.role === 'doctor' ? (
                            appointment.patientInfo.profilePicture ? (
                              <img 
                                src={appointment.patientInfo.profilePicture} 
                                alt={appointment.patientInfo.name}
                                className="history-avatar-image"
                              />
                            ) : (
                              <FaUser className="history-avatar patient" />
                            )
                          ) : (
                            appointment.doctorProfilePicture ? (
                              <img 
                                src={appointment.doctorProfilePicture} 
                                alt={appointment.doctorName}
                                className="history-avatar-image"
                              />
                            ) : (
                              <FaUserMd className="history-avatar doctor" />
                            )
                          )}
                          <span>
                            {currentUser?.role === 'doctor' 
                              ? appointment.patientInfo.name 
                              : appointment.doctorName}
                          </span>
                        </div>
                      </td>
                      <td>
                        <button onClick={() => navigate(
                           currentUser?.role === 'doctor' 
                           ? `/profile/${appointment.patientInfo.patientId}` 
                           : `/profile/${appointment.doctorId}` )}
                           className="profile-button">View Profile
                        </button>
                      </td>
                      <td>
                        {formatDate(appointment.date)} at {formatTimeSlot(appointment.timeSlot).split(' - ')[0]}
                      </td>
                      <td>
                        {appointment.patientInfo?.reason ? (
                          <button 
                            onClick={() => showReason(appointment)}
                            className="view-reason-button small"
                          >
                            View Reason
                          </button>
                        ) : 'Not specified'}
                      </td>
                      <td>
                        {appointment?.prescription ? (
                          <button 
                            onClick={() => showPrescription(appointment)}
                            className="view-reason-button small"
                          >
                            View Prescription
                          </button>
                        ) : 'Not specified'}
                      </td>                      
                      <td>
                        <span className={`status-badge ${appointment.status}`}>
                          {appointment.status === 'completed' ? 'Completed' : 
                           appointment.status === 'cancelled' ? 'Cancelled' :
                           appointment.status === 'confirmed' ? 'Completed' : 'Expired'}   
                           {/* Expired */}
                        </span>
                      </td>
                      <td>
                        <span className={`payment-status ${appointment.paymentStatus}`}>
                          {appointment.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Reason Modal */}
      <Modal
        isOpen={isReasonModalOpen}
        onRequestClose={() => setIsReasonModalOpen(false)}
        className="reason-modal"
        overlayClassName="reason-modal-overlay"
      >
        {selectedAppointment && (
          <div className="modal-content">
            <h3>Appointment Reason</h3>
            <div className="modal-subheader">
              <span className="patient-name">{selectedAppointment.patientInfo.name}</span>
              <span className="appointment-date">
                {formatDate(selectedAppointment.date)} at {formatTimeSlot(selectedAppointment.timeSlot).split(' - ')[0]}
              </span>
            </div>
            <div className="reason-container">
              <p className="reason-text">{selectedAppointment.patientInfo.reason}</p>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => setIsReasonModalOpen(false)}
                className="close-button"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>



      <Modal
        isOpen={isPrescriptionModalOpen}
        onRequestClose={() => setIsPrescriptionModalOpen(false)}
        className="reason-modal"
        overlayClassName="reason-modal-overlay"
      >
        {selectedAppointment && (
          <div className="modal-content">
            <h3>Appointment Prescription</h3>

            <div className="reason-container">
              <p className="reason-text">{selectedAppointment.prescription}</p>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => setIsPrescriptionModalOpen(false)}
                className="close-button"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>



      {/* CSS Styles */}
      <style>{`
        .appointment-management-container {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          min-height: 100vh;
          width: 98.8vw;
          background-color: #f5f7fa;
          color: #333;
        }
        
        .appointment-header {
          background-color: #2c3e50;
          color: white;
          padding: 1rem 2rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }
        
        .appointment-header h1 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }
        
        .header-actions {
          display: flex;
          gap: 1rem;
        }
        
        .home-button {
          background-color: transparent;
          border: 1px solid white;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .home-button:hover {
          background-color: rgba(255,255,255,0.1);
        }
        
        .new-appointment-button {
          background-color: #3498db;
          border: none;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .new-appointment-button:hover {
          background-color: #2980b9;
        }
        
        .appointment-main-content {
          max-width: 1200px;
          margin: 2rem auto;
          padding: 0 1rem;
        }
        
        .appointment-section {
          background-color: white;
          border-radius: 10px;
          padding: 2rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          margin-bottom: 2rem;
        }
        
        .appointment-section h2 {
          margin: 0 0 1.5rem 0;
          color: #2c3e50;
          font-size: 1.5rem;
          border-bottom: 1px solid #eee;
          padding-bottom: 0.5rem;
        }
        
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: #7f8c8d;
          text-align: center;
        }
        
        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          color: #bdc3c7;
        }
        
        .appointment-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }
        
        .appointment-card {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 1.5rem;
          border-left: 4px solid #f39c12;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .appointment-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .appointment-card.requested {
          border-left-color: #f39c12;
        }
        
        .appointment-card.accepted {
          border-left-color: #3498db;
        }
        
        .appointment-card.confirmed {
          border-left-color: #2ecc71;
        }
        
        .appointment-card.completed {
          border-left-color: #27ae60;
        }
        
        .appointment-card.cancelled {
          border-left-color: #e74c3c;
        }
        
        .appointment-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .avatar-container {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background-color: #ecf0f1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .avatar-icon {
          font-size: 2rem;
          color: #7f8c8d;
        }
        
        .avatar-icon.patient {
          color: #3498db;
        }
        
        .avatar-icon.doctor {
          color: #e74c3c;
        }
        
        .avatar-image {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .user-details h3 {
          margin: 0 0 0.25rem 0;
          color:rgb(250, 250, 250);
          font-size: 1.1rem;
        }
        
        .user-details p {
          margin: 0;
          color: #7f8c8d;
          font-size: 0.9rem;
        }
        
        .profile-button {
          background-color: transparent;
          border: 1px solid #3498db;
          color: #3498db;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
          white-space: nowrap;
        }
        
        .profile-button:hover {
          background-color: rgba(52, 152, 219, 0.1);
        }
        
        .appointment-details {
          margin-bottom: 1.5rem;
        }
        
        .detail-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          font-size: 0.95rem;
        }
        
        .detail-icon {
          color: #7f8c8d;
          min-width: 16px;
        }
        
        .payment-status {
          font-weight: 500;
        }
        
        .payment-status.paid {
          color: #27ae60;
        }
        
        .payment-status.pending {
          color: #e67e22;
        }
        
        .booked-badge {
          background-color: #e8f5e9;
          color: #2e7d32;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          margin-left: 0.5rem;
          font-weight: 500;
        }
        
        .view-reason-button {
          background-color: transparent;
          border: none;
          color: #3498db;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.95rem;
        }
        
        .view-reason-button:hover {
          text-decoration: underline;
        }
        
        .view-reason-button.small {
          font-size: 0.85rem;
          padding: 0.25rem 0.5rem;
          background-color: #f0f7ff;
          border-radius: 4px;
        }
        
        .view-reason-button.small:hover {
          background-color: #e1f0ff;
        }
        
        .appointment-actions {
          display: flex;
          justify-content: flex-end;
        }
        
        .join-session-button {
          background-color: #2ecc71;
          border: none;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }
        
        .join-session-button:hover {
          background-color: #27ae60;
        }
        
        .doctor-actions {
          display: flex;
          gap: 0.75rem;
        }
        
        .accept-button {
          background-color: #2ecc71;
          border: none;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }
        
        .accept-button:hover {
          background-color: #27ae60;
        }
        
        .accept-button:disabled {
          background-color: #bdc3c7;
          cursor: not-allowed;
        }
        
        .decline-button {
          background-color: #e74c3c;
          border: none;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }
        
        .decline-button:hover {
          background-color: #c0392b;
        }
        
        .decline-button:disabled {
          background-color: #bdc3c7;
          cursor: not-allowed;
        }
        
        .confirm-payment-button {
          background-color: #2ecc71;
          border: none;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          transition: all 0.2s;
        }
        
        .confirm-payment-button:hover {
          background-color: #27ae60;
        }
        
        .confirm-payment-button:disabled {
          background-color: #bdc3c7;
          cursor: not-allowed;
        }
        
        .status-badge {
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .status-badge.requested {
          background-color: #fff3e0;
          color: #e65100;
        }
        
        .status-badge.waiting-payment {
          background-color: #e3f2fd;
          color: #1565c0;
        }
        
        .status-badge.confirmed {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        
        .status-badge.completed {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        
        .status-badge.cancelled {
          background-color: #ffebee;
          color: #c62828;
        }
        
        .history-table-container {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid #eee;
        }
        
        .history-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 600px;
        }
        
        .history-table th {
          background-color: #f8f9fa;
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          color: #2c3e50;
          border-bottom: 1px solid #ddd;
        }
        
        .history-table td {
          padding: 1rem;
          border-bottom: 1px solid #eee;
          vertical-align: middle;
        }
        
        .history-table tr:last-child td {
          border-bottom: none;
        }
        
        .history-table tr:hover {
          background-color: #f8f9fa;
        }
        
        .history-user-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .history-avatar {
          font-size: 1.5rem;
          color: #7f8c8d;
        }
        
        .history-avatar.patient {
          color: #3498db;
        }
        
        .history-avatar.doctor {
          color: #e74c3c;
        }
        
        .history-avatar-image {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          gap: 1rem;
        }
        
        .spinner {
          animation: spin 1s linear infinite;
          font-size: 2rem;
          color: #3498db;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          gap: 1.5rem;
          padding: 2rem;
          text-align: center;
        }
        
        .error-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #e74c3c;
          font-size: 1.1rem;
          font-weight: 500;
        }
        
        .error-icon {
          font-size: 1.5rem;
        }
        
        .retry-button {
          background-color: #3498db;
          border: none;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .retry-button:hover {
          background-color: #2980b9;
        }
        
        .button-icon {
          margin-right: 0.5rem;
        }
        
        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .header-actions {
            width: 100%;
            justify-content: space-between;
          }
          
          .appointment-section {
            padding: 1.5rem;
          }
          
          .appointment-card {
            padding: 1.25rem;
          }
          
          .doctor-actions {
            flex-direction: column;
            width: 100%;
            gap: 0.5rem;
          }
          
          .accept-button, .decline-button, .confirm-payment-button {
            width: 100%;
            justify-content: center;
          }
        }
        
        @media (max-width: 480px) {
          .appointment-header {
            flex-direction: column;
            gap: 1rem;
          }
          
          .profile-button {
            width: 100%;
            text-align: center;
          }
          
          .appointment-cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Modal Styles */}
      <style global>{`
        .reason-modal {
          position: absolute;
          top: 50%;
          left: 50%;
          right: auto;
          bottom: auto;
          margin-right: -50%;
          transform: translate(-50%, -50%);
          background: white;
          padding: 2rem;
          border-radius: 8px;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow: auto;
          outline: none;
        }
        
        .reason-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 1000;
        }
        
        .modal-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .modal-content h3 {
          margin: 0;
          color: #2c3e50;
          font-size: 1.5rem;
          border-bottom: 1px solid #eee;
          padding-bottom: 0.75rem;
        }
        
        .modal-subheader {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-top: -0.5rem;
        }
        
        .patient-name {
          font-weight: 600;
          color: #2c3e50;
        }
        
        .appointment-date {
          color: #7f8c8d;
          font-size: 0.9rem;
        }
        
        .reason-container {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 1.5rem;
          margin: 0.5rem 0;
        }
        
        .reason-text {
          margin: 0;
          color: #34495e;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          border-top: 1px solid #eee;
          padding-top: 1.5rem;
        }
        
        .close-button {
          background-color: #3498db;
          border: none;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .close-button:hover {
          background-color: #2980b9;
        }
      `}</style>
    </div>
  );
};

export default AppointmentManagement;