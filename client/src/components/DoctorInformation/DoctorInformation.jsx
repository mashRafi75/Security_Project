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



const DoctorInformation = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    location: '',
    disease: '',
    speciality: '',
    hospital: ''
  });
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);


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
    const fetchDoctors = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "doctors"));
        const doctorsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,   
            userId: data.userId,  
            name: data.name || 'Unknown Doctor',
            speciality: data.speciality || 'General Practitioner',
            hospital: data.hospital || 'Medical Center',
            location: data.location || 'City',
            experience: data.experience || 'Not specified',
            consultationFee: data.consultationFee || 'Contact for pricing',
            workingHours: data.workingHours || {},
            rating: data.rating || 0,
            image: data.image || 'https://img.icons8.com/fluency/96/000000/doctor-male.png',
            diseases: Array.isArray(data.diseases) ? data.diseases : [],
            education: data.education || 'Medical Degree',
            languages: Array.isArray(data.languages) ? data.languages : ['English'],
            bio: data.bio || 'Professional healthcare provider'
          };
        });
        setDoctors(doctorsData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching doctors:", error);
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

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

  const filteredDoctors = useMemo(() => {
    return doctors.filter(doctor => {
      const searchLower = searchTerm?.toLowerCase() || '';
      const nameLower = doctor.name?.toLowerCase() || '';
      const specialityLower = doctor.speciality?.toLowerCase() || '';
      
      const matchesSearch = 
        nameLower.includes(searchLower) || 
        specialityLower.includes(searchLower);
      
      const matchesFilters = 
        (!filters.location || doctor.location?.toLowerCase() === filters.location.toLowerCase()) &&
        (!filters.disease || doctor.diseases?.includes(filters.disease)) &&
        (!filters.speciality || doctor.speciality?.toLowerCase() === filters.speciality.toLowerCase()) &&
        (!filters.hospital || doctor.hospital?.toLowerCase() === filters.hospital.toLowerCase());
      
      return matchesSearch && matchesFilters;
    });
  }, [doctors, searchTerm, filters]);

  const locations = useMemo(() => [...new Set(doctors.map(d => d.location).filter(Boolean))], [doctors]);
  const diseases = useMemo(() => [...new Set(doctors.flatMap(d => d.diseases).filter(Boolean))], [doctors]);
  const specialities = useMemo(() => [...new Set(doctors.map(d => d.speciality).filter(Boolean))], [doctors]);
  const hospitals = useMemo(() => [...new Set(doctors.map(d => d.hospital).filter(Boolean))], [doctors]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const openDoctorDetails = (doctor) => {
    setSelectedDoctor(doctor);
  };

  const closeDoctorDetails = () => {
    setSelectedDoctor(null);
  };

  if (loading) {
    return <div style={styles.loading}>Loading doctors...</div>;
  }

  if (!loading && doctors.length === 0) {
    return (
      <div style={styles.emptyState}>
        <h3>No doctors available</h3>
        <p>The doctors list is currently empty</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
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
            <button style={navButtonStyle} onClick={() => navigate('/MedicalList')}>
            <FiHeart  style={{ marginRight: '0.5rem' }} /> Medicals </button>
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

      {/* Main Content */}
      <main style={styles.mainContent}>
        {/* Search and Filters */}
        <div style={styles.searchContainer}>
          <div style={styles.searchFilterContainer}>
            <input
              type="text"
              placeholder="Search doctors..."
              style={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <div style={styles.filtersRow}>
              <select 
                name="location"
                style={styles.filterSelect}
                value={filters.location}
                onChange={handleFilterChange}
              >
                <option value="">Location</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              
              <select 
                name="disease"
                style={styles.filterSelect}
                value={filters.disease}
                onChange={handleFilterChange}
              >
                <option value="">Disease</option>
                {diseases.map(disease => (
                  <option key={disease} value={disease}>{disease}</option>
                ))}
              </select>
              
              <select 
                name="speciality"
                style={styles.filterSelect}
                value={filters.speciality}
                onChange={handleFilterChange}
              >
                <option value="">Speciality</option>
                {specialities.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
              
              <select 
                name="hospital"
                style={styles.filterSelect}
                value={filters.hospital}
                onChange={handleFilterChange}
              >
                <option value="">Hospital</option>
                {hospitals.map(hosp => (
                  <option key={hosp} value={hosp}>{hosp}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Doctors Grid */}
        <div style={styles.doctorsGrid}>
          {filteredDoctors.length > 0 ? (
            filteredDoctors.map(doctor => (
              <div key={doctor.id} style={styles.doctorCard} onClick={() => openDoctorDetails(doctor)}>
                <img 
                  src={doctor.image} 
                  alt={doctor.name}
                  style={styles.doctorImage}
                  onError={(e) => {
                    e.target.src = 'https://img.icons8.com/fluency/96/000000/doctor-male.png';
                  }}
                />
                <div style={styles.doctorInfo}>
                  <h3 style={styles.doctorName}>{doctor.name}</h3>
                  <p style={styles.doctorSpeciality}>{doctor.speciality}</p>
                  <div style={styles.doctorMeta}>
                    <span style={styles.doctorRating}>⭐ {doctor.rating}</span>
                    <span style={styles.doctorFee}>${doctor.consultationFee}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={styles.noResults}>
              <p>No doctors found matching your criteria.</p>
              <button 
                style={styles.clearFiltersButton}
                onClick={() => {
                  setSearchTerm('');
                  setFilters({
                    location: '',
                    disease: '',
                    speciality: '',
                    hospital: ''
                  });
                }}
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </main>

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
{/* Detailed Availability Section */}
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

// Ultra Compact Styles
const styles = {
  container: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    minHeight: '100vh',
    minWidth: '98.8vw',
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    lineHeight: 1.4,
    fontSize: '14px'
  },
  
  // Loading and Empty States
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '0.875rem',
    color: '#64748b'
  },
  emptyState: {
    textAlign: 'center',
    padding: '2rem 1rem',
    maxWidth: '300px',
    margin: '0 auto',
    '& h3': {
      color: '#1e293b',
      marginBottom: '0.5rem',
      fontSize: '1rem'
    },
    '& p': {
      color: '#64748b',
      fontSize: '0.8125rem'
    }
  },
  
  // Navigation
  navbar: {
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    position: 'sticky',
    top: 0,
    zIndex: 50,
    padding: '0.5rem 1rem',
    '@media (min-width: 768px)': {
      padding: '0.5rem 1.5rem'
    }
  },
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: '700',
    color: '#3b82f6',
    letterSpacing: '-0.5px'
  },
  navButtons: {
    display: 'flex',
    gap: '0.25rem'
  },
  navButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#64748b',
    padding: '0.375rem 0.625rem',
    fontSize: '0.75rem',
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'all 0.15s ease',
    ':hover': {
      color: '#3b82f6',
      backgroundColor: '#f1f5f9'
    }
  },
  activeNavButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '0.375rem 0.625rem',
    fontSize: '0.75rem',
    cursor: 'pointer',
    borderRadius: '4px',
    fontWeight: '500',
    transition: 'background-color 0.15s ease',
    ':hover': {
      backgroundColor: '#2563eb'
    }
  },
  
  // Main Content
  mainContent: {
    maxWidth: '1200px',
    margin: '1rem auto',
    padding: '0 1rem',
    '@media (min-width: 768px)': {
      padding: '0 1.5rem',
      margin: '1.25rem auto'
    }
  },
  
  // Search and Filters
  searchContainer: {
    backgroundColor: 'white',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    marginBottom: '1rem',
    
  },
  searchFilterContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  searchInput: {
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
    }
  },
  filtersRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '0.5rem',
    width: '100%'
  },
  filterSelect: {
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
    ':focus': {
      outline: 'none',
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)'
    }
  },
  
  // Doctors Grid
  doctorsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '0.75rem',
    '@media (min-width: 640px)': {
      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))'
    },
    '@media (min-width: 1024px)': {
      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))'
    }
  },
  doctorCard: {
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    transition: 'all 0.15s ease',
    cursor: 'pointer',
    ':hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }
  },
  doctorImage: {
    width: '100%',
    height: '100px',
    objectFit: 'cover',
    borderBottom: '1px solid #f1f5f9'
  },
  doctorInfo: {
    padding: '0.625rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  doctorName: {
    margin: 0,
    fontSize: '0.8125rem',
    color: '#1e293b',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  doctorSpeciality: {
    margin: 0,
    color: '#3b82f6',
    fontWeight: '500',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  doctorMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.125rem'
  },
  doctorRating: {
    color: '#f59e0b',
    fontWeight: '600',
    fontSize: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.125rem'
  },
  doctorFee: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: '0.75rem'
  },
  noResults: {
    textAlign: 'center',
    gridColumn: '1 / -1',
    padding: '1.5rem',
    '& p': {
      color: '#64748b',
      marginBottom: '0.75rem',
      fontSize: '0.8125rem'
    }
  },
  clearFiltersButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '0.375rem 0.75rem',
    borderRadius: '0.25rem',
    fontSize: '0.75rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    ':hover': {
      backgroundColor: '#2563eb'
    }
  },
  
  // Modal Styles (kept compact but readable)
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

export default DoctorInformation;