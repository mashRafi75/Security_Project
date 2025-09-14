import { useState, useEffect, useMemo, useRef } from 'react';
import { companyInfo } from './companyInfo';
import { auth, db } from '../../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { v4 as uuidv4 } from 'uuid';
import 'leaflet/dist/leaflet.css';
import { HiOutlineMenuAlt3 } from 'react-icons/hi';


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



// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const HealthAIChat = () => {
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
    //marginBottom: '24px', 
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


const [showMobileSidebar, setShowMobileSidebar] = useState(false);
const toggleMobileSidebar = () => {
  setShowMobileSidebar(prev => !prev);
};

  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: "Hello! I'm your SympticAI assistant. How can I help you today?", 
      sender: 'ai',
      isError: false
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user] = useAuthState(auth);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapCoords, setMapCoords] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const messagesEndRef = useRef(null);

  const healthTopics = ["Nearby Medicals", "suggest Doctor for Migraine", "suggest Doctor for Heart Disease"];

  useEffect(() => {
    setMessages(prev => [
      ...prev,
      {
        id: 0,
        text: companyInfo,
        sender: 'ai',
        hideInChat: true
      }
    ]);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchNearbyMedicalFacilities = async (userId) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        throw new Error('User document not found. Please update your profile.');
      }

      const userData = userDocSnap.data();
      const userCountry = userData.country;

      if (!userCountry) {
        throw new Error('No country specified in your profile. Please update your profile with your location.');
      }

      const medicalsRef = collection(db, 'medicals');
      const medicalsQuery = query(medicalsRef, where('location', '==', userCountry));
      const medicalsSnapshot = await getDocs(medicalsQuery);

      if (medicalsSnapshot.empty) {
        return `I couldn't find any medical facilities in ${userCountry}.`;
      }

      let response = `Here are some medical facilities in ${userCountry}:\n\n`;
      const facilities = [];
      
      medicalsSnapshot.forEach(doc => {
        const data = doc.data();
        response += `🏥 <strong>${data.name}</strong>\n📍 ${data.address}\n`;
        response += `<button class="map-button" data-id="${doc.id}" data-name="${data.name}" data-address="${data.address}">View on Map</button>\n\n`;
        facilities.push({
          id: doc.id,
          name: data.name,
          address: data.address
        });
      });

      return { text: response, facilities };
    } catch (error) {
      console.error('Error fetching medical facilities:', error);
      return { text: `Sorry, I couldn't retrieve medical facility information. ${error.message}`, facilities: [] };
    }
  };


  
 const fetchDoctorsForDisease = async (diseaseName) => {
  try {
    const doctorsRef = collection(db, 'doctors');
    const snapshot = await getDocs(doctorsRef);

    const normalizedInput = diseaseName.trim().toLowerCase();

    const matchedDocs = [];
    let response = `Here are some doctors who specialize in ${diseaseName}:\n\n`;

    snapshot.forEach(doc => {
      const data = doc.data();
      const diseases = data.diseases || [];

      const hasMatch = diseases.some(d => d.toLowerCase() === normalizedInput);
      if (hasMatch) {
        response += `👨‍⚕️ <strong>Dr. ${data.name}</strong>\n`;
        response += `🏥 ${data.hospital || 'Not specified'}\n`;
        response += `📝 ${data.bio || 'No bio available'}\n`;
        response += `<button class="doctor-button" data-id="${doc.id}" data-name="${data.name}" data-specialization="${data.specialization}">View Details</button>\n\n`;

        matchedDocs.push({
          id: doc.id,
          name: data.name,
          specialization: data.specialization,
          hospital: data.hospital,
          bio: data.bio,
          diseases: data.diseases,
          contact: data.contact
        });
      }
    });

    if (matchedDocs.length === 0) {
      return `I couldn't find any doctors specializing in ${diseaseName}.`;
    }

    return { text: response, doctors: matchedDocs };
  } catch (error) {
    console.error('Error fetching doctors:', error);
    return {
      text: `Sorry, I couldn't retrieve doctor information. ${error.message}`,
      doctors: []
    };
  }
};

  const handleDoctorButtonClick = async (id, name, specialization) => {
    try {
      const doctorDocRef = doc(db, 'doctors', id);
      const doctorDocSnap = await getDoc(doctorDocRef);
      
      if (!doctorDocSnap.exists()) {
        throw new Error('Doctor information not found');
      }
      
      const doctorData = doctorDocSnap.data();
      setSelectedDoctor({
        id: doctorDocSnap.id,
        userId: doctorData.userId,
        name: doctorData.name || 'Doctor',
        speciality: doctorData.speciality || 'General Practitioner',
        image: doctorData.image || 'https://img.icons8.com/fluency/96/000000/doctor-male.png',        
        hospital: doctorData.hospital,
        bio: doctorData.bio,
        diseases: doctorData.diseases,
        contact: doctorData.contact,
        workingHours: doctorData.workingHours || {},
        consultationFee: doctorData.consultationFee || 'Contact for pricing',
        location: doctorData.location,
        rating: doctorData.rating || 4.5,
        experience: doctorData.experience || '5+ years experience',
        bio: doctorData.bio || 'Experienced medical professional with expertise in their field.',
        education: doctorData.education || 'MD, Medical University',
        languages: doctorData.languages || ['English'],
        diseases: doctorData.diseases || ['General Health', 'Preventive Care']
      });
      setDoctorModalOpen(true);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: prev.length + 1,
          text: `Could not load details for Dr. ${name}: ${error.message}`,
          sender: 'ai',
          isError: true
        }
      ]);
    }
  };

  const closeDoctorModal = () => {
    setDoctorModalOpen(false);
    setSelectedDoctor(null);
  };

  const handleMapButtonClick = async (id, name, address) => {
    try {
      setSelectedLocation({ id, name, address });
      setMapModalOpen(true);
      setMapCoords(null);
      
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        text: `Loading location data for ${name}...`,
        sender: 'ai',
        isError: false,
        temporary: true
      }]);

      const coords = await geocodeAddress(address);
      
      if (coords) {
        setMapCoords(coords);
        setMessages(prev => prev.filter(msg => !msg.temporary));
      } else {
        throw new Error('Could not find coordinates for this address');
      }
    } catch (error) {
      setMessages(prev => [
        ...prev.filter(msg => !msg.temporary),
        {
          id: prev.length + 1,
          text: `Could not load map for ${name}: ${error.message}`,
          sender: 'ai',
          isError: true
        }
      ]);
      setMapModalOpen(false);
    }
  };

  const closeMapModal = () => {
    setMapModalOpen(false);
    setSelectedLocation(null);
    setMapCoords(null);
  };

  useEffect(() => {
    const handleButtonClick = (e) => {
      if (e.target.classList.contains('map-button')) {
        e.preventDefault();
        const id = e.target.getAttribute('data-id');
        const name = e.target.getAttribute('data-name');
        const address = e.target.getAttribute('data-address');
        
        if (!id) {
          console.error('Missing data-id attribute on map button', {id, name, address});
          setMessages(prev => [...prev, {
            id: prev.length + 1,
            text: 'Error: Missing facility ID. Please try another facility.',
            sender: 'ai',
            isError: true
          }]);
          return;
        }

        if (id && name && address) {
          handleMapButtonClick(id, name, address);
        }
      }
      
      if (e.target.classList.contains('doctor-button')) {
        e.preventDefault();
        const id = e.target.getAttribute('data-id');
        const name = e.target.getAttribute('data-name');
        const specialization = e.target.getAttribute('data-specialization');
        
        if (id && name && specialization) {
          handleDoctorButtonClick(id, name, specialization);
        }
      }
    };

    document.addEventListener('click', handleButtonClick);
    return () => {
      document.removeEventListener('click', handleButtonClick);
    };
  }, []);

  const generateAIResponse = async (userInput) => {
    // Check for medical facilities request
    const medicalKeywords = ['medical'];
    const isMedicalRequest = medicalKeywords.some(keyword => 
      userInput.toLowerCase().includes(keyword)
    );

    // Check for doctor suggestion request
    const doctorSuggestionPrefix = 'suggest doctor for ';
    const isDoctorSuggestionRequest = userInput.toLowerCase().startsWith(doctorSuggestionPrefix);
    
    if (isDoctorSuggestionRequest) {
      const diseaseName = userInput.substring(doctorSuggestionPrefix.length).trim();
      if (!diseaseName) {
        setMessages(prev => [...prev, {
          id: prev.length + 1,
          text: 'Please specify a disease or condition to find doctors.',
          sender: 'ai',
          isError: true
        }]);
        return;
      }

      try {
        setIsTyping(true);
        const { text: doctorsText } = await fetchDoctorsForDisease(diseaseName);
        
        setMessages(prev => [
          ...prev,
          {
            id: prev.length + 1,
            text: doctorsText,
            sender: 'ai',
            isError: false,
            isHTML: true
          }
        ]);
      } catch (error) {
        setMessages(prev => [
          ...prev,
          {
            id: prev.length + 1,
            text: error.message,
            sender: 'ai',
            isError: true
          }
        ]);
      } finally {
        setIsTyping(false);
      }
      return;
    }

    if (isMedicalRequest) {
      if (!user) {
        setMessages(prev => [...prev, {
          id: prev.length + 1,
          text: 'Please sign in to access location-based medical facility information.',
          sender: 'ai',
          isError: true
        }]);
        return;
      }

      try {
        setIsTyping(true);
        const { text: facilitiesText } = await fetchNearbyMedicalFacilities(user.uid);
        
        setMessages(prev => [
          ...prev,
          {
            id: prev.length + 1,
            text: facilitiesText,
            sender: 'ai',
            isError: false,
            isHTML: true
          }
        ]);
      } catch (error) {
        setMessages(prev => [
          ...prev,
          {
            id: prev.length + 1,
            text: error.message,
            sender: 'ai',
            isError: true
          }
        ]);
      } finally {
        setIsTyping(false);
      }
      return;
    }

    const history = messages
      .filter(msg => !msg.hideInChat)
      .map(msg => ({
        role: msg.sender === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }));
    
    history.push({
      role: 'user',
      parts: [{
        text: `You are a friendly and professional doctor. Answer briefly, politely, and in a tone that reassures the patient. Respond to this query:\n\n"${userInput}"`
      }]
    });

    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: history }),
    };

    try {
      setIsTyping(true);
      const response = await fetch(import.meta.env.VITE_API_URL_1, requestOptions);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Something went wrong!');
      }

      const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, '$1').trim();
      
      setMessages(prev => [
        ...prev,
        {
          id: prev.length + 1,
          text: responseText,
          sender: 'ai',
          isError: false
        }
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: prev.length + 1,
          text: error.message,
          sender: 'ai',
          isError: true
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim() === '') return;

    const newUserMessage = {
      id: messages.length + 1,
      text: inputValue,
      sender: 'user',
      isError: false
    };
    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');

    generateAIResponse(inputValue);
  };

  const handleTopicClick = (topic) => {
    if (topic.startsWith("Find Doctor for ")) {
      const disease = topic.substring("Find Doctor for ".length);
      setInputValue(`suggest doctor for ${disease}`);
    } else {
      setInputValue(topic);
    }
    setMobileMenuOpen(false);
  };

  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          name: data[0].display_name
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  };






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
    maxWidth: '650px',
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
    <div className="health-ai-app">
      {/* Navbar */}
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

      {/* Mobile Menu */}
      {/* {isMobile && mobileMenuOpen && (
        <div className="mobile-menu">
          <a href="#home" className="mobile-nav-link">Home</a>
          <a href="#about" className="mobile-nav-link">About</a>
          <a href="#privacy" className="mobile-nav-link">Privacy</a>
          <button className="mobile-upgrade-button">Upgrade</button>
        </div>
      )} */}

      <div className="app-container">
        {/* Sidebar */}
        {!isMobile && (
          <div className="app-sidebar">
            <div className="sidebar-header">
              <h3 className="sidebar-title">Topics</h3>
              <button className="new-chat-button">+ New Chat</button>
            </div>
            <div className="topic-list">
              {healthTopics.map((topic, index) => (
                <div 
                  key={index} 
                  className="topic-item"
                  onClick={() => handleTopicClick(topic)}
                >
                  {topic}
                </div>
              ))}
            </div>
            <div className="user-section">
              <div className="user-avatar">
                {user ? user.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="user-name">{user ? user.email : 'User'}</span>
            </div>
          </div>
        )}

{isMobile && (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999,
      backgroundColor: showMobileSidebar ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
      pointerEvents: showMobileSidebar ? 'auto' : 'none',
      transition: 'background-color 0.3s ease',
    }}
  >
    {/* Overlay for click-to-close */}
    <div
      onClick={toggleMobileSidebar}
      style={{
        position: 'absolute',
        inset: 0,
      }}
    />

    {/* Slide-in Panel */}
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100%',
        width: '256px',
        backgroundColor: '#fff',
        boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        overflowY: 'auto',
        padding: '16px',
        transform: showMobileSidebar ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Topics</h3>
        <button
          onClick={toggleMobileSidebar}
          style={{
            fontSize: '1.25rem',
            color: '#666',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ✖
        </button>
      </div>

      <button
        style={{
          width: '100%',
          padding: '8px 16px',
          backgroundColor: '#3b82f6',
          color: '#fff',
          borderRadius: '6px',
          border: 'none',
          marginBottom: '16px',
          cursor: 'pointer',
        }}
      >
        + New Chat
      </button>

      <div>
        {healthTopics.map((topic, index) => (
          <div
            key={index}
            onClick={() => {
              handleTopicClick(topic)
              toggleMobileSidebar()
            }}
            style={{
              cursor: 'pointer',
              color: '#333',
              marginBottom: '8px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.target.style.color = '#3b82f6')}
            onMouseLeave={(e) => (e.target.style.color = '#333')}
          >
            {topic}
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: '32px',
          paddingTop: '16px',
          borderTop: '1px solid #ccc',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
          }}
        >
          {user ? user.email.charAt(0).toUpperCase() : 'U'}
        </div>
        <span style={{ fontSize: '0.875rem', color: '#444' }}>
          {user ? user.email : 'User'}
        </span>
      </div>
    </div>
  </div>
)}



        {/* Main Chat Area */}
        <div className="chat-container">
          <div className="messages-container">
            <div className="chat-header">
              <h2 className="chat-title">SympticAI</h2>
              <p className="chat-subtitle">Ask me about symptoms, prevention, or general health advice</p>
            </div>
            
            {messages
              .filter(message => !message.hideInChat)
              .map((message) => (
                <div 
                  key={message.id} 
                  className={`message ${message.sender === 'user' ? 'user-message' : 'ai-message'} ${message.isError ? 'error-message' : ''}`}
                >
                  <div className="message-content">
                    {message.sender === 'ai' && (
                      <div className="ai-avatar">AI</div>
                    )}
                    {message.isHTML ? (
                      <div 
                        className={`message-text ${message.sender === 'user' ? 'user-message-text' : 'ai-message-text'}`}
                        dangerouslySetInnerHTML={{ __html: message.text }}
                      />
                    ) : (
                      <div className={`message-text ${message.sender === 'user' ? 'user-message-text' : 'ai-message-text'}`}>
                        {message.text}
                      </div>
                    )}
                    {message.sender === 'user' && (
                      <div className="user-avatar-small">
                        {user ? user.email.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="input-form">
            
            <div className="input-container">
              
{isMobile && (
  <button
    onClick={toggleMobileSidebar}
    className="fixed top-5 right-5 z-50 bg-[#001f3f] p-2 rounded-full shadow-lg border border-[#001030] hover:scale-105 transition-transform text-[#cce0ff]"
    aria-label="Toggle Sidebar"
  >
    <HiOutlineMenuAlt3 className="w-6 h-6" />
  </button>
)}
              
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Describe your health concern..."
                className="input-field"
              />
              <button type="submit" className="send-button" disabled={isTyping}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <p className="disclaimer">
              SympticAi provides general health information only. It's not a substitute for professional medical advice.
            </p>
          </form>
        </div>
      </div>

      {/* Map Modal */}
      {mapModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{selectedLocation?.name}</h3>
              <button 
                className="modal-close-button"
                onClick={closeMapModal}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {mapCoords ? (
                <div className="map-container">
                  <MapContainer
                    center={[mapCoords.lat, mapCoords.lng]}
                    zoom={15}
                    className="map-view"
                    key={`${mapCoords.lat}-${mapCoords.lng}`}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <Marker position={[mapCoords.lat, mapCoords.lng]}>
                      <Popup>
                        <b>{selectedLocation?.name}</b><br />
                        {selectedLocation?.address}
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              ) : (
                <div className="map-loading">
                  <p>Loading map data...</p>
                </div>
              )}
              <p className="modal-address">
                <strong>Address:</strong> {selectedLocation?.address}
              </p>
            </div>

            <div className="modal-footer">
              <button 
                className="navigate-button" 
                onClick={() => {
                  if (selectedLocation?.id) {
navigate(`/MedicalInformation/${selectedLocation.id}`, {
  state: {
    facilityData: {
      id: selectedLocation.id,
      name: selectedLocation.name,
      address: selectedLocation.address,
    },
  },
});

                  } else {
                    setMessages(prev => [...prev, {
                      id: uuidv4(),
                      text: 'Unable to view medical information - facility ID not available',
                      sender: 'ai',
                      isError: false
                    }]);
                    setMapModalOpen(false);
                  }
                }}
              >
                View Medical Info
              </button>
              <button 
                className="navigate-button secondary"
                onClick={() => {
                   window.location.href = `https://www.google.com/maps?q=${mapCoords.lat},${mapCoords.lng}`;
                }}
              >
                Open in Google Maps
              </button>
            </div>
          </div>
        </div>
      )}

{doctorModalOpen && selectedDoctor && (
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
              onClick={() => navigate(`/AppointmentBooking/${selectedDoctor.id}`)}
              >Book Appointment</button>
              <button style={styles.secondaryButton}
              onClick={() => navigate(`/Profile/${selectedDoctor.userId}`)}>View Profile</button>
            </div>
          </div>
        </div>
)}

      <style jsx>{`
        .health-ai-app {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100vw;
          background: linear-gradient(135deg, #f5f7fb 0%, #e8f0fe 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          position: relative;
        }

        .app-navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background-color: white;
          box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
          z-index: 100;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .app-logo {
          font-size: 1.5rem;
          font-weight: 700;
          color: #4f46e5;
          letter-spacing: -0.5px;
        }

        .beta-tag {
          font-size: 0.75rem;
          background-color: #e0e7ff;
          color: #4f46e5;
          padding: 0.2rem 0.5rem;
          border-radius: 12px;
          font-weight: 600;
        }

        .mobile-menu-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #4f46e5;
          padding: 0.5rem;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .nav-link {
          text-decoration: none;
          color: #4b5563;
          font-weight: 500;
          font-size: 0.95rem;
          transition: color 0.2s;
        }

        .nav-link:hover {
          color: #4f46e5;
        }

        .upgrade-button {
          background: linear-gradient(to right, #4f46e5, #7c3aed);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 5px rgba(79, 70, 229, 0.2);
        }

        .upgrade-button:hover {
          background: linear-gradient(to right, #4338ca, #6d28d9);
          box-shadow: 0 4px 8px rgba(79, 70, 229, 0.3);
        }

        .mobile-menu {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1rem;
          background-color: white;
          border-bottom: 1px solid #e5e7eb;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        .mobile-nav-link {
          text-decoration: none;
          color: #4b5563;
          font-weight: 500;
          padding: 0.5rem 0;
        }

        .mobile-upgrade-button {
          background: linear-gradient(to right, #4f46e5, #7c3aed);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 0.5rem;
          width: 100%;
        }

        .app-container {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .app-sidebar {
          width: 260px;
          background-color: white;
          border-right: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          padding: 1rem;
          overflow-y: auto;
        }

        .sidebar-header {
          margin-bottom: 1.5rem;
        }

        .sidebar-title {
          font-size: 1rem;
          font-weight: 600;
          color: #4b5563;
          margin-bottom: 1rem;
        }

        .new-chat-button {
          width: 100%;
          background: linear-gradient(to right, #4f46e5, #7c3aed);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }

        .new-chat-button:hover {
          background: linear-gradient(to right, #4338ca, #6d28d9);
        }

        .topic-list {
          flex: 1;
          overflow-y: auto;
        }

        .topic-item {
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 0.5rem;
          cursor: pointer;
          font-size: 0.9rem;
          color: #4b5563;
          transition: all 0.2s;
        }

        .topic-item:hover {
          background-color: #f3f4f6;
        }

        .user-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 8px;
          margin-top: auto;
          background-color: #f9fafb;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }

        .user-name {
          font-weight: 500;
          font-size: 0.9rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chat-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chat-header {
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          background-color: white;
          text-align: center;
        }

        .chat-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 0.25rem;
        }

        .chat-subtitle {
          font-size: 0.9rem;
          color: #6b7280;
        }

.messages-container {
  display: flex;
  flex-direction: column;
  padding: 4.5rem;
  overflow-y: auto;
  background-color: #f9fafb;
}

        .message {
          margin-bottom: 1.5rem;
          max-width: 95%;
          transition: all 0.3s ease;
        }

.user-message {
  align-self: flex-end;          /* Push to the right in a flex column */
  background-color: #dbeafe;     /* Soft blue bubble */
  color: #1e293b;
  padding: 0.75rem 1.5rem;
  border-radius: 1rem 1rem 0 1rem;
  max-width: 80%;
  margin-bottom: 1rem;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
         

        .ai-message {
          margin-right: auto;
        }

        .error-message {
          background-color: #fee2e2;
          border: 1px solid #ef4444;
        }

        .message-content {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .ai-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #34d399);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.75rem;
          flex-shrink: 0;
        }

        .user-avatar-small {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.75rem;
          flex-shrink: 0;
        }

        .message-text {
          padding: 0.75rem 1rem;
          border-radius: 18px;
          font-size: 0.95rem;
          line-height: 1.5;
          transition: all 0.2s;
        }

        .user-message-text {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white;
          border-top-right-radius: 4px;
        }

        .ai-message-text {
          background-color: white;
          color: #111827;
          border: 1px solid #e5e7eb;
          border-top-left-radius: 4px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .typing-indicator {
          display: flex;
          margin-bottom: 1.5rem;
          margin-right: auto;
          max-width: 80%;
        }

        .typing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #9ca3af;
          margin: 0 2px;
          animation: typingAnimation 1.4s infinite ease-in-out;
        }

        .typing-dot:nth-child(1) {
          animation-delay: 0s;
        }

        .typing-dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typingAnimation {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }

        .input-form {
          padding: 1rem;
          border-top: 1px solid #e5e7eb;
          background-color: white;
        }

        .input-container {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .input-field {
          flex: 1;
          padding: 0.75rem 1rem;
          border-radius: 24px;
          border: 1px solid #e5e7eb;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .input-field:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .send-button {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white;
          border: none;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 5px rgba(79, 70, 229, 0.2);
        }

        .send-button:hover {
          background: linear-gradient(135deg, #4338ca, #6d28d9);
          box-shadow: 0 4px 8px rgba(79, 70, 229, 0.3);
        }

        .send-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .disclaimer {
          font-size: 0.75rem;
          color: #9ca3af;
          text-align: center;
          margin-top: 0.5rem;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          backdrop-filter: blur(5px);
        }

        .modal-content {
          background-color: white;
          border-radius: 12px;
          width: 80%;
          max-width: 800px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .modal-close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
          padding: 0 0.5rem;
          transition: color 0.2s;
        }

        .modal-close-button:hover {
          color: #4b5563;
        }

        .modal-body {
          padding: 1.5rem;
          overflow: auto;
        }

        .map-container {
          height: 400px;
          width: 100%;
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }

        .map-view {
          height: 100%;
          width: 100%;
        }

        .map-loading {
          height: 400px;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #f9fafb;
          border-radius: 8px;
          color: #6b7280;
        }

        .modal-address {
          margin-top: 1rem;
          padding: 1rem;
          background-color: #f9fafb;
          border-radius: 8px;
          font-size: 0.9rem;
          color: #4b5563;
        }

        .doctor-info-section {
          margin-bottom: 1.5rem;
        }

        .doctor-info-section h4 {
          font-size: 1rem;
          color: #4f46e5;
          margin-bottom: 0.5rem;
        }

        .doctor-info-section p {
          font-size: 0.95rem;
          line-height: 1.6;
          color: #4b5563;
        }

        .disease-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .disease-tag {
          background-color: #e0e7ff;
          color: #4f46e5;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .modal-footer {
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .navigate-button {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 5px rgba(79, 70, 229, 0.2);
        }

        .navigate-button:hover {
          background: linear-gradient(135deg, #4338ca, #6d28d9);
          box-shadow: 0 4px 8px rgba(79, 70, 229, 0.3);
        }

        .navigate-button.secondary {
          background: linear-gradient(135deg, #10b981, #34d399);
          margin-left: 1rem;
          box-shadow: 0 2px 5px rgba(16, 185, 129, 0.2);
        }

        .navigate-button.secondary:hover {
          background: linear-gradient(135deg, #0d9c6e, #2bb67d);
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .app-navbar {
            padding: 1rem;
          }
          
          .messages-container {
            padding: 1rem;
          }
          
          .message {
            max-width: 90%;
          }
          
          .modal-content {
            width: 95%;
          }
        }
      `}</style>
    </div>
  );
};

export default HealthAIChat;