import React, { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { doc, getDoc, updateDoc, getFirestore, collection, query, where, getDocs,
   orderBy, limit, onSnapshot 
 } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useMediaQuery } from 'react-responsive';
import { FiMenu, FiX, FiEdit2, FiPlus, FiTrash2, FiClock, FiCalendar, FiHeart, FiActivity,
  FiBookOpen, FiLogOut, FiHome 
 } from 'react-icons/fi';
import Modal from 'react-modal';
import { useParams } from 'react-router-dom';
import { MdHealthAndSafety } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { useLogout } from '../../contexts/logout';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
Modal.setAppElement('#root');

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fitbandData, setFitbandData] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentField, setCurrentField] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [currentIndex, setCurrentIndex] = useState(null);
  const [workingDayModalOpen, setWorkingDayModalOpen] = useState(false);
  const [newDay, setNewDay] = useState('');
  const [newStart, setNewStart] = useState(9);
  const [newEnd, setNewEnd] = useState(17);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
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
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if the profile being viewed belongs to the current user
        setIsCurrentUser(user.uid === userId);
        
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          
          if (data.role === "doctor") {
            const doctorsRef = collection(db, "doctors");
            const q = query(doctorsRef, where("userId", "==", userId));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const doctorData = querySnapshot.docs[0].data();
              setUserData({ ...data, ...doctorData });
            } else {
              setUserData(data);
            }
          } else {
            setUserData(data);
          }
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (userData?.role === 'patient') {
      const initialData = Array.from({ length: 10 }, (_, i) => ({
        time: new Date(Date.now() - (10 - i) * 3000).toLocaleTimeString(),
        bp: Math.floor(Math.random() * 40) + 80,
        calories: Math.floor(Math.random() * 200) + 50,
        heartRate: Math.floor(Math.random() * 30) + 70,
      }));
      setFitbandData(initialData);

      const interval = setInterval(() => {
        const newData = {
          time: new Date().toLocaleTimeString(),
          bp: Math.floor(Math.random() * 40) + 80,
          calories: Math.floor(Math.random() * 200) + 50,
          heartRate: Math.floor(Math.random() * 30) + 70,
        };
        setFitbandData((prevData) => [...prevData.slice(-9), newData]);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [userData?.role]);

  const openEditModal = (field, value = '', index = null) => {
    setCurrentField(field);
    setCurrentValue(value);
    setCurrentIndex(index);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handleArrayInputChange = (field, index, value) => {
    setUserData((prev) => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
  };

  const addArrayItem = (field, initialValue = '') => {
    setUserData((prev) => ({
      ...prev,
      [field]: prev[field] ? [...prev[field], initialValue] : [initialValue]
    }));
  };

  const removeArrayItem = (field, index) => {
    setUserData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleWorkingHoursChange = (day, field, value) => {
    setUserData((prev) => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: {
          ...prev.workingHours?.[day],
          [field]: Number(value)
        }
      }
    }));
  };

  const openWorkingDayModal = () => {
    setNewDay('');
    setNewStart(9);
    setNewEnd(17);
    setWorkingDayModalOpen(true);
  };

  const addWorkingDay = () => {
    if (newDay) {
      setUserData((prev) => ({
        ...prev,
        workingHours: {
          ...prev.workingHours,
          [newDay]: { start: newStart, end: newEnd }
        }
      }));
      setWorkingDayModalOpen(false);
    }
  };

  const removeWorkingDay = async (day) => {
    try {
      const updatedWorkingHours = { ...userData.workingHours };
      delete updatedWorkingHours[day];

      const doctorsRef = collection(db, "doctors");
      const q = query(doctorsRef, where("userId", "==", auth.currentUser.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doctorDocRef = doc(db, "doctors", querySnapshot.docs[0].id);
        await updateDoc(doctorDocRef, { workingHours: updatedWorkingHours });

        setUserData((prev) => ({
          ...prev,
          workingHours: updatedWorkingHours,
        }));

        alert("Working day removed successfully!");
      } else {
        console.warn("No doctor document found.");
      }
    } catch (error) {
      console.error("Error removing working day:", error);
      alert("Failed to remove working day.");
    }
  };

  const saveFieldChange = async (field, value, index = null) => {
    try {
      if (userData.role === "doctor") {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          fullName: userData.name,
          email: userData.email,
        });

        const doctorsRef = collection(db, "doctors");
        const q = query(doctorsRef, where("userId", "==", auth.currentUser.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const doctorDocRef = doc(db, "doctors", querySnapshot.docs[0].id);
          const updateData = {};
          
          if (index !== null) {
            const newArray = [...userData[field]];
            if (index >= newArray.length) {
              newArray.push(value);
            } else {
              newArray[index] = value;
            }
            updateData[field] = newArray;
          } else if (field.includes('-')) {
            const [day, timeField] = field.split('-');
            const workingHours = { ...userData.workingHours };
            if (!workingHours[day]) workingHours[day] = { start: 9, end: 17 };
            workingHours[day][timeField] = Number(value);
            updateData.workingHours = workingHours;
          } else {
            updateData[field] = value;
          }

          await updateDoc(doctorDocRef, updateData);
        }
      } else {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          [field]: value
        });
      }

      alert("Changes saved successfully!");
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("Failed to save changes");
    }
  };

  const saveWorkingHours = async () => {
    try {
      if (userData.role === "doctor") {
        const doctorsRef = collection(db, "doctors");
        const q = query(doctorsRef, where("userId", "==", auth.currentUser.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const doctorDocRef = doc(db, "doctors", querySnapshot.docs[0].id);
          await updateDoc(doctorDocRef, {
            workingHours: userData.workingHours
          });
          alert("Working hours updated successfully!");
        }
      }
    } catch (error) {
      console.error("Error updating working hours:", error);
      alert("Failed to update working hours");
    }
  };


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


  const containerStyle = {
    maxWidth: '100vw',
    margin: 'auto',
    //padding: '20px',
    fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box',
    overflowX: 'hidden',
    
  };

  const cardStyle = {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    backgroundColor: 'white',
  };

  const sectionHeaderStyle = {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#1a202c',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const profileImgStyle = {
    width: '96px',
    height: '96px',
    borderRadius: '50%',
    border: '2px solid #e2e8f0',
    objectFit: 'cover',
  };

  const infoItemStyle = {
    marginBottom: '16px',
  };

  const infoLabelStyle = {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const infoValueStyle = {
    fontSize: '16px',
    color: '#2d3748',
    fontWeight: '500',
  };

  const editButtonStyle = {
    background: 'none',
    border: 'none',
    color: '#4299e1',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: '8px',
  };

  const buttonStyle = {
    padding: '10px 16px',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s',
  };

  const dangerButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#f56565',
  };

  const successButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#48bb78',
  };

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
  if (loading) {
    return (
      <div style={{ ...containerStyle, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div style={{ ...containerStyle, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>User not found</div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Navigation */}
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
                <li style={{ padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}onClick={() => navigate('/MedicalList')}>Medicals</li>
                <li style={{ padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}onClick={onLogoutClick}>Log Out</li>
              </ul>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={navButtonStyle} onClick={() => navigate('/Home_page')}>
            <FiHome  style={{ marginRight: '0.5rem' }} /> Home </button>
            <button style={navButtonStyle} onClick={() => navigate('/AppointmentManagement')}>
            <FiCalendar style={{ marginRight: '0.5rem' }} /> Appointments </button>
            <button style={navButtonStyle} onClick={() => navigate('/Blog_page')}>
            <FiBookOpen style={{ marginRight: '0.5rem' }} /> Blogs </button>
            <button style={navButtonStyle} onClick={() => navigate('/MedicalList')}>
            <FiHeart style={{ marginRight: '0.5rem' }} /> Medicals </button>
            <NotificationBell /> 
            <button style={navButtonStyle} onClick={onLogoutClick}>
            <FiLogOut style={{ marginRight: '0.5rem' }} /> Log Out </button>



          </div>
        )}
        
      </div>
      

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px' }}>
        {/* Profile Card */}
        <div style={{ ...cardStyle, flex: isMobile ? '1' : '1 1 40%' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '20px' }}>
            <img 
              src={userData.image || 'https://randomuser.me/api/portraits/men/75.jpg'} 
              alt="Profile" 
              style={profileImgStyle} 
              onError={(e) => {
                e.target.src = 'https://randomuser.me/api/portraits/men/75.jpg';
              }}
            />
            <div>
              <h3 style={{ margin: '0 0 4px 0', color: '#1a202c', fontSize: '24px' }}>
                {userData.name || userData.fullName || 'No Name'}
              </h3>
              <p style={{ margin: 0, color: '#718096', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {userData.role === 'doctor' ? (
                  <>
                    <span>{userData.speciality || 'Doctor'}</span>
                    {userData.rating && (
                      <span style={{ color: '#ecc94b', display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '4px' }}>★</span> {userData.rating}
                      </span>
                    )}
                  </>
                ) : 'Patient'}
              </p>
            </div>
          </div>

          <div style={sectionHeaderStyle}>
            <span>Personal Information</span>
          </div>

          {userData.role === 'patient' ? (
            <>
              <div style={infoItemStyle}>
                <div style={infoLabelStyle}>
                  <span>Full Name</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={infoValueStyle}>{userData.fullName || 'Not provided'}</div>
                  {isCurrentUser && (
                    <button 
                      onClick={() => openEditModal('fullName', userData.fullName || '')}
                      style={editButtonStyle}
                    >
                      <FiEdit2 size={14} /> Edit
                    </button>
                  )}
                </div>
              </div>

              <div style={infoItemStyle}>
                <div style={infoLabelStyle}>
                  <span>Email</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={infoValueStyle}>{userData.email || 'Not provided'}</div>
                  {isCurrentUser && (
                    <button 
                      onClick={() => openEditModal('email', userData.email || '')}
                      style={editButtonStyle}
                    >
                      <FiEdit2 size={14} /> Edit
                    </button>
                  )}
                </div>
              </div>

              <div style={infoItemStyle}>
                <div style={infoLabelStyle}>
                  <span>Phone</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={infoValueStyle}>{userData.phone || 'Not provided'}</div>
                  {isCurrentUser && (
                    <button 
                      onClick={() => openEditModal('phone', userData.phone || '')}
                      style={editButtonStyle}
                    >
                      <FiEdit2 size={14} /> Edit
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {isCurrentUser ? (
                <div style={infoItemStyle}>
                  <div style={infoLabelStyle}>
                    <span>Name</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={infoValueStyle}>{userData.name || 'Not provided'}</div>
                    <button 
                      onClick={() => openEditModal('name', userData.name || '')}
                      style={editButtonStyle}
                    >
                      <FiEdit2 size={14} /> Edit
                    </button>
                  </div>
                </div>
              ) : null}
              
              <div style={infoItemStyle}>
                <div style={infoLabelStyle}>
                  <span>Email</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={infoValueStyle}>{userData.email || 'Not provided'}</div>
                  {isCurrentUser && (
                    <button 
                      onClick={() => openEditModal('email', userData.email || '')}
                      style={editButtonStyle}
                    >
                      <FiEdit2 size={14} /> Edit
                    </button>
                  )}
                </div>
              </div>

              <div style={infoItemStyle}>
                <div style={infoLabelStyle}>
                  <span>Bio</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={infoValueStyle}>{userData.bio || 'Not provided'}</div>
                  {isCurrentUser && (
                    <button 
                      onClick={() => openEditModal('bio', userData.bio || '')}
                      style={editButtonStyle}
                    >
                      <FiEdit2 size={14} /> Edit
                    </button>
                  )}
                </div>
              </div>

              <div style={infoItemStyle}>
                <div style={infoLabelStyle}>
                  <span>Speciality</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={infoValueStyle}>{userData.speciality || 'Not provided'}</div>
                  {isCurrentUser && (
                    <button 
                      onClick={() => openEditModal('speciality', userData.speciality || '')}
                      style={editButtonStyle}
                    >
                      <FiEdit2 size={14} /> Edit
                    </button>
                  )}
                </div>
              </div>

              <div style={infoItemStyle}>
                <div style={infoLabelStyle}>
                  <span>Hospital</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={infoValueStyle}>{userData.hospital || 'Not provided'}</div>
                  {isCurrentUser && (
                    <button 
                      onClick={() => openEditModal('hospital', userData.hospital || '')}
                      style={editButtonStyle}
                    >
                      <FiEdit2 size={14} /> Edit
                    </button>
                  )}
                </div>
              </div>

              <div style={infoItemStyle}>
                <div style={infoLabelStyle}>
                  <span>Location</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={infoValueStyle}>{userData.location || 'Not provided'}</div>
                  {isCurrentUser && (
                    <button 
                      onClick={() => openEditModal('location', userData.location || '')}
                      style={editButtonStyle}
                    >
                      <FiEdit2 size={14} /> Edit
                    </button>
                  )}
                </div>
              </div>

              <div style={infoItemStyle}>
                <div style={infoLabelStyle}>
                  <span>Consultation Fee</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={infoValueStyle}>
                    {userData.consultationFee ? `$${userData.consultationFee}` : 'Not provided'}
                  </div>
                  {isCurrentUser && (
                    <button 
                      onClick={() => openEditModal('consultationFee', userData.consultationFee || '')}
                      style={editButtonStyle}
                    >
                      <FiEdit2 size={14} /> Edit
                    </button>
                  )}
                </div>
              </div>

              <div style={infoItemStyle}>
                <div style={infoLabelStyle}>
                  <span>Education</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={infoValueStyle}>{userData.education || 'Not provided'}</div>
                  {isCurrentUser && (
                    <button 
                      onClick={() => openEditModal('education', userData.education || '')}
                      style={editButtonStyle}
                    >
                      <FiEdit2 size={14} /> Edit
                    </button>
                  )}
                </div>
              </div>

              <div style={infoItemStyle}>
                <div style={infoLabelStyle}>
                  <span>Experience</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={infoValueStyle}>{userData.experience || 'Not provided'}</div>
                  {isCurrentUser && (
                    <button 
                      onClick={() => openEditModal('experience', userData.experience || '')}
                      style={editButtonStyle}
                    >
                      <FiEdit2 size={14} /> Edit
                    </button>
                  )}
                </div>
              </div>

{isCurrentUser ? (
  <div style={infoItemStyle}>
    <div style={infoLabelStyle}>
      <span>Profile Image URL</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{ ...infoValueStyle, wordBreak: 'break-all' }}>
        {userData.image || 'Not provided'}
      </div>
      <button 
        onClick={() => openEditModal('image', userData.image || '')}
        style={editButtonStyle}
      >
        <FiEdit2 size={14} /> Edit
      </button>
    </div>
  </div>
) : null}
            </>
          )}
        </div>

        {/* Additional Information based on role */}
        <div style={{ ...cardStyle, flex: isMobile ? '1' : '1 1 60%' }}>
          {userData.role === 'patient' ? (
            <>
              <div style={sectionHeaderStyle}>
                <FiActivity /> Health Data
              </div>
              
              <div style={{ height: '300px', marginBottom: '24px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fitbandData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 12 }}
                      tickMargin={8}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickMargin={8}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bp" 
                      stroke="#8884d8" 
                      name="Blood Pressure (mmHg)" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="calories" 
                      stroke="#82ca9d" 
                      name="Calories Burned (kcal)" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="heartRate" 
                      stroke="#ff7300" 
                      name="Heart Rate (bpm)" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={sectionHeaderStyle}>
                <FiCalendar /> Recent Visits
              </div>
              <p style={{ color: '#718096' }}>No recent visits</p>
            </>
          ) : (
            <>
              <div style={sectionHeaderStyle}>
                <span>🌐 Languages</span>
              </div>
              {userData.languages?.length > 0 ? (
                userData.languages.map((lang, index) => (
                  <div key={index} style={{ ...infoItemStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={infoValueStyle}>{lang}</div>
                    {isCurrentUser && (
                      <div>
                        <button 
                          onClick={() => openEditModal('languages', lang, index)}
                          style={editButtonStyle}
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button 
                          onClick={() => removeArrayItem('languages', index)}
                          style={{ ...editButtonStyle, color: '#f56565' }}
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p style={{ color: '#718096' }}>No languages added</p>
              )}
              {isCurrentUser && (
                <button 
                  onClick={() => {
                    addArrayItem('languages', '');
                    openEditModal('languages', '', userData.languages ? userData.languages.length : 0);
                  }}
                  style={{ ...buttonStyle, backgroundColor: '#38b2ac', marginTop: '8px' }}
                >
                  <FiPlus size={14} /> Add Language
                </button>
              )}

              <div style={{ ...sectionHeaderStyle, marginTop: '24px' }}>
                <span>🩺 Diseases Treated</span>
              </div>
              {userData.diseases?.length > 0 ? (
                userData.diseases.map((disease, index) => (
                  <div key={index} style={{ ...infoItemStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={infoValueStyle}>{disease}</div>
                    {isCurrentUser && (
                      <div>
                        <button 
                          onClick={() => openEditModal('diseases', disease, index)}
                          style={editButtonStyle}
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button 
                          onClick={() => removeArrayItem('diseases', index)}
                          style={{ ...editButtonStyle, color: '#f56565' }}
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p style={{ color: '#718096' }}>No diseases added</p>
              )}
              {isCurrentUser && (
                <button 
                  onClick={() => {
                    addArrayItem('diseases', '');
                    openEditModal('diseases', '', userData.diseases ? userData.diseases.length : 0);
                  }}
                  style={{ ...buttonStyle, backgroundColor: '#38b2ac', marginTop: '8px' }}
                >
                  <FiPlus size={14} /> Add Disease
                </button>
              )}

              <div style={{ ...sectionHeaderStyle, marginTop: '24px' }}>
                <FiClock /> Working Hours
              </div>
              {userData.workingHours && Object.entries(userData.workingHours).length > 0 ? (
                <>
                  {Object.entries(userData.workingHours).map(([day, hours]) => (
                    <div key={day} style={{ marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, color: '#2d3748', fontSize: '16px', fontWeight: '500' }}>{day}</h4>
                        {isCurrentUser && (
                          <button 
                            onClick={() => removeWorkingDay(day)}
                            style={{ ...editButtonStyle, color: '#f56565' }}
                          >
                            <FiTrash2 size={14} /> Remove
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={infoLabelStyle}>Start Hour</div>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={infoValueStyle}>{hours.start}:00</div>
                            {isCurrentUser && (
                              <button 
                                onClick={() => openEditModal(`${day}-start`, hours.start)}
                                style={editButtonStyle}
                              >
                                <FiEdit2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={infoLabelStyle}>End Hour</div>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={infoValueStyle}>{hours.end}:00</div>
                            {isCurrentUser && (
                              <button 
                                onClick={() => openEditModal(`${day}-end`, hours.end)}
                                style={editButtonStyle}
                              >
                                <FiEdit2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isCurrentUser && (
                    <>
                      <button 
                        onClick={saveWorkingHours}
                        style={{ ...successButtonStyle, marginTop: '16px' }}
                      >
                        Save Working Hours
                      </button>
                    </>
                  )}
                </>
              ) : (
                <p style={{ color: '#718096' }}>No working hours set</p>
              )}
              {isCurrentUser && (
                <button 
                  onClick={openWorkingDayModal}
                  style={{ ...buttonStyle, backgroundColor: '#38b2ac', marginTop: '8px' }}
                >
                  <FiPlus size={14} /> Add Working Day
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ ...cardStyle, background: 'linear-gradient(to bottom right, #ebf8ff, #ffffff)' }}>
        <div style={sectionHeaderStyle}>
          <FiHeart /> Health Tip
        </div>
        <p style={{ color: '#4a5568', lineHeight: '1.6' }}>
          Stay hydrated, take short walks every hour, and maintain consistent sleep. These small habits greatly impact your long-term health.
        </p>
      </div>

      {/* Edit Modal - Only shown for current user */}
      {isCurrentUser && (
        <>
          <Modal
            isOpen={editModalOpen}
            onRequestClose={closeEditModal}
            style={modalStyle}
            contentLabel="Edit Field"
          >
            <h3 style={{ marginTop: 0, color: '#1a202c' }}>Edit {currentField.includes('-') ? currentField.split('-')[0] + ' ' + currentField.split('-')[1] : currentField}</h3>
            <input
              type={currentField.includes('Fee') || currentField.includes('start') || currentField.includes('end') ? 'number' : 'text'}
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                margin: '16px 0',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                fontSize: '16px',
              }}
              min={currentField.includes('start') || currentField.includes('end') ? 0 : undefined}
              max={currentField.includes('start') || currentField.includes('end') ? 24 : undefined}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={closeEditModal}
                style={{ ...buttonStyle, backgroundColor: '#e2e8f0', color: '#4a5568' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (currentIndex !== null) {
                    handleArrayInputChange(currentField, currentIndex, currentValue);
                  } else if (currentField.includes('-')) {
                    const [day, field] = currentField.split('-');
                    handleWorkingHoursChange(day, field, currentValue);
                  } else {
                    handleInputChange({ target: { name: currentField, value: currentValue } });
                  }
                  saveFieldChange(currentField, currentValue, currentIndex);
                  closeEditModal();
                }}
                style={successButtonStyle}
              >
                Save
              </button>
            </div>
          </Modal>

          {/* Add Working Day Modal */}
          <Modal
            isOpen={workingDayModalOpen}
            onRequestClose={() => setWorkingDayModalOpen(false)}
            style={modalStyle}
            contentLabel="Add Working Day"
          >
            <h3 style={{ marginTop: 0, color: '#1a202c' }}>Add Working Day</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={infoLabelStyle}>Day</label>
              <input
                type="text"
                value={newDay}
                onChange={(e) => setNewDay(e.target.value)}
                placeholder="e.g. Monday"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  fontSize: '16px',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={infoLabelStyle}>Start Hour</label>
                <input
                  type="number"
                  value={newStart}
                  onChange={(e) => setNewStart(Number(e.target.value))}
                  min="0"
                  max="24"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    fontSize: '16px',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={infoLabelStyle}>End Hour</label>
                <input
                  type="number"
                  value={newEnd}
                  onChange={(e) => setNewEnd(Number(e.target.value))}
                  min="0"
                  max="24"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    fontSize: '16px',
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setWorkingDayModalOpen(false)}
                style={{ ...buttonStyle, backgroundColor: '#e2e8f0', color: '#4a5568' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  addWorkingDay();
                  saveWorkingHours();
                }}
                style={successButtonStyle}
              >
                Add Day
              </button>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
};

export default Profile;