import React, { useEffect, useState } from 'react';
import { 
  FaCheck, FaTimes, FaFileDownload, FaSearch, FaFilter, 
  FaUserLock, FaUnlockAlt, FaUserMd, FaUsers, FaBlog, 
  FaHome, FaEdit, FaCalendarAlt, FaClock, FaHospital, 
  FaMoneyBillWave, FaGraduationCap, FaLanguage, FaStar,
  FaExclamationTriangle, FaPlus, FaMinus, FaLink, FaTrash,
  FaSignOutAlt 
} from 'react-icons/fa';
import { db } from '../../firebase';
import { 
  collection, query, where, getDocs, getDoc, updateDoc, doc, setDoc,
  getCountFromServer, orderBy, arrayUnion, arrayRemove, addDoc, deleteDoc 
} from "firebase/firestore";
import { useNavigate } from 'react-router-dom';
import { useLogout } from '../../contexts/logout';



export default function AdminPanel() {
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [medicals, setMedicals] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]); // For medical-doctor association
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    patients: 0,
    doctors: 0,
    blogs: 0,
    reports: 0,
    medicals: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  // const [activeTab, setActiveTab] = useState('home');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [selectedMedical, setSelectedMedical] = useState(null);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [editingMedical, setEditingMedical] = useState(null);
  const [newService, setNewService] = useState({ name: '', available: '' });
  const [selectedDoctorToAdd, setSelectedDoctorToAdd] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [genreFilter, setGenreFilter] = useState('all');
  const [loadingStats, setLoadingStats] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');

const [basicInfo, setBasicInfo] = useState({});
const [contactInfo, setContactInfo] = useState({});
const [facilitiesInfo, setFacilitiesInfo] = useState({});
const [servicesInfo, setServicesInfo] = useState({ services: [] });
const [doctorsInfo, setDoctorsInfo] = useState({ doctors: [], doctorIds: [] });
const [saveStatus, setSaveStatus] = useState({});

  const onLogoutClick = async () => {
    await handleLogout();
  };
const handleLogout = useLogout();

  const [activeTab, setActiveTab] = useState(() => {
    // Get active tab from localStorage or default to 'home'
    return localStorage.getItem('adminActiveTab') || 'home';
  });
const [showAddMedicalModal, setShowAddMedicalModal] = useState(false);
const [newMedical, setNewMedical] = useState({
  name: '',
  type: 'hospital',
  description: '',
  address: '',
  location: '',
  emergencyNumber: '',
  generalNumber: '',
  ambulanceNumber: '',
  email: '',
  website: '',
  rating: 0,
  facilities: [],
  services: [],
  doctorIds: [],
  doctors: []
});

const handleDeleteMedical = async (medicalId) => {
  try {
    // Delete the medical document
    await deleteDoc(doc(db, "medicals", medicalId));
    
    // Remove any hospital references from associated doctors
    const medicalDoc = medicals.find(m => m.id === medicalId);
    if (medicalDoc?.doctors?.length) {
      await Promise.all(
        medicalDoc.doctors.map(async (doctor) => {
          await updateDoc(doc(db, "doctors", doctor.id), {
            hospital: ''
          });
        })
      );
    }
    
    // Update the UI
    setMedicals(medicals.filter(m => m.id !== medicalId));
    alert('Medical facility deleted successfully!');
  } catch (error) {
    console.error("Error deleting medical facility:", error);
    alert('Error deleting medical facility');
  }
};

  const handleClick = (text) => {
    setSelectedText(text);
    setShowModal(true);
  };

  // Days for working hours display
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

    // Save active tab to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);
  
  useEffect(() => {
    fetchStats();
    
    if (activeTab === 'doctor-requests') {
      fetchRequests();
    } else if (activeTab === 'user-management') {
      fetchUsers();
    } else if (activeTab === 'blog-management') {
      fetchBlogs();
    } else if (activeTab === 'doctor-management') {
      fetchDoctors();
    } else if (activeTab === 'medical-management') {
      fetchMedicals();
      fetchAllDoctors(); // Fetch all doctors for medical-doctor association
    } else if (activeTab === 'home') {
      fetchReports();
    }
  }, [activeTab, genreFilter]);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      
      // Count patients
      const patientsQuery = query(
        collection(db, "users"), 
        where("role", "==", "patient"),
        where("status", "==", "approved")
      );
      const patientsSnapshot = await getCountFromServer(patientsQuery);
      
      // Count doctors
      const doctorsQuery = query(
        collection(db, "users"), 
        where("role", "==", "doctor"),
        where("status", "==", "approved")
      );
      const doctorsSnapshot = await getCountFromServer(doctorsQuery);
      
      // Count blogs
      const blogsQuery = query(collection(db, "posts"));
      const blogsSnapshot = await getCountFromServer(blogsQuery);
      
      // Count reports
      const reportsQuery = query(collection(db, "report"));
      const reportsSnapshot = await getCountFromServer(reportsQuery);
      
      // Count medicals
      const medicalsQuery = query(collection(db, "medicals"));
      const medicalsSnapshot = await getCountFromServer(medicalsQuery);
      
      setStats({
        patients: patientsSnapshot.data().count,
        doctors: doctorsSnapshot.data().count,
        blogs: blogsSnapshot.data().count,
        reports: reportsSnapshot.data().count,
        medicals: medicalsSnapshot.data().count
      });
      
      setLoadingStats(false);
    } catch (error) {
      console.error("Error fetching stats:", error);
      setLoadingStats(false);
    }
  };

  const fetchRequests = async () => {
    const q = query(collection(db, "users"), where("status", "==", "pending"));
    const snapshot = await getDocs(q);
    setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchUsers = async () => {
    const q = query(collection(db, "users"), where("status", "==", "approved"));
    const snapshot = await getDocs(q);
    setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchBlogs = async () => {
    let q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    
    if (genreFilter !== 'all') {
      q = query(q, where("genre", "==", genreFilter));
    }
    
    const snapshot = await getDocs(q);
    setBlogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchDoctors = async () => {
    const q = query(collection(db, "doctors"));
    const snapshot = await getDocs(q);

    const doctors = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const doctorData = docSnap.data();
        const userId = doctorData.userId;

        if (!userId) {
          console.warn(`Missing userId for doctor ${docSnap.id}`);
          return { id: docSnap.id, userId: null, email: "No Email", ...doctorData };
        }

        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        return {
          id: docSnap.id,
          userId,
          email: userSnap.exists() ? userSnap.data().email : "Email not found",
          ...doctorData,
        };
      })
    );

    setDoctors(doctors);
  };

  const fetchAllDoctors = async () => {
    const q = query(collection(db, "doctors"));
    const snapshot = await getDocs(q);
    setAllDoctors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

useEffect(() => {
  if (editingMedical) {
    setBasicInfo({
      name: editingMedical.name,
      type: editingMedical.type,
      description: editingMedical.description
    });
    setContactInfo({
      address: editingMedical.address,
      location: editingMedical.location,
      emergencyNumber: editingMedical.emergencyNumber,
      generalNumber: editingMedical.generalNumber,
      ambulanceNumber: editingMedical.ambulanceNumber,
      email: editingMedical.email,
      website: editingMedical.website,
      rating: editingMedical.rating
    });
    setFacilitiesInfo({
      facilities: editingMedical.facilities || []
    });
    setServicesInfo({
      services: editingMedical.services || []
    });
    setDoctorsInfo({
      doctors: editingMedical.doctors || [],
      doctorIds: editingMedical.doctorIds || []
    });
  }
}, [editingMedical]);


  const fetchMedicals = async () => {
    const q = query(collection(db, "medicals"));
    const snapshot = await getDocs(q);
    
    const medicalsData = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const medicalData = docSnap.data();
        
        // Fetch doctor details for each doctorId
        const doctorsData = await Promise.all(
          medicalData.doctorIds?.map(async (doctorRef) => {
            const doctorDoc = await getDoc(doctorRef);
            return doctorDoc.exists() ? { id: doctorDoc.id, ...doctorDoc.data() } : null;
          }) || []
        );
        
        return {
          id: docSnap.id,
          ...medicalData,
          doctors: doctorsData.filter(doc => doc !== null)
        };
      })
    );
    
    setMedicals(medicalsData);
  };

  const fetchReports = async () => {
    const q = query(collection(db, "report"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const reportsData = await Promise.all(snapshot.docs.map(async doc => {
      const report = { id: doc.id, ...doc.data() };
      if (report.role === "user") {
        const userDoc = await getDocs(query(collection(db, "users"), where("id", "==", report.userId)));
        if (!userDoc.empty) {
          report.userType = userDoc.docs[0].data().role;
        }
      }
      return report;
    }));
    setReports(reportsData);
  };

const handleApproval = async (id, action) => {
  const userRef = doc(db, "users", id);

  await updateDoc(userRef, {
    status: action,
    reviewedAt: new Date().toISOString()
  });

  // If the user is approved, create a new doctor document with a unique ID
  if (action === "approved") {
    const doctorRef = doc(collection(db, "doctors")); // Generates a new unique ID
    await setDoc(doctorRef, {
      bio: "",
      consultationFee: 0,
      disease: [],
      education: "",
      experience: "",
      hospital: "",
      image: "",
      language: [],
      location: "",
      name: "",
      rating: 0,
      speciality: "",
      userId: id, // Stores the original user ID
      workingHours: {}
    });
  }

  fetchRequests();
  fetchStats();
};

  const handleBlockToggle = async (user) => {
    const newStatus = user.blocked ? false : true;
    await updateDoc(doc(db, "users", user.id), { blocked: newStatus });
    fetchUsers();
  };

  const handleBlogBlockToggle = async (blog) => {
    const newStatus = blog.blocked ? false : true;
    await updateDoc(doc(db, "posts", blog.id), { blocked: newStatus });
    fetchBlogs();
  };

  const handleDoctorUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "doctors", editingDoctor.id), editingDoctor);
      setEditingDoctor(null);
      fetchDoctors();
    } catch (error) {
      console.error("Error updating doctor:", error);
    }
  };


  const handleDoctorEditChange = (e) => {
    const { name, value } = e.target;
    setEditingDoctor(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMedicalEditChange = (e) => {
    const { name, value } = e.target;
    setEditingMedical(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleServiceChange = (e) => {
    const { name, value } = e.target;
    setNewService(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleWorkingHourChange = (day, field, value) => {
    setEditingDoctor(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: {
          ...prev.workingHours[day],
          [field]: parseInt(value) || 0
        }
      }
    }));
  };

  const filteredRequests = requests.filter(req => 
    req.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user => 
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBlogs = blogs.filter(blog => 
    blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    blog.authorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDoctors = doctors.filter(doctor => 
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.speciality.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMedicals = medicals.filter(medical => 
    medical.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medical.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Responsive breakpoints
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

  // Animation for counting numbers
  const CountUpAnimation = ({ target, duration = 2000 }) => {
    const [count, setCount] = useState(0);
    
    useEffect(() => {
      let start = 0;
      const increment = target / (duration / 16);
      
      const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);
      
      return () => clearInterval(timer);
    }, [target, duration]);
    
    return <span>{count}</span>;
  };

  const styles = {
    layout: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      minHeight: '100vh',
      width: '98.8vw',
      overflowX: 'hidden',
      position: 'relative',
    },
    sidebar: {
      background: 'linear-gradient(180deg, #3a7bd5 0%, #00d2ff 100%)',
      color: 'white',
      padding: isMobile ? '1rem' : '1.5rem',
      position: isDesktop ? 'fixed' : isMobile ? (isSidebarOpen ? 'fixed' : 'none') : 'static',
      top: 0,
      left: 0,
      bottom: 0,
      width: isDesktop ? '240px' : isMobile ? (isSidebarOpen ? '280px' : '0') : '280px',
      zIndex: 100,
      boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.3s ease',
      transform: isMobile && !isSidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
      overflow: 'hidden'
    },
    sidebarTitle: {
      fontSize: isMobile ? '1.2rem' : '1.4rem',
      marginBottom: '2rem',
      paddingBottom: '1rem',
      borderBottom: '1px solid rgba(255,255,255,0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      flexShrink: 0
    },
    navListContainer: {
      flex: 1,
      overflowY: 'auto',
      paddingRight: '0.5rem',
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(255,255,255,0.3) rgba(255,255,255,0.1)',
      '&::-webkit-scrollbar': {
        width: '6px'
      },
      '&::-webkit-scrollbar-track': {
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '3px'
      },
      '&::-webkit-scrollbar-thumb': {
        background: 'rgba(255,255,255,0.3)',
        borderRadius: '3px'
      },
      '&::-webkit-scrollbar-thumb:hover': {
        background: 'rgba(255,255,255,0.5)'
      },
      
    },
    navList: {
      listStyle: 'none',
      padding: 0,
      margin: 0
    },
    navItem: {
      padding: '0.8rem 1rem',
      cursor: 'pointer',
      transition: 'all 0.3s',
      borderRadius: '8px',
      marginBottom: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '0.95rem',
      ':hover': {
        background: 'rgba(255,255,255,0.1)'
      }
    },
    activeNavItem: {
      background: 'rgba(255,255,255,0.2)',
      fontWeight: 500,
      backdropFilter: 'blur(5px)'
    },
    content: {
      padding: isMobile ? '1rem' : '2rem',
      background: '#f8fafc',
      width: '100%',
      overflowX: 'hidden',
      marginLeft: isDesktop ? '280px' : '0',
      flex: 1,
      marginTop: isMobile ? '60px' : '0'
    },
    mobileMenuButton: {
      display: isDesktop ? 'none' : 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'fixed',
      top: '1rem',
      left: '1rem',
      zIndex: 101,
      background: '#3a7bd5',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      cursor: 'pointer',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
    },
    toolbar: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: isMobile ? '1rem' : '2rem',
      marginBottom: '2rem',
      position: 'relative'
    },
    title: {
      color: '#2c3e50',
      margin: 0,
      fontSize: isMobile ? '1.3rem' : '1.5rem',
      fontWeight: 600
    },
    searchBar: {
      display: 'flex',
      alignItems: 'center',
      background: 'white',
      borderRadius: '30px',
      padding: '0.5rem 1rem',
      boxShadow: '0 2px 15px rgba(0,0,0,0.05)',
      width: isMobile ? '100%' : '400px',
      border: '1px solid #e1e5eb'
    },
    searchInput: {
      border: 'none',
      padding: '0.5rem',
      outline: 'none',
      width: '100%',
      fontSize: '0.95rem',
      background: 'transparent'
    },
    filterButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: '#3a7bd5',
      color: 'white',
      border: 'none',
      borderRadius: '30px',
      cursor: 'pointer',
      padding: '0.6rem 1.2rem',
      fontSize: '0.9rem',
      transition: 'all 0.3s',
      boxShadow: '0 2px 10px rgba(58,123,213,0.3)',
      ':hover': {
        background: '#2c6bb7'
      }
    },
    filterSelect: {
      padding: '0.6rem 1rem',
      borderRadius: '30px',
      border: '1px solid #e1e5eb',
      background: 'white',
      marginLeft: '0.5rem',
      outline: 'none',
      cursor: 'pointer'
    },
    statsContainer: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
      gap: '1.5rem',
      marginBottom: '2rem'
    },
    statCard: {
      background: 'white',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: '0 5px 15px rgba(0,0,0,0.05)',
      transition: 'all 0.3s',
      border: '1px solid rgba(0,0,0,0.05)',
      textAlign: 'center',
      ':hover': {
        transform: 'translateY(-3px)',
        boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
      }
    },
    statIcon: {
      fontSize: '2rem',
      marginBottom: '1rem',
      color: '#3a7bd5'
    },
    reportIcon: {
      color: '#f44336'
    },
    statNumber: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#2c3e50',
      margin: '0.5rem 0'
    },
    statLabel: {
      fontSize: '1rem',
      color: '#64748b',
      margin: 0
    },
    requestsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: '1.5rem'
    },
    blogGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(auto-fill, minmax(300px, 1fr))' : 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '1.5rem'
    },
    doctorGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(auto-fill, minmax(300px, 1fr))' : 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '1.5rem'
    },
    medicalGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(auto-fill, minmax(300px, 1fr))' : 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '1.5rem'
    },
    card: {
      background: 'white',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: '0 5px 15px rgba(0,0,0,0.05)',
      transition: 'all 0.3s',
      border: '1px solid rgba(0,0,0,0.05)',
      ':hover': {
        transform: 'translateY(-3px)',
        boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
      }
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1rem',
      paddingBottom: '1rem',
      borderBottom: '1px solid rgba(0,0,0,0.05)'
    },
    cardTitle: {
      margin: 0,
      color: '#2c3e50',
      fontSize: '1.1rem',
      fontWeight: 600
    },
    statusBadge: {
      fontSize: '0.75rem',
      padding: '0.3rem 0.8rem',
      borderRadius: '12px',
      fontWeight: 500
    },
    statusPending: {
      background: '#fff3cd',
      color: '#856404'
    },
    statusApproved: {
      background: '#d4edda',
      color: '#155724'
    },
    statusRejected: {
      background: '#f8d7da',
      color: '#721c24'
    },
    statusBlocked: {
      background: '#f8d7da',
      color: '#721c24'
    },
    meta: {
      margin: '0.75rem 0',
      color: '#64748b',
      fontSize: '0.9rem',
      lineHeight: 1.6
    },
    actions: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: isMobile ? '0.75rem' : 0,
      marginTop: '1.5rem',
      paddingTop: '1rem',
      borderTop: '1px solid rgba(0,0,0,0.05)'
    },
    linkButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: '#3a7bd5',
      textDecoration: 'none',
      fontSize: '0.9rem',
      fontWeight: 500,
      transition: 'all 0.3s',
      padding: '0.5rem 0',
      ':hover': {
        color: '#2c6bb7'
      }
    },
    actionButtons: {
      display: 'flex',
      gap: '0.75rem',
      width: isMobile ? '100%' : 'auto'
    },
    approveButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '0.6rem 1rem',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '0.9rem',
      transition: 'all 0.3s',
      background: '#4CAF50',
      color: 'white',
      width: isMobile ? '100%' : 'auto',
      boxShadow: '0 2px 8px rgba(76,175,80,0.3)',
      ':hover': {
        background: '#3d8b40'
      }
    },
    rejectButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '0.6rem 1rem',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '0.9rem',
      transition: 'all 0.3s',
      background: '#f44336',
      color: 'white',
      width: isMobile ? '100%' : 'auto',
      boxShadow: '0 2px 8px rgba(244,67,54,0.3)',
      ':hover': {
        background: '#d32f2f'
      }
    },
    blockButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '0.6rem 1rem',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '0.9rem',
      transition: 'all 0.3s',
      background: '#3a7bd5',
      color: 'white',
      width: isMobile ? '100%' : 'auto',
      boxShadow: '0 2px 8px rgba(58,123,213,0.3)',
      ':hover': {
        background: '#2c6bb7'
      }
    },
    unblockButton: {
      background: '#4CAF50',
      boxShadow: '0 2px 8px rgba(76,175,80,0.3)',
      ':hover': {
        background: '#3d8b40'
      }
    },
    viewButton: {
      background: '#9c27b0',
      marginRight: '0.5rem',
      boxShadow: '0 2px 8px rgba(156,39,176,0.3)',
      ':hover': {
        background: '#7b1fa2'
      }
    },
    editButton: {
      background: '#FF9800',
      marginRight: '0.5rem',
      boxShadow: '0 2px 8px rgba(255,152,0,0.3)',
      ':hover': {
        background: '#F57C00'
      }
    },
    addButton: {
      background: '#4CAF50',
      boxShadow: '0 2px 8px rgba(76,175,80,0.3)',
      ':hover': {
        background: '#3d8b40'
      }
    },    
    tableContainer: {
      width: '100%',
      overflowX: 'auto',
      borderRadius: '12px',
      boxShadow: '0 2px 15px rgba(0,0,0,0.05)',
      background: 'white',
      padding: isMobile ? '0' : '1rem'
    },
    userTable: {
      width: '100%',
      borderCollapse: 'separate',
      borderSpacing: '0',
      minWidth: isMobile ? '600px' : 'auto'
    },
    tableHeader: {
      background: '#f8fafc',
      fontWeight: '600',
      padding: '1rem',
      textAlign: 'left',
      color: '#64748b',
      fontSize: '0.85rem',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      position: 'sticky',
      top: 0,
      borderBottom: '1px solid rgba(0,0,0,0.05)'
    },
    tableCell: {
      padding: '1rem',
      textAlign: 'left',
      borderBottom: '1px solid rgba(0,0,0,0.05)',
      color: '#2c3e50',
      fontSize: '0.9rem'
    },
    blogImage: {
      width: '100%',
      height: '180px',
      objectFit: 'cover',
      borderRadius: '8px',
      marginBottom: '1rem'
    },
    medicalImage: {
      width: '100%',
      height: '180px',
      objectFit: 'cover',
      borderRadius: '8px',
      marginBottom: '1rem'
    },
    blogContentPreview: {
      display: '-webkit-box',
      WebkitLineClamp: 3,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      color: '#64748b',
      fontSize: '0.9rem',
      lineHeight: 1.6
    },
    genreBadge: {
      display: 'inline-block',
      padding: '0.25rem 0.5rem',
      borderRadius: '4px',
      background: '#e3f2fd',
      color: '#1976d2',
      fontSize: '0.8rem',
      marginRight: '0.5rem',
      marginBottom: '0.5rem'
    },
    typeBadge: {
      display: 'inline-block',
      padding: '0.25rem 0.5rem',
      borderRadius: '4px',
      background: '#e8f5e9',
      color: '#2e7d32',
      fontSize: '0.8rem',
      marginRight: '0.5rem',
      marginBottom: '0.5rem'
    },
    feedbackCount: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.3rem',
      fontSize: '0.8rem',
      color: '#64748b',
      marginRight: '1rem'
    },
    usefulCount: {
      color: '#4CAF50'
    },
    notUsefulCount: {
      color: '#f44336'
    },
    popupOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backdropFilter: 'blur(5px)'
    },
    popupContent: {
      background: 'white',
      padding: '2rem',
      borderRadius: '12px',
      maxWidth: isMobile ? '90%' : '600px',
      width: '100%',
      boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
      animation: 'fadeIn 0.3s ease',
      maxHeight: '80vh',
      overflowY: 'auto'
    },
    popupTitle: {
      marginTop: 0,
      color: '#2c3e50',
      marginBottom: '1.5rem',
      fontSize: '1.3rem',
      fontWeight: 600
    },
    popupButton: {
      padding: '0.75rem 1.5rem',
      background: '#3a7bd5',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      marginTop: '1.5rem',
      fontSize: '0.95rem',
      transition: 'all 0.3s',
      boxShadow: '0 2px 10px rgba(58,123,213,0.3)',
      ':hover': {
        background: '#2c6bb7'
      }
    },
    editForm: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    },
    formLabel: {
      fontSize: '0.9rem',
      color: '#64748b',
      fontWeight: 500
    },
    formInput: {
      padding: '0.75rem',
      borderRadius: '6px',
      border: '1px solid #e1e5eb',
      fontSize: '0.95rem',
      outline: 'none',
      transition: 'all 0.3s',
      ':focus': {
        borderColor: '#3a7bd5',
        boxShadow: '0 0 0 3px rgba(58,123,213,0.2)'
      }
    },
    formTextarea: {
      padding: '0.75rem',
      borderRadius: '6px',
      border: '1px solid #e1e5eb',
      fontSize: '0.95rem',
      outline: 'none',
      minHeight: '100px',
      resize: 'vertical',
      transition: 'all 0.3s',
      ':focus': {
        borderColor: '#3a7bd5',
        boxShadow: '0 0 0 3px rgba(58,123,213,0.2)'
      }
    },
    workingHourInput: {
      width: '60px',
      padding: '0.5rem',
      borderRadius: '4px',
      border: '1px solid #e1e5eb',
      textAlign: 'center'
    },
    serviceInput: {
      padding: '0.5rem',
      borderRadius: '4px',
      border: '1px solid #e1e5eb',
      marginRight: '0.5rem'
    },
    serviceItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.5rem',
      background: '#f8fafc',
      borderRadius: '4px',
      marginBottom: '0.5rem'
    },
    serviceActions: {
      display: 'flex',
      gap: '0.5rem'
    },
    serviceButton: {
      padding: '0.25rem 0.5rem',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '0.8rem'
    },
    addServiceButton: {
      background: '#4CAF50',
      color: 'white',
      ':hover': {
        background: '#3d8b40'
      }
    },
    removeServiceButton: {
      background: '#f44336',
      color: 'white',
      ':hover': {
        background: '#d32f2f'
      }
    },
    doctorItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.5rem',
      background: '#f8fafc',
      borderRadius: '4px',
      marginBottom: '0.5rem'
    },
    doctorSelect: {
      padding: '0.5rem',
      borderRadius: '4px',
      border: '1px solid #e1e5eb',
      marginRight: '0.5rem',
      flex: 1
    },
    addDoctorButton: {
      padding: '0.5rem 1rem',
      background: '#3a7bd5',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      ':hover': {
        background: '#2c6bb7'
      }
    },
    statItem: {
      marginBottom: '1rem'
    },
    statLabelPopup: {
      color: '#64748b',
      fontSize: '0.85rem',
      marginBottom: '0.25rem'
    },
    statValuePopup: {
      color: '#2c3e50',
      fontSize: '0.95rem',
      fontWeight: 500
    },
    blogContentFull: {
      color: '#2c3e50',
      fontSize: '0.95rem',
      lineHeight: 1.8,
      margin: '1rem 0'
    },
    workingHoursContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      gap: '0.5rem',
      marginTop: '0.5rem'
    },
    workingHourItem: {
      background: '#f8fafc',
      padding: '0.5rem',
      borderRadius: '6px',
      fontSize: '0.8rem'
    },
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.5)',
      zIndex: 99,
      display: isMobile && isSidebarOpen ? 'block' : 'none'
    },
    loadingAnimation: {
      display: 'inline-block',
      width: '80px',
      height: '80px',
      margin: '0 auto',
      ':after': {
        content: '""',
        display: 'block',
        width: '64px',
        height: '64px',
        margin: '8px',
        borderRadius: '50%',
        border: '6px solid #3a7bd5',
        borderColor: '#3a7bd5 transparent #3a7bd5 transparent',
        animation: 'loading 1.2s linear infinite'
      }
    },
    facilityBadge: {
      display: 'inline-block',
      padding: '0.25rem 0.5rem',
      borderRadius: '4px',
      background: '#e1f5fe',
      color: '#0288d1',
      fontSize: '0.8rem',
      marginRight: '0.5rem',
      marginBottom: '0.5rem'
    }
  };

  return (
    <div style={styles.layout}>
      {/* Mobile menu button */}
      {!isDesktop && (
        <button 
          style={styles.mobileMenuButton}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <FaUserMd />
        </button>
      )}

      {/* Overlay for mobile sidebar */}
      <div 
        style={styles.overlay}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <h3 style={styles.sidebarTitle}>
          <FaUserMd /> Admin - SympticAi
        </h3>
        <div style={styles.navListContainer}>
          <nav>
            <ul style={styles.navList}>
              <li 
                style={{
                  ...styles.navItem,
                  ...(activeTab === 'home' && styles.activeNavItem)
                }} 
                onClick={() => {
                  setActiveTab('home');
                  if (isMobile) setIsSidebarOpen(false);
                }}
              >
                <FaHome /> Dashboard
              </li>
              <li 
                style={{
                  ...styles.navItem,
                  ...(activeTab === 'doctor-requests' && styles.activeNavItem)
                }} 
                onClick={() => {
                  setActiveTab('doctor-requests');
                  if (isMobile) setIsSidebarOpen(false);
                }}
              >
                <FaUserMd /> Doctor Requests
              </li>
              <li 
                style={{
                  ...styles.navItem,
                  ...(activeTab === 'user-management' && styles.activeNavItem)
                }} 
                onClick={() => {
                  setActiveTab('user-management');
                  if (isMobile) setIsSidebarOpen(false);
                }}
              >
                <FaUsers /> User Management
              </li>
              <li 
                style={{
                  ...styles.navItem,
                  ...(activeTab === 'blog-management' && styles.activeNavItem)
                }} 
                onClick={() => {
                  setActiveTab('blog-management');
                  if (isMobile) setIsSidebarOpen(false);
                }}
              >
                <FaBlog /> Blog Management
              </li>
              <li 
                style={{
                  ...styles.navItem,
                  ...(activeTab === 'doctor-management' && styles.activeNavItem)
                }} 
                onClick={() => {
                  setActiveTab('doctor-management');
                  if (isMobile) setIsSidebarOpen(false);
                }}
              >
                <FaUserMd /> Doctor Management
              </li>
              <li 
                style={{
                  ...styles.navItem,
                  ...(activeTab === 'medical-management' && styles.activeNavItem)
                }} 
                onClick={() => {
                  setActiveTab('medical-management');
                  if (isMobile) setIsSidebarOpen(false);
                }}
              >
                <FaHospital /> Medical Management
              </li>
<li
  style={{
    ...styles.navItem,
    ...(activeTab === 'logout' && styles.activeNavItem)
  }}
onClick={onLogoutClick}
>
  <FaSignOutAlt /> Log Out
</li>              
            </ul>
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main style={styles.content}>
        <div style={styles.toolbar}>
          <h2 style={styles.title}>
            {activeTab === 'home' && 'Admin Dashboard'}
            {activeTab === 'doctor-requests' && 'Doctor Approval Requests'}
            {activeTab === 'user-management' && 'User Management'}
            {activeTab === 'blog-management' && 'Blog Management'}
            {activeTab === 'doctor-management' && 'Doctor Management'}
            {activeTab === 'medical-management' && 'Medical Management'}
          </h2>
          
          {(activeTab !== 'home') && (
            <div style={styles.searchBar}>
              <FaSearch style={{ color: '#64748b', fontSize: '0.9rem' }} />
              <input 
                type="text" 
                placeholder={
                  activeTab === 'doctor-requests' ? "Search doctors..." : 
                  activeTab === 'user-management' ? "Search users..." :
                  activeTab === 'blog-management' ? "Search blogs..." :
                  activeTab === 'doctor-management' ? "Search doctors..." :
                  "Search medicals..."
                } 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              {activeTab === 'blog-management' && (
                <>
                  <select 
                    value={genreFilter}
                    onChange={(e) => setGenreFilter(e.target.value)}
                    style={styles.filterSelect}
                  >
                    <option value="all">All Genres</option>
                    <option value="health">Health</option>
                    <option value="nutrition">Nutrition</option>
                    <option value="fitness">Fitness</option>
                    <option value="mental-health">Mental Health</option>
                    <option value="disease">Disease</option>
                  </select>
                </>
              )}

              {activeTab === 'medical-management' && (
                <button 
                  style={{
                    ...styles.filterButton,
                    ...styles.addButton,
                    marginLeft: '0.5rem'
                  }}
                  onClick={() => setShowAddMedicalModal(true)}
                >
                  <FaPlus /> Add Medical
                </button>
              )}  

              <button style={styles.filterButton}>
                <FaFilter /> Filter
              </button>
            </div>
          )}
        </div>

        {activeTab === 'home' ? (
          <>
            <div style={styles.statsContainer}>
              <div style={styles.statCard}>
                <div style={styles.statIcon}><FaUsers /></div>
                {loadingStats ? (
                  <div style={styles.loadingAnimation}></div>
                ) : (
                  <>
                    <div style={styles.statNumber}>
                      <CountUpAnimation target={stats.patients} />
                    </div>
                    <p style={styles.statLabel}>Total Patients</p>
                  </>
                )}
              </div>
              
              <div style={styles.statCard}>
                <div style={styles.statIcon}><FaUserMd /></div>
                {loadingStats ? (
                  <div style={styles.loadingAnimation}></div>
                ) : (
                  <>
                    <div style={styles.statNumber}>
                      <CountUpAnimation target={stats.doctors} />
                    </div>
                    <p style={styles.statLabel}>Total Doctors</p>
                  </>
                )}
              </div>
              
              <div style={styles.statCard}>
                <div style={styles.statIcon}><FaBlog /></div>
                {loadingStats ? (
                  <div style={styles.loadingAnimation}></div>
                ) : (
                  <>
                    <div style={styles.statNumber}>
                      <CountUpAnimation target={stats.blogs} />
                    </div>
                    <p style={styles.statLabel}>Total Blogs</p>
                  </>
                )}
              </div>
              
              <div style={styles.statCard}>
                <div style={{...styles.statIcon, ...styles.reportIcon}}><FaExclamationTriangle /></div>
                {loadingStats ? (
                  <div style={styles.loadingAnimation}></div>
                ) : (
                  <>
                    <div style={styles.statNumber}>
                      <CountUpAnimation target={stats.reports} />
                    </div>
                    <p style={styles.statLabel}>Total Reports</p>
                  </>
                )}
              </div>
            </div>

            <div style={styles.tableContainer}>
              <h3 style={{...styles.title, marginBottom: '1rem'}}>Recent Reports</h3>
              <table style={styles.userTable}>
                <thead>
                  <tr>
                    <th style={styles.tableHeader}>Name</th>
                    <th style={styles.tableHeader}>Email</th>
                    <th style={styles.tableHeader}>Subject</th>
                    <th style={styles.tableHeader}>Body</th>
                    <th style={styles.tableHeader}>Date</th>
                    <th style={styles.tableHeader}>User Type</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(report => (
                    <tr key={report.id}>
                      <td style={styles.tableCell}>{report.name}</td>
                      <td style={styles.tableCell}>{report.email}</td>
                      <td style={{...styles.tableCell, cursor: 'pointer'}} onClick={() => handleClick(report.subject)}>{report.subject}</td>
                      <td 
                        style={{
                          ...styles.tableCell,
                          maxWidth: '300px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleClick(report.body)}
                      >
                        {report.body}
                      </td>
                      <td style={styles.tableCell}>
                        {report.createdAt.toDate().toLocaleString()}
                      </td>
                      <td style={styles.tableCell}>
                        {report.role === 'non-user' ? 'Non-user' : 'user'}
                        {report.role === 'user' && (
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            ID: {report.userId}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : activeTab === 'doctor-requests' ? (
          <div style={styles.requestsGrid}>
            {filteredRequests.map(request => (
              <div key={request.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>{request.fullName}</h3>
                  <span style={{
                    ...styles.statusBadge,
                    ...(request.status === 'pending' && styles.statusPending),
                    ...(request.status === 'approved' && styles.statusApproved),
                    ...(request.status === 'rejected' && styles.statusRejected)
                  }}>
                    {request.status}
                  </span>
                </div>
                
                <div>
                  <p style={styles.meta}><strong>Email:</strong> {request.email}</p>
                  <p style={styles.meta}><strong>Country:</strong> {request.country}</p>
                  <p style={styles.meta}><strong>Applied:</strong> {new Date(request.appliedAt).toLocaleDateString()}</p>
                </div>

                <div style={styles.actions}>
                  <a 
                    href={request.Cv} 
                    target="_blank" 
                    rel="noreferrer"
                    style={styles.linkButton}
                  >
                    <FaFileDownload /> View CV
                  </a>
                  <div style={styles.actionButtons}>
                    <button 
                      onClick={() => handleApproval(request.id, 'approved')}
                      style={styles.approveButton}
                    >
                      <FaCheck /> Approve
                    </button>
                    <button 
                      onClick={() => handleApproval(request.id, 'rejected')}
                      style={styles.rejectButton}
                    >
                      <FaTimes /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'user-management' ? (
          <div style={styles.tableContainer}>
            <table style={styles.userTable}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Email</th>
                  <th style={styles.tableHeader}>Name</th>
                  {!isMobile && (
                    <>
                      <th style={styles.tableHeader}>Phone</th>
                      <th style={styles.tableHeader}>Country</th>
                    </>
                  )}
                  <th style={styles.tableHeader}>Role</th>
                  <th style={styles.tableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td style={styles.tableCell}>{user.email}</td>
                    <td style={styles.tableCell}>{user.fullName}</td>
                    {!isMobile && (
                      <>
                        <td style={styles.tableCell}>{user.phone || '-'}</td>
                        <td style={styles.tableCell}>{user.country || '-'}</td>
                      </>
                    )}
                    <td style={styles.tableCell}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        background: user.role === 'doctor' ? '#e3f2fd' : '#e8f5e9',
                        color: user.role === 'doctor' ? '#1976d2' : '#2e7d32',
                        fontSize: '0.8rem'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {user.role === 'doctor' && (
                          <button 
                            onClick={() => setSelectedDoctor(user)}
                            style={{
                              ...styles.blockButton,
                              ...styles.viewButton
                            }}
                          >
                            Details
                          </button>
                        )}
                        <button 
                          onClick={() => handleBlockToggle(user)} 
                          style={{
                            ...styles.blockButton,
                            ...(user.blocked && styles.unblockButton)
                          }}
                        >
                          {user.blocked ? <FaUnlockAlt /> : <FaUserLock />} 
                          {user.blocked ? "Unblock" : "Block"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'blog-management' ? (
          <div style={styles.blogGrid}>
            {filteredBlogs.map(blog => (
              <div key={blog.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>{blog.title}</h3>
                  {blog.blocked && (
                    <span style={{
                      ...styles.statusBadge,
                      ...styles.statusBlocked
                    }}>
                      Blocked
                    </span>
                  )}
                </div>
                
                {blog.image && (
                  <img 
                    src={blog.image} 
                    alt={blog.title} 
                    style={styles.blogImage}
                  />
                )}
                
                <div style={styles.meta}>
                  <span style={styles.genreBadge}>{blog.genre}</span>
                  <span style={styles.feedbackCount} className={styles.usefulCount}>
                    <FaCheck /> {blog.useful?.length || 0}
                  </span>
                  <span style={styles.feedbackCount} className={styles.notUsefulCount}>
                    <FaTimes /> {blog.notUseful?.length || 0}
                  </span>
                </div>
                
                <div style={styles.blogContentPreview}>
                  {blog.content}
                </div>
                
                <div style={styles.meta}>
                  <p><strong>Author:</strong> {blog.authorName}</p>
                  <p><strong>Posted:</strong> {new Date(blog.createdAt).toLocaleDateString()}</p>
                </div>

                <div style={styles.actions}>
                  <button 
                    onClick={() => setSelectedBlog(blog)}
                    style={styles.linkButton}
                  >
                    View Details
                  </button>
                  <div style={styles.actionButtons}>
                    <button 
                      onClick={() => handleBlogBlockToggle(blog)}
                      style={{
                        ...styles.blockButton,
                        ...(blog.blocked && styles.unblockButton)
                      }}
                    >
                      {blog.blocked ? <FaUnlockAlt /> : <FaUserLock />} 
                      {blog.blocked ? "Unblock" : "Block"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'doctor-management' ? (
          <div style={styles.doctorGrid}>
            {filteredDoctors.map(doctor => (
              <div key={doctor.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>{doctor.name}</h3>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    background: '#e3f2fd',
                    color: '#1976d2',
                    fontSize: '0.8rem'
                  }}>
                    {doctor.speciality}
                  </span>
                </div>
                
                <div>
                  <p style={styles.meta}><FaHospital /> <strong>Hospital:</strong> {doctor.hospital}</p>
                  <p style={styles.meta}><FaMoneyBillWave /> <strong>Fee:</strong> ${doctor.consultationFee}</p>
                  <p style={styles.meta}><FaStar /> <strong>Rating:</strong> {doctor.rating || 'Not rated'}</p>
                  <p style={styles.meta}><FaGraduationCap /> <strong>Education:</strong> {doctor.education}</p>
                  <p style={styles.meta}><FaCalendarAlt /> <strong>Experience:</strong> {doctor.experience}</p>
                  
                <div style={styles.meta}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexDirection: 'row', flexWrap: 'nowrap' }}>
                    <FaLanguage />
                    <strong>Languages:</strong>
                    <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'row', flexWrap: 'nowrap' }}>
                      {doctor.languages?.map((lang, index) => (
                        <span key={index} style={styles.genreBadge}>{lang}</span>
                      ))}
                    </div>
                  </div>
                </div>
                  
                  <div style={styles.meta}>
                    <div><FaClock /> <strong>Working Hours:</strong></div>
                    <div style={styles.workingHoursContainer}>
                      {days.map(day => (
                        doctor.workingHours?.[day] && (
                          <div key={day} style={styles.workingHourItem}>
                            <strong>{day}:</strong> {doctor.workingHours[day].start}:00 - {doctor.workingHours[day].end}:00
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                </div>

                <div style={styles.actions}>
                  <button 
                    onClick={() => setSelectedDoctor(doctor)}
                    style={styles.linkButton}
                  >
                    View Details
                  </button>
                  <div style={styles.actionButtons}>
                    <button 
                      onClick={() => setEditingDoctor(doctor)}
                      style={{
                        ...styles.blockButton,
                        ...styles.editButton
                      }}
                    >
                      <FaEdit /> Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.medicalGrid}>
            {filteredMedicals.map(medical => (
              <div key={medical.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>{medical.name}</h3>
                  <span style={{
                    ...styles.typeBadge,
                    ...(medical.type === 'hospital' && { background: '#e3f2fd', color: '#1976d2' }),
                    ...(medical.type === 'clinic' && { background: '#e8f5e9', color: '#2e7d32' }),
                    ...(medical.type === 'diagnostic' && { background: '#fff3e0', color: '#e65100' })
                  }}>
                    {medical.type}
                  </span>
                </div>
                
                {medical.image && (
                  <img 
                    src={medical.image} 
                    alt={medical.name} 
                    style={styles.medicalImage}
                  />
                )}
                
                <div>
                  <p style={styles.meta}><FaHospital /> <strong>Location:</strong> {medical.location}</p>
                  <p style={styles.meta}><FaMoneyBillWave /> <strong>Emergency:</strong> {medical.emergencyNumber}</p>
                  <p style={styles.meta}><FaStar /> <strong>General:</strong> {medical.generalNumber}</p>
                  <p style={styles.meta}><FaMoneyBillWave /> <strong>Ambulance:</strong> {medical.ambulanceNumber}</p>
                  <p style={styles.meta}><FaLink /> <strong>Website:</strong> 
                    {medical.website ? (
                      <a href={medical.website} target="_blank" rel="noopener noreferrer" style={{ color: '#3a7bd5', marginLeft: '0.5rem' }}>
                        Visit
                      </a>
                    ) : 'N/A'}
                  </p>
                  
                  <div style={styles.meta}>
                    <strong>Facilities:</strong>
                    <div style={{ marginTop: '0.5rem' }}>
                      {medical.facilities?.map((facility, index) => (
                        <span key={index} style={styles.facilityBadge}>{facility}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div style={styles.meta}>
                    <strong>Services:</strong>
                    <div style={{ marginTop: '0.5rem' }}>
                      {medical.services?.map((service, index) => (
                        <div key={index} style={{ marginBottom: '0.5rem' }}>
                          <strong>{service.name}</strong>: {service.available}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div style={styles.meta}>
                    <strong>Associated Doctors:</strong>
                    <div style={{ marginTop: '0.5rem' }}>
                      {medical.doctors?.length > 0 ? (
                        medical.doctors.map((doctor, index) => (
                          <div key={index} style={{ marginBottom: '0.5rem' }}>
                            {doctor.name} ({doctor.speciality})
                          </div>
                        ))
                      ) : (
                        <div>No doctors associated</div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={styles.actions}>
                  <button 
                    onClick={() => setSelectedMedical(medical)}
                    style={styles.linkButton}
                  >
                    View Details
                  </button>
                  <div style={styles.actionButtons}>
                    <button 
  onClick={() => {
    if (window.confirm(`Are you sure you want to delete ${medical.name}? This action cannot be undone.`)) {
      handleDeleteMedical(medical.id);
    }
  }}
  style={{
    ...styles.blockButton,
    background: '#f44336',
    marginLeft: '0.5rem',
    ':hover': {
      background: '#d32f2f'
    }
  }}
>
  <FaTrash /> Delete
</button>
                    <button 
                      onClick={() => setEditingMedical(medical)}
                      style={{
                        ...styles.blockButton,
                        ...styles.editButton
                      }}
                    >
                      <FaEdit /> Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Doctor Details Popup */}
        {selectedDoctor && (
          <div style={styles.popupOverlay}>
            <div style={styles.popupContent}>
              <h3 style={styles.popupTitle}>{selectedDoctor.name || selectedDoctor.fullName}'s Details</h3>
              
              <div style={styles.statItem}>
                <div style={styles.statLabelPopup}>Email</div>
                <div style={styles.statValuePopup}>{selectedDoctor.email}</div>
              </div>
              
              {selectedDoctor.Cv && (
                <div style={styles.statItem}>
                  <div style={styles.statLabelPopup}>CV</div>
                  <div style={styles.statValuePopup}>
                    <a href={selectedDoctor.Cv} target="_blank" rel="noopener noreferrer" style={styles.linkButton}>
                      <FaFileDownload /> Download CV
                    </a>
                  </div>
                </div>
              )}
              
              {selectedDoctor.linkedIn && (
                <div style={styles.statItem}>
                  <div style={styles.statLabelPopup}>LinkedIn</div>
                  <div style={styles.statValuePopup}>
                    <a href={selectedDoctor.linkedIn} target="_blank" rel="noopener noreferrer" style={styles.linkButton}>
                      View Profile
                    </a>
                  </div>
                </div>
              )}
              
              {selectedDoctor.medicalRegNumber && (
                <div style={styles.statItem}>
                  <div style={styles.statLabelPopup}>Medical Registration</div>
                  <div style={styles.statValuePopup}>{selectedDoctor.medicalRegNumber}</div>
                </div>
              )}
              
              {selectedDoctor.country && (
                <div style={styles.statItem}>
                  <div style={styles.statLabelPopup}>Country</div>
                  <div style={styles.statValuePopup}>{selectedDoctor.country}</div>
                </div>
              )}
              
              {selectedDoctor.speciality && (
                <div style={styles.statItem}>
                  <div style={styles.statLabelPopup}>Speciality</div>
                  <div style={styles.statValuePopup}>{selectedDoctor.speciality}</div>
                </div>
              )}
              
              {selectedDoctor.hospital && (
                <div style={styles.statItem}>
                  <div style={styles.statLabelPopup}>Hospital</div>
                  <div style={styles.statValuePopup}>{selectedDoctor.hospital}</div>
                </div>
              )}
              
              {selectedDoctor.consultationFee && (
                <div style={styles.statItem}>
                  <div style={styles.statLabelPopup}>Consultation Fee</div>
                  <div style={styles.statValuePopup}>${selectedDoctor.consultationFee}</div>
                </div>
              )}
              
              {selectedDoctor.education && (
                <div style={styles.statItem}>
                  <div style={styles.statLabelPopup}>Education</div>
                  <div style={styles.statValuePopup}>{selectedDoctor.education}</div>
                </div>
              )}
              
              {selectedDoctor.experience && (
                <div style={styles.statItem}>
                  <div style={styles.statLabelPopup}>Experience</div>
                  <div style={styles.statValuePopup}>{selectedDoctor.experience}</div>
                </div>
              )}
              
              {selectedDoctor.language?.length > 0 && (
                <div style={styles.statItem}>
                  <div style={styles.statLabelPopup}>Languages</div>
                  <div style={styles.statValuePopup}>
                    {selectedDoctor.language.join(', ')}
                  </div>
                </div>
              )}
              
              {selectedDoctor.workingHours && (
                <div style={styles.statItem}>
                  <div style={styles.statLabelPopup}>Working Hours</div>
                  <div style={styles.workingHoursContainer}>
                    {days.map(day => (
                      selectedDoctor.workingHours[day] && (
                        <div key={day} style={styles.workingHourItem}>
                          <strong>{day}:</strong> {selectedDoctor.workingHours[day].start}:00 - {selectedDoctor.workingHours[day].end}:00
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
              
              <button 
                onClick={() => setSelectedDoctor(null)}
                style={styles.popupButton}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Doctor Edit Popup */}
        {editingDoctor && (
          <div style={styles.popupOverlay}>
            <div style={styles.popupContent}>
              <h3 style={styles.popupTitle}>Edit Doctor: {editingDoctor.name}</h3>
              
              <form style={styles.editForm} onSubmit={handleDoctorUpdate}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Hospital</label>
                  <input
                    type="text"
                    name="hospital"
                    value={editingDoctor.hospital || ''}
                    onChange={handleDoctorEditChange}
                    style={styles.formInput}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Consultation Fee ($)</label>
                  <input
                    type="text"
                    name="consultationFee"
                    value={editingDoctor.consultationFee || ''}
                    onChange={handleDoctorEditChange}
                    style={styles.formInput}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Rating</label>
                  <input
                    type="number"
                    name="rating"
                    min="1"
                    max="5"
                    value={editingDoctor.rating || ''}
                    onChange={handleDoctorEditChange}
                    style={styles.formInput}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Working Hours</label>
                  <div style={styles.workingHoursContainer}>
                    {days.map(day => (
                      <div key={day} style={styles.workingHourItem}>
                        <strong>{day}:</strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <input
                            type="number"
                            min="0"
                            max="24"
                            value={editingDoctor.workingHours?.[day]?.start || ''}
                            onChange={(e) => handleWorkingHourChange(day, 'start', e.target.value)}
                            style={styles.workingHourInput}
                            placeholder="Start"
                          />
                          <span>-</span>
                          <input
                            type="number"
                            min="0"
                            max="24"
                            value={editingDoctor.workingHours?.[day]?.end || ''}
                            onChange={(e) => handleWorkingHourChange(day, 'end', e.target.value)}
                            style={styles.workingHourInput}
                            placeholder="End"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button 
                    type="submit"
                    style={styles.popupButton}
                  >
                    Save Changes
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditingDoctor(null)}
                    style={{
                      ...styles.popupButton,
                      background: '#f44336',
                      ':hover': {
                        background: '#d32f2f'
                      }
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Medical Details Popup */}
        {selectedMedical && (
          <div style={styles.popupOverlay}>
            <div style={styles.popupContent}>
              <h3 style={styles.popupTitle}>{selectedMedical.name}</h3>
              
              {selectedMedical.image && (
                <img 
                  src={selectedMedical.image} 
                  alt={selectedMedical.name} 
                  style={{ 
                    width: '100%', 
                    height: 'auto', 
                    maxHeight: '300px', 
                    objectFit: 'cover', 
                    borderRadius: '8px', 
                    marginBottom: '1rem' 
                  }}
                />
              )}
              
              <div style={styles.statItem}>
                <div style={styles.statLabelPopup}>Type</div>
                <div style={styles.statValuePopup}>
                  <span style={{
                    ...styles.typeBadge,
                    ...(selectedMedical.type === 'hospital' && { background: '#e3f2fd', color: '#1976d2' }),
                    ...(selectedMedical.type === 'clinic' && { background: '#e8f5e9', color: '#2e7d32' }),
                    ...(selectedMedical.type === 'diagnostic' && { background: '#fff3e0', color: '#e65100' })
                  }}>
                    {selectedMedical.type}
                  </span>
                </div>
              </div>
              
              <div style={styles.statItem}>
                <div style={styles.statLabelPopup}>Address</div>
                <div style={styles.statValuePopup}>{selectedMedical.address}</div>
              </div>
              
              <div style={styles.statItem}>
                <div style={styles.statLabelPopup}>Location</div>
                <div style={styles.statValuePopup}>{selectedMedical.location}</div>
              </div>
              
              <div style={styles.statItem}>
                <div style={styles.statLabelPopup}>Emergency Number</div>
                <div style={styles.statValuePopup}>{selectedMedical.emergencyNumber}</div>
              </div>
              
              <div style={styles.statItem}>
                <div style={styles.statLabelPopup}>General Number</div>
                <div style={styles.statValuePopup}>{selectedMedical.generalNumber}</div>
              </div>
              
              <div style={styles.statItem}>
                <div style={styles.statLabelPopup}>Ambulance Number</div>
                <div style={styles.statValuePopup}>{selectedMedical.ambulanceNumber}</div>
              </div>
              
              <div style={styles.statItem}>
                <div style={styles.statLabelPopup}>Email</div>
                <div style={styles.statValuePopup}>{selectedMedical.email}</div>
              </div>
              
              <div style={styles.statItem}>
                <div style={styles.statLabelPopup}>Website</div>
                <div style={styles.statValuePopup}>
                  {selectedMedical.website ? (
                    <a href={selectedMedical.website} target="_blank" rel="noopener noreferrer" style={styles.linkButton}>
                      Visit Website
                    </a>
                  ) : 'N/A'}
                </div>
              </div>
              
              <div style={styles.statItem}>
                <div style={styles.statLabelPopup}>Rating</div>
                <div style={styles.statValuePopup}>{selectedMedical.rating || 'Not rated'}</div>
              </div>
              
              <div style={styles.statItem}>
                <div style={styles.statLabelPopup}>Description</div>
                <div style={styles.statValuePopup}>{selectedMedical.description}</div>
              </div>
              
              <div style={styles.statItem}>
                <div style={styles.statLabelPopup}>Facilities</div>
                <div style={styles.statValuePopup}>
                  {selectedMedical.facilities?.map((facility, index) => (
                    <span key={index} style={styles.facilityBadge}>{facility}</span>
                  ))}
                </div>
              </div>
              
              <div style={styles.statItem}>
                <div style={styles.statLabelPopup}>Services</div>
                <div style={styles.statValuePopup}>
                  {selectedMedical.services?.map((service, index) => (
                    <div key={index} style={{ marginBottom: '0.5rem' }}>
                      <strong>{service.name}</strong>: {service.available}
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={styles.statItem}>
                <div style={styles.statLabelPopup}>Associated Doctors</div>
                <div style={styles.statValuePopup}>
                  {selectedMedical.doctors?.length > 0 ? (
                    selectedMedical.doctors.map((doctor, index) => (
                      <div key={index} style={{ marginBottom: '0.5rem' }}>
                        {doctor.name} ({doctor.speciality})
                      </div>
                    ))
                  ) : (
                    <div>No doctors associated</div>
                  )}
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedMedical(null)}
                style={styles.popupButton}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Medical Edit Popup */}
{editingMedical && (
   <div style={styles.popupOverlay}>
    <div style={styles.popupContent}>
      <h3 style={styles.popupTitle}>Edit Medical: {editingMedical.name}</h3>
      
      {/* Basic Information Section */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ margin: 0 }}>Basic Information</h4>
          <button 
            style={{ 
              ...styles.popupButton, 
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              background: '#3a7bd5'
            }}
            onClick={async () => {
              try {
                await updateDoc(doc(db, "medicals", editingMedical.id), {
                  name: editingMedical.name,
                  type: editingMedical.type,
                  description: editingMedical.description
                });
                alert('Basic information saved successfully!');
                fetchMedicals();
              } catch (error) {
                console.error("Error saving basic info:", error);
                alert('Error saving basic information');
              }
            }}
          >
            Save
          </button>
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Name</label>
          <input
            type="text"
            name="name"
            value={editingMedical.name || ''}
            onChange={handleMedicalEditChange}
            style={styles.formInput}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Type</label>
          <select
            name="type"
            value={editingMedical.type || ''}
            onChange={handleMedicalEditChange}
            style={styles.formInput}
          >
            <option value="hospital">Hospital</option>
            <option value="clinic">Clinic</option>
            <option value="diagnostic">Diagnostic Center</option>
          </select>
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Description</label>
          <textarea
            name="description"
            value={editingMedical.description || ''}
            onChange={handleMedicalEditChange}
            style={styles.formTextarea}
          />
        </div>
      </div>

      {/* Contact Information Section */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ margin: 0 }}>Contact Information</h4>
          <button 
            style={{ 
              ...styles.popupButton, 
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              background: '#3a7bd5'
            }}
            onClick={async () => {
              try {
                await updateDoc(doc(db, "medicals", editingMedical.id), {
                  address: editingMedical.address,
                  location: editingMedical.location,
                  emergencyNumber: editingMedical.emergencyNumber,
                  generalNumber: editingMedical.generalNumber,
                  ambulanceNumber: editingMedical.ambulanceNumber,
                  email: editingMedical.email,
                  website: editingMedical.website,
                  rating: editingMedical.rating
                });
                alert('Contact information saved successfully!');
                fetchMedicals();
              } catch (error) {
                console.error("Error saving contact info:", error);
                alert('Error saving contact information');
              }
            }}
          >
            Save
          </button>
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Address</label>
          <input
            type="text"
            name="address"
            value={editingMedical.address || ''}
            onChange={handleMedicalEditChange}
            style={styles.formInput}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Location</label>
          <input
            type="text"
            name="location"
            value={editingMedical.location || ''}
            onChange={handleMedicalEditChange}
            style={styles.formInput}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Emergency Number</label>
          <input
            type="text"
            name="emergencyNumber"
            value={editingMedical.emergencyNumber || ''}
            onChange={handleMedicalEditChange}
            style={styles.formInput}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>General Number</label>
          <input
            type="text"
            name="generalNumber"
            value={editingMedical.generalNumber || ''}
            onChange={handleMedicalEditChange}
            style={styles.formInput}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Ambulance Number</label>
          <input
            type="text"
            name="ambulanceNumber"
            value={editingMedical.ambulanceNumber || ''}
            onChange={handleMedicalEditChange}
            style={styles.formInput}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Email</label>
          <input
            type="email"
            name="email"
            value={editingMedical.email || ''}
            onChange={handleMedicalEditChange}
            style={styles.formInput}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Website</label>
          <input
            type="url"
            name="website"
            value={editingMedical.website || ''}
            onChange={handleMedicalEditChange}
            style={styles.formInput}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Rating</label>
          <input
            type="number"
            name="rating"
            min="1"
            max="5"
            value={editingMedical.rating || ''}
            onChange={handleMedicalEditChange}
            style={styles.formInput}
          />
        </div>
      </div>

      {/* Facilities Section */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ margin: 0 }}>Facilities</h4>
          <button 
            style={{ 
              ...styles.popupButton, 
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              background: '#3a7bd5'
            }}
            onClick={async () => {
              try {
                await updateDoc(doc(db, "medicals", editingMedical.id), {
                  facilities: editingMedical.facilities
                });
                alert('Facilities saved successfully!');
                fetchMedicals();
              } catch (error) {
                console.error("Error saving facilities:", error);
                alert('Error saving facilities');
              }
            }}
          >
            Save
          </button>
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Facilities (comma separated)</label>
          <input
            type="text"
            name="facilities"
            value={editingMedical.facilities?.join(', ') || ''}
            onChange={(e) => {
              const facilities = e.target.value.split(',').map(item => item.trim());
              setEditingMedical(prev => ({
                ...prev,
                facilities: facilities.filter(item => item !== '')
              }));
            }}
            style={styles.formInput}
          />
        </div>
      </div>

      {/* Services Section */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
        <h4 style={{ marginBottom: '1rem' }}>Services</h4>
        
        <div style={{ marginBottom: '1rem' }}>
          {editingMedical.services?.map((service, index) => (
            <div key={index} style={styles.serviceItem}>
              <div>
                <strong>{service.name}</strong>: {service.available}
              </div>
              <div style={styles.serviceActions}>
                <button 
                  type="button"
                  onClick={async () => {
                    try {
                      // Create a new array without the removed service
                      const updatedServices = [...editingMedical.services];
                      updatedServices.splice(index, 1);
                      
                      // Update Firestore
                      await updateDoc(doc(db, "medicals", editingMedical.id), {
                        services: updatedServices
                      });
                      
                      // Update local state
                      setEditingMedical(prev => ({
                        ...prev,
                        services: updatedServices
                      }));
                    } catch (error) {
                      console.error("Error removing service:", error);
                      alert('Error removing service');
                    }
                  }}
                  style={{
                    ...styles.serviceButton,
                    ...styles.removeServiceButton
                  }}
                >
                  <FaMinus />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ display: 'flex', marginBottom: '1rem' }}>
          <input
            type="text"
            name="name"
            placeholder="Service name"
            value={newService.name}
            onChange={handleServiceChange}
            style={styles.serviceInput}
          />
          <input
            type="text"
            name="available"
            placeholder="Availability"
            value={newService.available}
            onChange={handleServiceChange}
            style={styles.serviceInput}
          />
          <button
            type="button"
            onClick={async () => {
              if (newService.name && newService.available) {
                try {
                  // Create new service object
                  const serviceToAdd = {
                    name: newService.name,
                    available: newService.available
                  };
                  
                  // Update Firestore
                  await updateDoc(doc(db, "medicals", editingMedical.id), {
                    services: arrayUnion(serviceToAdd)
                  });
                  
                  // Update local state
                  setEditingMedical(prev => ({
                    ...prev,
                    services: [...(prev.services || []), serviceToAdd]
                  }));
                  
                  // Clear the form
                  setNewService({ name: '', available: '' });
                } catch (error) {
                  console.error("Error adding service:", error);
                  alert('Error adding service');
                }
              }
            }}
            style={{
              ...styles.serviceButton,
              ...styles.addServiceButton
            }}
          >
            <FaPlus /> Add
          </button>
        </div>
      </div>

      {/* Associated Doctors Section */}
      <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ marginBottom: '1rem' }}>Associated Doctors</h4>
        
        <div style={{ marginBottom: '1rem' }}>
          {editingMedical.doctors?.map((doctor, index) => (
            <div key={index} style={styles.doctorItem}>
              <div>{doctor.name} ({doctor.speciality})</div>
              <button 
                type="button"
                onClick={async () => {
                  try {
                    const doctorRef = doc(db, "doctors", doctor.id);
                    
                    // Update doctor's hospital field in Firestore
                    await updateDoc(doctorRef, {
                      hospital: ''
                    });
                    
                    // Update medical's doctor list in Firestore
                    await updateDoc(doc(db, "medicals", editingMedical.id), {
                      doctorIds: arrayRemove(doctorRef)
                    });
                    
                    // Update local state immediately
                    setEditingMedical(prev => ({
                      ...prev,
                      doctorIds: prev.doctorIds.filter(id => id.id !== doctor.id),
                      doctors: prev.doctors.filter(d => d.id !== doctor.id)
                    }));
                    
                  } catch (error) {
                    console.error("Error removing doctor:", error);
                    alert('Error removing doctor');
                  }
                }}
                style={{
                  ...styles.serviceButton,
                  ...styles.removeServiceButton
                }}
              >
                <FaMinus />
              </button>
            </div>
          ))}
        </div>
        
        <div style={{ display: 'flex' }}>
          <select
            value={selectedDoctorToAdd}
            onChange={(e) => setSelectedDoctorToAdd(e.target.value)}
            style={styles.doctorSelect}
          >
            <option value="">Select a doctor to add</option>
            {allDoctors
              .filter(doctor => !editingMedical.doctors?.some(d => d.id === doctor.id))
              .map(doctor => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.id} - {doctor.name} ({doctor.speciality})
                </option>
              ))
            }
          </select>
          
          <button
            type="button"
            onClick={async () => {
              if (selectedDoctorToAdd) {
                try {
                  const doctorRef = doc(db, "doctors", selectedDoctorToAdd);
                  const doctorDoc = await getDoc(doctorRef);
                  
                  if (doctorDoc.exists()) {
                    const doctorData = doctorDoc.data();
                    
                    // Update doctor's hospital field in Firestore
                    await updateDoc(doctorRef, {
                      hospital: editingMedical.name
                    });
                    
                    // Update medical's doctor list in Firestore
                    await updateDoc(doc(db, "medicals", editingMedical.id), {
                      doctorIds: arrayUnion(doctorRef)
                    });
                    
                    // Update local state immediately
                    setEditingMedical(prev => ({
                      ...prev,
                      doctorIds: [...(prev.doctorIds || []), doctorRef],
                      doctors: [...(prev.doctors || []), { 
                        id: doctorDoc.id, 
                        ...doctorData 
                      }]
                    }));
                    
                    setSelectedDoctorToAdd('');
                  }
                } catch (error) {
                  console.error("Error adding doctor:", error);
                  alert('Error adding doctor');
                }
              }
            }}
            style={styles.addDoctorButton}
          >
            <FaPlus /> Add Doctor
          </button>
        </div>
      </div>

      {/* Global Cancel Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
        <button 
          type="button"
          onClick={() => setEditingMedical(null)}
          style={{
            ...styles.popupButton,
            background: '#f44336',
            ':hover': {
              background: '#d32f2f'
            }
          }}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}


{/*Add Medical popup */}
{showAddMedicalModal && (
  <div style={styles.popupOverlay}>
    <div style={styles.popupContent}>
      <h3 style={styles.popupTitle}>Add New Medical Facility</h3>
      
      {/* Basic Information Section */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
        <h4 style={{ marginBottom: '1rem' }}>Basic Information</h4>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Name</label>
          <input
            type="text"
            name="name"
            value={newMedical.name}
            onChange={(e) => setNewMedical({...newMedical, name: e.target.value})}
            style={styles.formInput}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Type</label>
          <select
            name="type"
            value={newMedical.type}
            onChange={(e) => setNewMedical({...newMedical, type: e.target.value})}
            style={styles.formInput}
          >
            <option value="hospital">Hospital</option>
            <option value="clinic">Clinic</option>
            <option value="diagnostic">Diagnostic Center</option>
          </select>
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Description</label>
          <textarea
            name="description"
            value={newMedical.description}
            onChange={(e) => setNewMedical({...newMedical, description: e.target.value})}
            style={styles.formTextarea}
          />
        </div>
      </div>

      {/* Contact Information Section */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
        <h4 style={{ marginBottom: '1rem' }}>Contact Information</h4>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Address</label>
          <input
            type="text"
            name="address"
            value={newMedical.address}
            onChange={(e) => setNewMedical({...newMedical, address: e.target.value})}
            style={styles.formInput}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Location</label>
          <input
            type="text"
            name="location"
            value={newMedical.location}
            onChange={(e) => setNewMedical({...newMedical, location: e.target.value})}
            style={styles.formInput}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Emergency Number</label>
          <input
            type="text"
            name="emergencyNumber"
            value={newMedical.emergencyNumber}
            onChange={(e) => setNewMedical({...newMedical, emergencyNumber: e.target.value})}
            style={styles.formInput}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>General Number</label>
          <input
            type="text"
            name="generalNumber"
            value={newMedical.generalNumber}
            onChange={(e) => setNewMedical({...newMedical, generalNumber: e.target.value})}
            style={styles.formInput}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Ambulance Number</label>
          <input
            type="text"
            name="ambulanceNumber"
            value={newMedical.ambulanceNumber}
            onChange={(e) => setNewMedical({...newMedical, ambulanceNumber: e.target.value})}
            style={styles.formInput}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Email</label>
          <input
            type="email"
            name="email"
            value={newMedical.email}
            onChange={(e) => setNewMedical({...newMedical, email: e.target.value})}
            style={styles.formInput}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Website</label>
          <input
            type="url"
            name="website"
            value={newMedical.website}
            onChange={(e) => setNewMedical({...newMedical, website: e.target.value})}
            style={styles.formInput}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Rating</label>
          <input
            type="number"
            name="rating"
            min="1"
            max="5"
            value={newMedical.rating}
            onChange={(e) => setNewMedical({...newMedical, rating: e.target.value})}
            style={styles.formInput}
          />
        </div>
      </div>

      {/* Facilities Section */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
        <h4 style={{ marginBottom: '1rem' }}>Facilities</h4>
        
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>Facilities (comma separated)</label>
          <input
            type="text"
            name="facilities"
            value={newMedical.facilities.join(', ')}
            onChange={(e) => {
              const facilities = e.target.value.split(',').map(item => item.trim());
              setNewMedical({
                ...newMedical,
                facilities: facilities.filter(item => item !== '')
              });
            }}
            style={styles.formInput}
          />
        </div>
      </div>

      {/* Services Section */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
        <h4 style={{ marginBottom: '1rem' }}>Services</h4>
        
        <div style={{ marginBottom: '1rem' }}>
          {newMedical.services.map((service, index) => (
            <div key={index} style={styles.serviceItem}>
              <div>
                <strong>{service.name}</strong>: {service.available}
              </div>
              <div style={styles.serviceActions}>
                <button 
                  type="button"
                  onClick={() => {
                    const updatedServices = [...newMedical.services];
                    updatedServices.splice(index, 1);
                    setNewMedical({
                      ...newMedical,
                      services: updatedServices
                    });
                  }}
                  style={{
                    ...styles.serviceButton,
                    ...styles.removeServiceButton
                  }}
                >
                  <FaMinus />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ display: 'flex', marginBottom: '1rem' }}>
          <input
            type="text"
            name="name"
            placeholder="Service name"
            value={newService.name}
            onChange={handleServiceChange}
            style={styles.serviceInput}
          />
          <input
            type="text"
            name="available"
            placeholder="Availability"
            value={newService.available}
            onChange={handleServiceChange}
            style={styles.serviceInput}
          />
          <button
            type="button"
            onClick={() => {
              if (newService.name && newService.available) {
                setNewMedical({
                  ...newMedical,
                  services: [...newMedical.services, {
                    name: newService.name,
                    available: newService.available
                  }]
                });
                setNewService({ name: '', available: '' });
              }
            }}
            style={{
              ...styles.serviceButton,
              ...styles.addServiceButton
            }}
          >
            <FaPlus /> Add
          </button>
        </div>
      </div>

      {/* Associated Doctors Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h4 style={{ marginBottom: '1rem' }}>Associated Doctors</h4>
        
        <div style={{ marginBottom: '1rem' }}>
          {newMedical.doctors.map((doctor, index) => (
            <div key={index} style={styles.doctorItem}>
              <div>{doctor.name} ({doctor.speciality})</div>
              <button 
                type="button"
                onClick={() => {
                  const updatedDoctors = [...newMedical.doctors];
                  const updatedDoctorIds = [...newMedical.doctorIds];
                  updatedDoctors.splice(index, 1);
                  updatedDoctorIds.splice(index, 1);
                  setNewMedical({
                    ...newMedical,
                    doctors: updatedDoctors,
                    doctorIds: updatedDoctorIds
                  });
                }}
                style={{
                  ...styles.serviceButton,
                  ...styles.removeServiceButton
                }}
              >
                <FaMinus />
              </button>
            </div>
          ))}
        </div>
        
        <div style={{ display: 'flex' }}>
          <select
            value={selectedDoctorToAdd}
            onChange={(e) => setSelectedDoctorToAdd(e.target.value)}
            style={styles.doctorSelect}
          >
            <option value="">Select a doctor to add</option>
            {allDoctors
              .filter(doctor => !newMedical.doctors.some(d => d.id === doctor.id))
              .map(doctor => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.id} - {doctor.name} ({doctor.speciality})
                </option>
              ))
            }
          </select>
          
          <button
            type="button"
            onClick={async () => {
              if (selectedDoctorToAdd) {
                const doctorRef = doc(db, "doctors", selectedDoctorToAdd);
                const doctorDoc = await getDoc(doctorRef);
                
                if (doctorDoc.exists()) {
                  const doctorData = doctorDoc.data();
                  setNewMedical({
                    ...newMedical,
                    doctorIds: [...newMedical.doctorIds, doctorRef],
                    doctors: [...newMedical.doctors, {
                      id: doctorDoc.id,
                      ...doctorData
                    }]
                  });
                  setSelectedDoctorToAdd('');
                }
              }
            }}
            style={styles.addDoctorButton}
          >
            <FaPlus /> Add Doctor
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
        <button 
          type="button"
          onClick={() => {
            setShowAddMedicalModal(false);
            setNewMedical({
              name: '',
              type: 'hospital',
              description: '',
              address: '',
              location: '',
              emergencyNumber: '',
              generalNumber: '',
              ambulanceNumber: '',
              email: '',
              website: '',
              rating: 0,
              facilities: [],
              services: [],
              doctorIds: [],
            });
            setNewService({ name: '', available: '' });
          }}
          style={{
            ...styles.popupButton,
            background: '#f44336',
            ':hover': {
              background: '#d32f2f'
            }
          }}
        >
          Cancel
        </button>
        
        <button 
          type="button"
          onClick={async () => {
            try {
              // Create the medical document in Firestore
              const medicalRef = await addDoc(collection(db, "medicals"), {
                ...newMedical,
                createdAt: new Date().toISOString(),
                // Convert doctor references to Firestore references
                doctorIds: newMedical.doctorIds.map(id => doc(db, "doctors", id.id))
              });
              
              // Update each doctor's hospital field
              await Promise.all(
                newMedical.doctorIds.map(async (doctorRef) => {
                  await updateDoc(doctorRef, {
                    hospital: newMedical.name
                  });
                })
              );
              
              // Close modal and reset form
              setShowAddMedicalModal(false);
              setNewMedical({
                name: '',
                type: 'hospital',
                description: '',
                address: '',
                location: '',
                emergencyNumber: '',
                generalNumber: '',
                ambulanceNumber: '',
                email: '',
                website: '',
                rating: 0,
                facilities: [],
                services: [],
                doctorIds: [],
                doctors: []
              });
              setNewService({ name: '', available: '' });
              
              // Refresh medicals list
              fetchMedicals();
              alert('Medical facility added successfully!');
            } catch (error) {
              console.error("Error adding medical facility:", error);
              alert('Error adding medical facility');
            }
          }}
          style={styles.popupButton}
        >
          Add Medical Facility
        </button>
      </div>
    </div>
  </div>
)}



        {/* Blog Details Popup */}
        {selectedBlog && (
          <div style={styles.popupOverlay}>
            <div style={styles.popupContent}>
              <h3 style={styles.popupTitle}>{selectedBlog.title}</h3>
              
              {selectedBlog.image && (
                <img 
                  src={selectedBlog.image} 
                  alt={selectedBlog.title} 
                  style={{ 
                    width: '100%', 
                    height: 'auto', 
                    maxHeight: '300px', 
                    objectFit: 'cover', 
                    borderRadius: '8px', 
                    marginBottom: '1rem' 
                  }}
                />
              )}
              
              <div style={styles.statItem}>
                <div style={styles.statLabelPopup}>Genre</div>
                <div style={styles.statValuePopup}>
                  <span style={styles.genreBadge}>{selectedBlog.genre}</span>
                </div>
              </div>
              
              <div style={styles.statItem}>
                <div style={styles.statLabelPopup}>Feedback</div>
                <div style={styles.statValuePopup}>
                  <span style={styles.feedbackCount} className={styles.usefulCount}>
                    <FaCheck /> {selectedBlog.useful?.length || 0} Useful
                  </span>
                  <span style={styles.feedbackCount} className={styles.notUsefulCount}>
                    <FaTimes /> {selectedBlog.notUseful?.length || 0} Not Useful
                  </span>
                </div>
              </div>
              
              <div style={styles.statItem}>
                <div style={styles.statLabelPopup}>Author</div>
                <div style={styles.statValuePopup}>{selectedBlog.authorName}</div>
              </div>
              
              <div style={styles.statItem}>
                <div style={styles.statLabelPopup}>Published Date</div>
                <div style={styles.statValuePopup}>
                  {new Date(selectedBlog.createdAt).toLocaleDateString()}
                </div>
              </div>
              
              <div style={styles.statItem}>
                <div style={styles.statLabelPopup}>Content</div>
                <div style={styles.blogContentFull}>
                  {selectedBlog.content}
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedBlog(null)}
                style={styles.popupButton}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Modal for full text */}
        {showModal && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: window.innerWidth < 768 ? '50%' : '65%',
            transform: 'translate(-50%, -50%)',
            width: window.innerWidth < 768 ? '90%' : '50%',
            height: 'auto',
            backgroundColor: 'rgba(0, 0, 0, 0.07)',
            padding: '10px',
            borderRadius: '8px',
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.11)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
              <h3>Full Text</h3>
              <p>{selectedText}</p>
              <button onClick={() => setShowModal(false)}>Close</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}