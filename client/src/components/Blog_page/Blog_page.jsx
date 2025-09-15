import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLogout } from '../../contexts/logout';
import { 
  collection, addDoc, doc, deleteDoc, updateDoc, 
  arrayUnion, serverTimestamp, query, orderBy, onSnapshot,
  arrayRemove, where, limit, getDocs, writeBatch
} from 'firebase/firestore';
import { db } from '../../firebase';
import { formatDistanceToNow } from 'date-fns';
import { 
  FiMenu, FiX, FiUser, FiCalendar, FiMessageSquare, 
  FiBookOpen, FiLogOut, FiHome, FiHeart, FiPlus,
} from 'react-icons/fi';
import { FaUser, FaSignOutAlt, FaEllipsisV, FaChevronDown, FaChevronUp, FaEdit,
   FaUserMd, FaRobot, FaChevronRight
 } from 'react-icons/fa';
import { MdHealthAndSafety, MdThumbUp, MdThumbDown } from 'react-icons/md';



const Blog_page = () => {
  const handleLogout = useLogout();
  const navigate = useNavigate();
  const onLogoutClick = async () => {
    await handleLogout();
  };
  // Modern healthcare color palette
  const colors = {
    primary: '#1a73e8',
    secondary: '#34a853',
    accent: '#fbbc05',
    danger: '#d93025',
    text: '#202124',
    lightGray: '#f8f9fa',
    mediumGray: '#dadce0',
    darkGray: '#5f6368',
    white: '#ffffff',
    lightBlue: '#e8f0fe'
  };

  const { currentUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({
    title: '',
    genre: 'Health Tips',
    content: '',
    image: ''
  });
  const [commentInputs, setCommentInputs] = useState({});
  const [replyInputs, setReplyInputs] = useState({});
  const [filter, setFilter] = useState('All');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState({});
  const [editingPost, setEditingPost] = useState(null);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef(null);

  // Universal timestamp parser
  const parseAnyTimestamp = (timestamp) => {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (typeof timestamp === 'string') return new Date(timestamp);
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return new Date();
  };

  // Safe date formatter
  const formatDateSafe = (date) => {
    const dateObj = parseAnyTimestamp(date);
    if (isNaN(dateObj.getTime())) return 'just now';
    return formatDistanceToNow(dateObj, { addSuffix: true });
  };

  // Fetch posts in real-time
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoadingPosts(true);
        const q = query(collection(db, "posts"), where("blocked", "==", false), orderBy("createdAt", "desc"));
        
        const unsubscribe = onSnapshot(q, 
          (querySnapshot) => {
            const postsData = querySnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                createdAt: parseAnyTimestamp(data.createdAt),
                comments: (data.comments || []).map(comment => ({
                  ...comment,
                  createdAt: parseAnyTimestamp(comment.createdAt),
                  replies: (comment.replies || []).map(reply => ({
                    ...reply,
                    createdAt: parseAnyTimestamp(reply.createdAt)
                  }))
                }))
              };
            });
            setPosts(postsData);
            setLoadingPosts(false);
          },
          (error) => {
            console.error("Snapshot error:", error);
            setError("Failed to load posts. Please refresh.");
            setLoadingPosts(false);
          }
        );
        return unsubscribe;
      } catch (error) {
        console.error("Initialization error:", error);
        setError("Failed to initialize posts listener");
        setLoadingPosts(false);
      }
    };
    fetchPosts();
  }, []);

  // Fetch notifications in real-time
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

  // Close notifications when clicking outside
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

  // Responsive design handler
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toggle post content expansion
  const toggleExpandPost = (postId) => {
    setExpandedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };


  
// like unlike  
const handleFeedback = async (postId, feedbackType) => {
  const postRef = doc(db, "posts", postId);
  const post = posts.find(p => p.id === postId);
  
  try {
    const batch = writeBatch(db);
    
    if (post[feedbackType]?.includes(currentUser.uid)) {
      // User is removing their feedback
      batch.update(postRef, {
        [feedbackType]: arrayRemove(currentUser.uid)
      });
      
      // Delete the previous notification if exists
      const notificationQuery = query(
        collection(db, "notifications"),
        where("postId", "==", postId),
        where("senderId", "==", currentUser.uid),
        where("type", "==", "feedback")
      );
      
      const snapshot = await getDocs(notificationQuery);
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
    } else {
      const updates = {
        [feedbackType]: arrayUnion(currentUser.uid)
      };
      
      const oppositeType = feedbackType === 'useful' ? 'notUseful' : 'useful';
      if (post[oppositeType]?.includes(currentUser.uid)) {
        updates[oppositeType] = arrayRemove(currentUser.uid);
      }
      
      batch.update(postRef, updates);

      // Only create notification if recipientId exists and it's not the current user
      if (post.authorId && post.authorId !== currentUser.uid) {
        const notificationRef = doc(collection(db, "notifications"));
        batch.set(notificationRef, {
          type: "feedback",
          postId: postId,
          senderId: currentUser.uid,
          senderName: currentUser.fullName || "Anonymous",
          senderAvatar: currentUser.photoURL || null,
          recipientId: post.authorId, // Now guaranteed to exist
          message: `${currentUser.fullName || "Someone"} found your post ${feedbackType === 'useful' ? 'useful' : 'not useful'}`,
          createdAt: serverTimestamp(),
          read: false,
          feedbackType: feedbackType
        });
        
        // Delete any existing feedback notification for this post from this user
        const existingNotificationQuery = query(
          collection(db, "notifications"),
          where("postId", "==", postId),
          where("senderId", "==", currentUser.uid),
          where("type", "==", "feedback")
        );
        
        const existingSnapshot = await getDocs(existingNotificationQuery);
        existingSnapshot.forEach(doc => {
          if (doc.id !== notificationRef.id) {
            batch.delete(doc.ref);
          }
        });
      }
    }
    
    await batch.commit();
  } catch (error) {
    console.error("Error handling feedback:", error);
    setError("Failed to process your feedback. Please try again.");
  }
};

  // Create new health update
  const handleSubmitPost = async (e) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content) return;
    
    try {
      if (editingPost) {
        await updateDoc(doc(db, "posts", editingPost), {
          title: newPost.title,
          genre: newPost.genre,
          content: newPost.content,
          image: newPost.image,
          updatedAt: serverTimestamp()
        });
        setEditingPost(null);
      } else {
        await addDoc(collection(db, "posts"), {
          title: newPost.title,
          genre: newPost.genre,
          authorId: currentUser.uid,
          authorName: currentUser.fullName || currentUser.email,
          authorAvatar: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.fullName || currentUser.email.split('@')[0])}`,
          content: newPost.content,
          image: newPost.image,
          blocked: false,
          useful: [],
          notUseful: [],
          comments: [],
          createdAt: serverTimestamp(),
          updatedAt: null,
          location: "Medical Center"
        });
      }
      
      setNewPost({ title: '', genre: 'Health Tips', content: '', image: '' });
      setShowCreatePost(false);
    } catch (err) {
      setError("Failed to share health update");
    }
  };

  // Set up editing a post
  const setupEditPost = (post) => {
    setEditingPost(post.id);
    setNewPost({
      title: post.title,
      genre: post.genre,
      content: post.content,
      image: post.image || ''
    });
    setShowCreatePost(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    const notificationRef = doc(db, "notifications", notificationId);
    await updateDoc(notificationRef, { read: true });
  };

  // Add comment or reply
  const addComment = async (postId, content, isReply = false, commentId = null) => {
    if (!content.trim()) {
      setError("Comment cannot be empty");
      return;
    }
  
    try {
      const postRef = doc(db, "posts", postId);
      const post = posts.find(p => p.id === postId);
      const newComment = {
        id: Date.now().toString(),
        authorId: currentUser.uid,
        authorName: currentUser.fullName || currentUser.email.split('@')[0],
        authorAvatar: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.fullName || currentUser.email.split('@')[0])}`,
        content: content.trim(),
        createdAt: new Date().toISOString(),
        replies: []
      };

      if (isReply && commentId) {
        const parentComment = post.comments.find(c => c.id === commentId);
        
        // Create notification for parent comment author if it's not the current user
        if (parentComment.authorId !== currentUser.uid) {
          await addDoc(collection(db, "notifications"), {
            type: "reply",
            recipientId: parentComment.authorId,
            senderId: currentUser.uid,
            senderName: currentUser.fullName || currentUser.email.split('@')[0],
            senderAvatar: currentUser.photoURL,
            postId,
            commentId,
            message: `${currentUser.fullName || "Someone"} replied to your comment`,
            read: false,
            createdAt: serverTimestamp()
          });
        }
        
        const updatedComments = post.comments.map(c => 
          c.id === commentId 
            ? { ...c, replies: [...(c.replies || []), newComment] } 
            : c
        );
        
        await updateDoc(postRef, {
          comments: updatedComments,
          updatedAt: serverTimestamp()
        });
        setReplyInputs(prev => ({ ...prev, [`${postId}-${commentId}`]: '' }));
      } else {
        // Create notification for post author if it's not the current user
        if (post.authorId !== currentUser.uid) {
          await addDoc(collection(db, "notifications"), {
            type: "comment",
            recipientId: post.authorId,
            senderId: currentUser.uid,
            senderName: currentUser.fullName || currentUser.email.split('@')[0],
            senderAvatar: currentUser.photoURL,
            postId,
            message: `${currentUser.fullName || "Someone"} commented on your post`,
            read: false,
            createdAt: serverTimestamp()
          });
        }
        
        await updateDoc(postRef, {
          comments: arrayUnion(newComment),
          updatedAt: serverTimestamp()
        });
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      }
      
      setError(null);
    } catch (err) {
      console.error("Error adding comment:", err);
      setError("Failed to add comment. Please try again.");
    }
  };

  // Delete comment
  const deleteComment = async (postId, commentId) => {
    try {
      const postRef = doc(db, "posts", postId);
      const post = posts.find(p => p.id === postId);
      const comment = post.comments.find(c => c.id === commentId);
      
      // Create notification for comment author if it's not the current user
      if (comment.authorId !== currentUser.uid) {
        await addDoc(collection(db, "notifications"), {
          type: "comment_deleted",
          recipientId: comment.authorId,
          senderId: currentUser.uid,
          senderName: currentUser.fullName || currentUser.email.split('@')[0],
          senderAvatar: currentUser.photoURL,
          postId,
          commentId,
          message: `Your comment was deleted by ${currentUser.fullName || "an admin"}`,
          read: false,
          createdAt: serverTimestamp()
        });
      }
      
      await updateDoc(postRef, {
        comments: post.comments.filter(c => c.id !== commentId)
      });
    } catch (err) {
      console.error("Error deleting comment:", err);
      setError("Failed to delete comment");
    }
  };

  // Delete reply
  const deleteReply = async (postId, commentId, replyId) => {
    try {
      const postRef = doc(db, "posts", postId);
      const post = posts.find(p => p.id === postId);
      
      const updatedComments = post.comments.map(comment => {
        if (comment.id === commentId) {
          const reply = comment.replies.find(r => r.id === replyId);
          
          // Create notification for reply author if it's not the current user
          if (reply && reply.authorId !== currentUser.uid) {
            addDoc(collection(db, "notifications"), {
              type: "reply_deleted",
              recipientId: reply.authorId,
              senderId: currentUser.uid,
              senderName: currentUser.fullName || currentUser.email.split('@')[0],
              senderAvatar: currentUser.photoURL,
              postId,
              commentId,
              replyId,
              message: `Your reply was deleted by ${currentUser.fullName || "an admin"}`,
              read: false,
              createdAt: serverTimestamp()
            });
          }
          
          return {
            ...comment,
            replies: comment.replies.filter(reply => reply.id !== replyId)
          };
        }
        return comment;
      });
      
      await updateDoc(postRef, {
        comments: updatedComments
      });
    } catch (err) {
      console.error("Error deleting reply:", err);
      setError("Failed to delete reply");
    }
  };

  // Notification Bell Component
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
          transition: 'background 0.2s ease',
          ':hover': {
            backgroundColor: 'rgba(255,255,255,0.1)'
          }
        }}
        onClick={() => {
          setShowNotifications(!showNotifications);
          // Mark all as read when opening
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
            top: '-2px',
            right: '-2px',
            backgroundColor: colors.danger,
            color: colors.white,
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 'bold'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '100%',
          width: '350px',
          maxWidth: '90vw',
          maxHeight: '400px',
          overflowY: 'auto',
          backgroundColor: colors.white,
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          zIndex: 1100,
          padding: '10px 0'
        }}>
          <div style={{
            padding: '10px 15px',
            borderBottom: `1px solid ${colors.mediumGray}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: colors.text }}>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.primary,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  padding: '2px 5px'
                }}
                onClick={async () => {
                  await Promise.all(
                    notifications
                      .filter(n => !n.read)
                      .map(n => markAsRead(n.id))
            )}}
              >
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: colors.darkGray }}>
              No notifications yet
            </div>
          ) : (
            notifications.map(notification => (
              <div 
                key={notification.id}
                style={{
                  padding: '12px 15px',
                  borderBottom: `1px solid ${colors.lightGray}`,
                  backgroundColor: !notification.read ? colors.lightBlue : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                  ':hover': {
                    backgroundColor: colors.lightGray
                  }
                }}
                onClick={async () => {
                  await markAsRead(notification.id);
                  // Navigate to the relevant post/comment
                  // You'll need to implement this based on your routing
                  // history.push(`/post/${notification.postId}`);
                  setShowNotifications(false);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <img 
                    src={notification.senderAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(notification.senderName)}`}
                    alt={notification.senderName}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px'
                    }}>
                      <strong style={{ fontSize: '0.9rem', color: colors.text }}>
                        {notification.senderName}
                      </strong>
                      {!notification.read && (
                        <span style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: colors.primary
                        }}></span>
                      )}
                    </div>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '0.9rem',
                      color: colors.text
                    }}>
                      {notification.message}
                    </p>
                    <div style={{ 
                      fontSize: '0.75rem',
                      color: colors.darkGray,
                      marginTop: '4px'
                    }}>
                      {formatDateSafe(notification.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
  
  const logoStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '.25rem',
    fontSize: isMobile ? '1.25rem' : '1.5rem',
    fontWeight: '700',
    cursor: 'pointer',
    color: '#4f46e5',
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
  // Healthcare categories
  const healthCategories = [
    'Health Tips', 
    'Medical News', 
    'Patient Stories',
    'Doctor Advice',
    'Treatment Options',
    'Wellness'
  ];

  if (loadingPosts) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: `5px solid ${colors.mediumGray}`,
          borderTopColor: colors.primary,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        <MdHealthAndSafety size={48} style={{ color: colors.danger, marginBottom: '15px' }} />
        <h3 style={{ color: colors.danger, margin: '0 0 10px 0' }}>Error Loading Content</h3>
        <p style={{ color: colors.darkGray, marginBottom: '20px' }}>
          {filter === 'All' 
            ? 'Be the first to share a health update!' 
            : `No updates in ${filter} category yet.`}
        </p>
        <button 
          style={{
            backgroundColor: colors.primary,
            color: colors.white,
            border: 'none',
            padding: '10px 15px',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onClick={() => setShowCreatePost(true)}
        >
          Share Your Experience
        </button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.lightGray,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overflowX: 'hidden'
    }}>
      {/* Mobile Navigation */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.primary,
          color: colors.white,
          padding: '12px 15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1000,
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
        }}>
          <button 
            style={{
              background: 'none',
              border: 'none',
              color: colors.white,
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '5px'
            }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <FaEllipsisV />
          </button>
          <h1 style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '1.3rem',
            margin: 0,
            fontWeight: '600'
          }}>
            <MdHealthAndSafety /> SympticAi
          </h1>
          <NotificationBell />
          <div style={{
            position: 'fixed',
            top: '56px',
            left: 0,
            right: 0,
            backgroundColor: colors.white,
            padding: '15px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            transform: mobileMenuOpen ? 'translateY(0)' : 'translateY(-160%)',
            transition: 'transform 0.3s ease',
            zIndex: 999,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            borderBottom: `1px solid ${colors.mediumGray}`
          }}>
            <button 
              style={{
                backgroundColor: colors.primary, color: colors.white,
                border: 'none', padding: '10px 15px',
                borderRadius: '6px', fontWeight: '600',
                cursor: 'pointer', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
                gap: '8px', width: '100%'
              }}
              onClick={() => {
                setShowCreatePost(true);
                setMobileMenuOpen(false);
              }}
            >
              Share Update
            </button>

            <button 
              style={{
                backgroundColor: colors.primary, color: colors.white,
                border: 'none', padding: '10px 15px',
                borderRadius: '6px', fontWeight: '600',
                cursor: 'pointer', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
                gap: '8px', width: '100%'
              }}
              onClick={() => navigate('/AppointmentManagement')}
            >
              Appointments
            </button>
            <button 
              style={{
                backgroundColor: colors.primary, color: colors.white,
                border: 'none', padding: '10px 15px',
                borderRadius: '6px', fontWeight: '600',
                cursor: 'pointer', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
                gap: '8px', width: '100%'
              }}
              onClick={() => navigate('/Blog_page')}
            >
              Blogs
            </button>
            <button 
              style={{
                backgroundColor: colors.primary, color: colors.white,
                border: 'none', padding: '10px 15px',
                borderRadius: '6px', fontWeight: '600',
                cursor: 'pointer', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
                gap: '8px', width: '100%'
              }}
              onClick={() => navigate('/MedicalList')}
            >
              Medicals
            </button>

              <div style={{backgroundColor: colors.primary, color: colors.white,
                border: 'none', padding: '7px 1px',
                borderRadius: '6px', fontWeight: '600',
                cursor: 'pointer', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
                gap: '8px', width: '100%' }}>
                <img 
                  src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.fullName || currentUser.email.split('@')[0])}`} 
                  alt={currentUser.fullName} 
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: `.5px solid ${colors.white}`
                    
                  }}
                />
<span 
 // style={{ fontWeight: '500', cursor: 'pointer', color:'white' }} 
  onClick={() => navigate(`/profile/${currentUser.uid}`)}
>
  {currentUser.fullName || currentUser.email}
</span>
              </div> 


            <button 
              style={{
                background: 'transparent',
                border: `1px solid ${colors.primary}`,
                color: colors.primary,
                padding: '10px 15px',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%'
              }}
              onClick={() => onLogoutClick}
            >
              <FaSignOutAlt /> Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Desktop Navigation */}
      {!isMobile && (
        <div style={{
    display: 'flex',
    width: '100%', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '20px', 
    backgroundColor: 'white', 
    borderBottom: '1px solid #e2e8f0', 
    marginBottom: '24px', 
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
    boxSizing: 'border-box' 
        }}>

        <div style={logoStyle} onClick={() => navigate('/')}>
          <MdHealthAndSafety style={{ fontSize: '1.5em' }} />
          <span>SympticAI</span>
        </div>

<button
  style={{
    backgroundColor: '#2d8e47', // Modern green shade
    color: 'white',
    border: 'none',
    padding: '10px',
    borderRadius: '50%', // Makes it circular
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px', // Ensures a consistent round shape
    height: '48px',
    transition: 'background-color 0.3s ease, transform 0.2s ease',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    marginRight: '170px',
    marginLeft: '20px'
  }}
  onClick={() => {
    setShowCreatePost(!showCreatePost);
    setEditingPost(null);
    setNewPost({ title: '', genre: 'Health Tips', content: '', image: '' });
  }}
  onMouseOver={(e) => {
    e.target.style.backgroundColor = '#248f3c';
    e.target.style.transform = 'scale(1.1)';
  }}
  onMouseOut={(e) => {
    e.target.style.backgroundColor = '#2d8e47';
    e.target.style.transform = 'scale(1)';
  }}
>
  {showCreatePost ? <FiX /> : <FiPlus />}
</button>

            <button style={navButtonStyle} onClick={() => navigate('/Home_page')}>
            <FiHome  style={{ marginRight: '0.5rem' }} /> Home </button>

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

          {/* <button
            style={navButtonStyle}
            onClick={() => navigate(`/profile/${currentUser.uid}`)}
          >
            <FiUser style={{ marginRight: '0.5rem' }} />
            Profile
          </button> */}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img 
                  src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.fullName || currentUser.email.split('@')[0])}`} 
                  alt={currentUser.fullName} 
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: `2px solid ${colors.white}`
                    
                  }}
                />
<span 
  style={{ fontWeight: '500', cursor: 'pointer', color:'black', }} 
  onClick={() => navigate(`/profile/${currentUser.uid}`)}
>
  {currentUser.fullName || currentUser.email}
</span>
              </div>          

          <NotificationBell /> 
          
          <button
            style={{
              ...navButtonStyle,
              background:'#4f46e5',
              color: '#ffffff',
              fontWeight: '600',
              padding: '0.5rem 1.25rem',
            }}
            onClick={onLogoutClick}
          >
            <FiLogOut style={{ marginRight: '0.5rem' }} />
            Logout
          </button>



        </div>
      )}

      {/* Main Content */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        maxWidth: isMobile ? '100%' : '80%',
        width: '98vw',
        margin: '0 auto',
        paddingTop: isMobile ? '40px' : '10px',
        paddingBottom: '20px'
      }}>
        {/* Create Post Sidebar - Desktop */}
        {!isMobile && showCreatePost && (
          <div style={{
            width: '300px',
            padding: '20px',
            backgroundColor: colors.white,
            borderRadius: '8px',
            marginRight: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            alignSelf: 'flex-start',
            position: 'sticky',
            top: '100px'
          }}>
            <h2 style={{ 
              marginTop: 0, 
              color: colors.text,
              paddingBottom: '10px',
              borderBottom: `1px solid ${colors.mediumGray}`,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <MdHealthAndSafety />
              {editingPost ? 'Edit Health Update' : 'Share Health Experience'}
            </h2>
            <form onSubmit={handleSubmitPost}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: '500',
                  color: colors.darkGray,
                  fontSize: '0.9rem'
                }}>Title</label>
                <input
                  type="text"
                  placeholder="e.g., 'My Recovery Journey'"
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${colors.mediumGray}`,
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                    transition: 'border 0.2s ease',
                    ':focus': {
                      outline: 'none',
                      borderColor: colors.primary,
                      boxShadow: `0 0 0 2px ${colors.lightBlue}`
                    }
                  }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: '500',
                  color: colors.darkGray,
                  fontSize: '0.9rem'
                }}>Category</label>
                <select
                  value={newPost.genre}
                  onChange={(e) => setNewPost({...newPost, genre: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${colors.mediumGray}`,
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                    transition: 'border 0.2s ease',
                    ':focus': {
                      outline: 'none',
                      borderColor: colors.primary,
                      boxShadow: `0 0 0 2px ${colors.lightBlue}`
                    }
                  }}
                >
                  {healthCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: '500',
                  color: colors.darkGray,
                  fontSize: '0.9rem'
                }}>Content</label>
                <textarea
                  placeholder="Share your health story or advice..."
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${colors.mediumGray}`,
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                    minHeight: '150px',
                    resize: 'vertical',
                    transition: 'border 0.2s ease',
                    ':focus': {
                      outline: 'none',
                      borderColor: colors.primary,
                      boxShadow: `0 0 0 2px ${colors.lightBlue}`
                    }
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: '500',
                  color: colors.darkGray,
                  fontSize: '0.9rem'
                }}>Image URL (optional)</label>
                <input
                  type="text"
                  placeholder="https://example.com/image.jpg"
                  value={newPost.image}
                  onChange={(e) => setNewPost({...newPost, image: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${colors.mediumGray}`,
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                    transition: 'border 0.2s ease',
                    ':focus': {
                      outline: 'none',
                      borderColor: colors.primary,
                      boxShadow: `0 0 0 2px ${colors.lightBlue}`
                    }
                  }}
                />
              </div>
              <button 
                type="submit"
                style={{
                  backgroundColor: editingPost ? colors.accent : colors.secondary,
                  color: colors.white,
                  border: 'none',
                  padding: '12px 15px',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.2s ease',
                  ':hover': {
                    backgroundColor: editingPost ? '#e9b000' : '#2d8e47'
                  }
                }}
              >
                {editingPost ? 'Update Post' : 'Post Update'}
              </button>
              {editingPost && (
                <button 
                  type="button"
                  style={{
                    background: 'transparent',
                    border: `1px solid ${colors.danger}`,
                    color: colors.danger,
                    padding: '12px 15px',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    width: '100%',
                    marginTop: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    ':hover': {
                      backgroundColor: 'rgba(217,48,37,0.1)'
                    }
                  }}
                  onClick={() => {
                    setEditingPost(null);
                    setNewPost({ title: '', genre: 'Health Tips', content: '', image: '' });
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </form>
          </div>
        )}

        {/* Posts Feed */}
        <div style={{
          flex: 1,
          padding: isMobile ? '15px' : '0 20px 20px 0',
          minWidth: 0
        }}>
          {/* Category Filter */}
          <div style={{
            backgroundColor: colors.white,
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            position: 'sticky',
            top: isMobile ? '70px' : '80px',
            zIndex: 10
          }}>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: `1px solid ${colors.mediumGray}`,
                borderRadius: '8px',
                fontFamily: 'inherit',
                backgroundColor: colors.white,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                ':focus': {
                  outline: 'none',
                  borderColor: colors.primary,
                  boxShadow: `0 0 0 2px ${colors.lightBlue}`
                }
              }}
            >
              <option value="All">All Categories</option>
              {healthCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Posts List */}
          {posts.filter(post => filter === 'All' || post.genre === filter).length === 0 ? (
            <div style={{
              backgroundColor: colors.white,
              borderRadius: '8px',
              padding: '30px 20px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <MdHealthAndSafety size={48} style={{ color: colors.mediumGray, marginBottom: '15px' }} />
              <h3 style={{ color: colors.text, margin: '0 0 10px 0' }}>No Health Updates Found</h3>
              <p style={{ color: colors.darkGray, marginBottom: '20px' }}>
                {filter === 'All' 
                  ? 'Be the first to share a health update!' 
                  : `No updates in ${filter} category yet.`}
              </p>
              <button 
                style={{
                  backgroundColor: colors.primary,
                  color: colors.white,
                  border: 'none',
                  padding: '10px 15px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={() => setShowCreatePost(true)}
              >
                Share Your Experience
              </button>
            </div>
          ) : (
            posts
              .filter(post => filter === 'All' || post.genre === filter)
              .map(post => (
                <div key={post.id} style={{
                  backgroundColor: colors.white,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  marginBottom: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  ':hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  }
                }}>
                  {/* Post Header */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '15px',
                    borderBottom: `1px solid ${colors.lightGray}`
                  }}>
                    <img 
                      src={post.authorAvatar} 
                      alt={post.authorName} 
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        marginRight: '12px',
                        border: `2px solid ${colors.lightGray}`
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px'
                      }}>
                        <h3 style={{ 
                          color: colors.text, 
                          margin: 0,
                          fontSize: '1.05rem',
                          fontWeight: '600'
                        }}>
                          {post.authorName}
                        </h3>
                        {post.authorId === currentUser.uid && (
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                              style={{
                                background: 'none',
                                border: 'none',
                                color: colors.primary,
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                padding: '4px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'background 0.2s ease',
                                ':hover': {
                                  backgroundColor: colors.lightBlue
                                }
                              }}
                              onClick={() => setupEditPost(post)}
                            >
                              <FaEdit />
                            </button>
                            <button 
                              style={{
                                background: 'none',
                                border: 'none',
                                color: colors.danger,
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                padding: '4px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'background 0.2s ease',
                                ':hover': {
                                  backgroundColor: 'rgba(217,48,37,0.1)'
                                }
                              }}
                              onClick={() => {
                                if (window.confirm("Delete this health update?")) {
                                  deleteDoc(doc(db, "posts", post.id));
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        gap: '10px', 
                        alignItems: 'center',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{ 
                          color: colors.primary, 
                          fontWeight: '600',
                          fontSize: '0.85rem',
                          backgroundColor: colors.lightBlue,
                          padding: '3px 8px',
                          borderRadius: '12px'
                        }}>
                          {post.genre}
                        </span>
                        <span style={{ 
                          color: colors.darkGray, 
                          fontSize: '0.85rem'
                        }}>
                          {formatDateSafe(post.createdAt)}
                        </span>
                        {post.updatedAt && (
                          <span style={{ 
                            color: colors.darkGray, 
                            fontSize: '0.8rem',
                            fontStyle: 'italic'
                          }}>
                            (edited)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div style={{ padding: '15px' }}>
                    <h2 style={{ 
                      color: colors.text, 
                      margin: '0 0 12px 0',
                      fontSize: '1.3rem'
                    }}>
                      {post.title}
                    </h2>
                    <div style={{ 
                      position: 'relative',
                      overflow: 'hidden',
                      maxHeight: expandedPosts[post.id] ? 'none' : '120px',
                      transition: 'max-height 0.3s ease'
                    }}>
                      <p style={{ 
                        color: colors.text, 
                        margin: 0,
                        lineHeight: '1.6',
                        whiteSpace: 'pre-line'
                      }}>
                        {post.content}
                      </p>
                      {post.content.length > 300 && (
                        <div style={{
                          position: expandedPosts[post.id] ? 'relative' : 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: expandedPosts[post.id] ? 'transparent' : `linear-gradient(to bottom, transparent, ${colors.white} 70%)`,
                          paddingTop: expandedPosts[post.id] ? '10px' : '40px',
                          textAlign: 'center'
                        }}>
                          <button 
                            style={{
                              background: 'none',
                              border: 'none',
                              color: colors.primary,
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '5px 10px',
                              borderRadius: '4px',
                              transition: 'background 0.2s ease',
                              ':hover': {
                                backgroundColor: colors.lightBlue
                              }
                            }}
                            onClick={() => toggleExpandPost(post.id)}
                          >
                            {expandedPosts[post.id] ? (
                              <>
                                <FaChevronUp /> Show Less
                              </>
                            ) : (
                              <>
                                <FaChevronDown /> Read More
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                    {post.image && (
                      <img 
                        src={post.image} 
                        alt="Health update" 
                        style={{
                          width: '100%',
                          borderRadius: '8px',
                          marginTop: '15px',
                          maxHeight: '400px',
                          objectFit: 'contain',
                          backgroundColor: colors.lightGray
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                  </div>

                  {/* Post Actions */}
                  <div style={{ 
                    display: 'flex',
                    gap: '15px',
                    padding: '10px 15px',
                    borderTop: `1px solid ${colors.mediumGray}`,
                    borderBottom: `1px solid ${colors.mediumGray}`,
                    marginBottom: '15px'
                  }}>
                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        color: post.useful?.includes(currentUser.uid) ? colors.primary : colors.darkGray,
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        transition: 'all 0.2s ease',
                        ':hover': {
                          backgroundColor: colors.lightGray
                        }
                      }}
                      onClick={() => handleFeedback(post.id, 'useful')}
                    >
                      <MdThumbUp style={{ 
                        color: post.useful?.includes(currentUser.uid) ? colors.primary : colors.darkGray,
                        fontSize: '1.1rem'
                      }} /> 
                      Useful ({post.useful?.length || 0})
                    </button>
                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        color: post.notUseful?.includes(currentUser.uid) ? colors.primary : colors.darkGray,
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        transition: 'all 0.2s ease',
                        ':hover': {
                          backgroundColor: colors.lightGray
                        }
                      }}
                      onClick={() => handleFeedback(post.id, 'notUseful')}
                    >
                      <MdThumbDown style={{ 
                        color: post.notUseful?.includes(currentUser.uid) ? colors.primary : colors.darkGray,
                        fontSize: '1.1rem'
                      }} />
                      Not Useful ({post.notUseful?.length || 0})
                    </button>
                  </div>

                  {/* Comments Section */}
                  <div style={{ padding: '0 15px 15px' }}>
                    {post.comments?.map(comment => (
                      <div key={comment.id} style={{ marginBottom: '15px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <img 
                            src={comment.authorAvatar} 
                            alt={comment.authorName} 
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              flexShrink: 0
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              backgroundColor: colors.lightGray,
                              padding: '10px 12px',
                              borderRadius: '18px',
                              position: 'relative'
                            }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '5px',
                                flexWrap: 'wrap'
                              }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <strong style={{ 
                                    fontSize: '0.9rem',
                                    color: colors.text
                                  }}>
                                    {comment.authorName}
                                  </strong>
                                  <span style={{ 
                                    fontSize: '0.75rem', 
                                    color: colors.darkGray 
                                  }}>
                                    {formatDateSafe(comment.createdAt)}
                                  </span>
                                </div>
                                {comment.authorId === currentUser?.uid && (
                                  <button
                                    onClick={() => {
                                      if (window.confirm("Delete this comment?")) {
                                        deleteComment(post.id, comment.id);
                                      }
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: colors.danger,
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                      padding: '2px 5px',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      transition: 'background 0.2s ease',
                                      ':hover': {
                                        backgroundColor: 'rgba(217,48,37,0.1)'
                                      }
                                    }}
                                    aria-label="Delete comment"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                              <p style={{ 
                                margin: 0,
                                fontSize: '0.9rem',
                                lineHeight: '1.5'
                              }}>
                                {comment.content}
                              </p>
                            </div>
                            
                            {/* Replies */}
                            {comment.replies?.map(reply => (
                              <div key={reply.id} style={{ 
                                display: 'flex',
                                marginTop: '10px',
                                marginLeft: '20px',
                                gap: '10px'
                              }}>
                                <img 
                                  src={reply.authorAvatar} 
                                  alt={reply.authorName} 
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    flexShrink: 0
                                  }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ 
                                    backgroundColor: colors.lightGray,
                                    padding: '8px 12px',
                                    borderRadius: '18px'
                                  }}>
                                    <div style={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      marginBottom: '3px',
                                      flexWrap: 'wrap'
                                    }}>
                                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <strong style={{ 
                                          fontSize: '0.85rem',
                                          color: colors.text
                                        }}>
                                          {reply.authorName}
                                        </strong>
                                        <span style={{ 
                                          fontSize: '0.7rem', 
                                          color: colors.darkGray 
                                        }}>
                                          {formatDateSafe(reply.createdAt)}
                                        </span>
                                      </div>
                                      {reply.authorId === currentUser?.uid && (
                                        <button
                                          onClick={() => {
                                            if (window.confirm("Delete this reply?")) {
                                              deleteReply(post.id, comment.id, reply.id);
                                            }
                                          }}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            color: colors.danger,
                                            cursor: 'pointer',
                                            fontSize: '0.7rem',
                                            padding: '2px 5px',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            transition: 'background 0.2s ease',
                                            ':hover': {
                                              backgroundColor: 'rgba(217,48,37,0.1)'
                                            }
                                          }}
                                          aria-label="Delete reply"
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </div>
                                    <p style={{ 
                                      margin: 0,
                                      fontSize: '0.85rem',
                                      lineHeight: '1.5'
                                    }}>
                                      {reply.content}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}

                            {/* Reply Input */}
                            <div style={{ 
                              display: 'flex',
                              gap: '10px',
                              marginTop: '10px',
                              marginLeft: '10px'
                            }}>
                              <input
                                type="text"
                                placeholder="Write a reply..."
                                value={replyInputs[`${post.id}-${comment.id}`] || ''}
                                onChange={(e) => {
                                  const key = `${post.id}-${comment.id}`;
                                  setReplyInputs({
                                    ...replyInputs, 
                                    [key]: e.target.value
                                  });
                                }}
                                style={{
                                  flex: 1,
                                  padding: '8px 12px',
                                  border: `1px solid ${colors.mediumGray}`,
                                  borderRadius: '18px',
                                  fontFamily: 'inherit',
                                  fontSize: '0.9rem',
                                  transition: 'border 0.2s ease',
                                  ':focus': {
                                    outline: 'none',
                                    borderColor: colors.primary,
                                    boxShadow: `0 0 0 2px ${colors.lightBlue}`
                                  }
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    addComment(
                                      post.id, 
                                      replyInputs[`${post.id}-${comment.id}`], 
                                      true, 
                                      comment.id
                                    );
                                  }
                                }}
                              />
                              <button
                                onClick={() => addComment(
                                  post.id, 
                                  replyInputs[`${post.id}-${comment.id}`], 
                                  true, 
                                  comment.id
                                )}
                                style={{
                                  backgroundColor: colors.primary,
                                  color: colors.white,
                                  border: 'none',
                                  padding: '0 12px',
                                  borderRadius: '18px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  fontSize: '0.9rem',
                                  transition: 'background 0.2s ease',
                                  ':hover': {
                                    backgroundColor: '#1557b7'
                                  }
                                }}
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* New Comment Input */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                      <img 
                        src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.fullName || currentUser.email.split('@')[0])}`} 
                        alt="You" 
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          flexShrink: 0
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs(prev => ({
                          ...prev, 
                          [post.id]: e.target.value
                        }))}
                        style={{
                          flex: 1,
                          padding: '10px 15px',
                          border: `1px solid ${colors.mediumGray}`,
                          borderRadius: '18px',
                          fontFamily: 'inherit',
                          fontSize: '0.9rem'
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && e.target.value.trim()) {
                            addComment(post.id, commentInputs[post.id]);
                          }
                        }}
                      />
                      <button
                        onClick={() => addComment(post.id, commentInputs[post.id])}
                        disabled={!commentInputs[post.id]?.trim()}
                        style={{
                          backgroundColor: commentInputs[post.id]?.trim() ? colors.primary : colors.mediumGray,
                          color: colors.white,
                          border: 'none',
                          padding: '0 15px',
                          borderRadius: '18px',
                          fontWeight: '600',
                          cursor: commentInputs[post.id]?.trim() ? 'pointer' : 'not-allowed',
                          fontSize: '0.9rem'
                        }}
                      >
                        Post
                      </button>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Mobile Create Post Modal */}
      {isMobile && showCreatePost && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: colors.white,
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '20px',
            position: 'relative'
          }}>
            <button 
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                color: colors.darkGray,
                fontSize: '1.2rem',
                cursor: 'pointer',
                padding: '5px'
              }}
              onClick={() => {
                setShowCreatePost(false);
                setEditingPost(null);
                setNewPost({ title: '', genre: 'Health Tips', content: '', image: '' });
              }}
            >
              ×
            </button>
            <h2 style={{ 
              marginTop: '10px',
              marginBottom: '20px',
              color: colors.text,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <MdHealthAndSafety />
              {editingPost ? 'Edit Health Update' : 'Share Health Experience'}
            </h2>
            <form onSubmit={handleSubmitPost}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: '500',
                  color: colors.darkGray,
                  fontSize: '0.9rem'
                }}>Title</label>
                <input
                  type="text"
                  placeholder="e.g., 'My Recovery Journey'"
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${colors.mediumGray}`,
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: '500',
                  color: colors.darkGray,
                  fontSize: '0.9rem'
                }}>Category</label>
                <select
                  value={newPost.genre}
                  onChange={(e) => setNewPost({...newPost, genre: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${colors.mediumGray}`,
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                    fontSize: '1rem'
                  }}
                >
                  {healthCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: '500',
                  color: colors.darkGray,
                  fontSize: '0.9rem'
                }}>Content</label>
                <textarea
                  placeholder="Share your health story or advice..."
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${colors.mediumGray}`,
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                    minHeight: '150px',
                    resize: 'vertical',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: '500',
                  color: colors.darkGray,
                  fontSize: '0.9rem'
                }}>Image URL (optional)</label>
                <input
                  type="text"
                  placeholder="https://example.com/image.jpg"
                  value={newPost.image}
                  onChange={(e) => setNewPost({...newPost, image: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${colors.mediumGray}`,
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <button 
                type="submit"
                style={{
                  backgroundColor: editingPost ? colors.accent : colors.primary,
                  color: colors.white,
                  border: 'none',
                  padding: '14px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '100%',
                  fontSize: '1rem',
                  marginBottom: '10px'
                }}
              >
                {editingPost ? 'Update Post' : 'Post Update'}
              </button>
              <button 
                type="button"
                style={{
                  background: 'transparent',
                  border: `1px solid ${colors.mediumGray}`,
                  color: colors.text,
                  padding: '14px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '100%',
                  fontSize: '1rem'
                }}
                onClick={() => {
                  setShowCreatePost(false);
                  setEditingPost(null);
                  setNewPost({ title: '', genre: 'Health Tips', content: '', image: '' });
                }}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Create Post Button */}
      {isMobile && !showCreatePost && (
        <button 
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: colors.primary,
            color: colors.white,
            border: 'none',
            fontSize: '1.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            zIndex: 100,
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            ':active': {
              transform: 'scale(0.95)'
            }
          }}
          onClick={() => {
            setShowCreatePost(true);
            setEditingPost(null);
            setNewPost({ title: '', genre: 'Health Tips', content: '', image: '' });
          }}
        >
          +
        </button>
      )}
    </div>
  );
};

export default Blog_page;