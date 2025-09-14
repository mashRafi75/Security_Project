import React, { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash, FaSpinner, FaFileMedical, FaUserMd, FaUser, FaCalendarAlt, FaClock } from 'react-icons/fa';
import { MdOutlineScreenshot, MdOutlineMoreVert } from 'react-icons/md';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../firebase';
import { doc as firestoreDoc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { io } from "socket.io-client";
import Modal from 'react-modal';

const VideoSession = () => {
  const { appointmentId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [otherParticipant, setOtherParticipant] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [callEnded, setCallEnded] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [devices, setDevices] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prescriptionText, setPrescriptionText] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const socketRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // Check permissions
  const checkPermissions = async () => {
    try {
      if (navigator.permissions) {
        const permissions = await Promise.all([
          navigator.permissions.query({ name: 'microphone' }),
          navigator.permissions.query({ name: 'camera' })
        ]);
        
        if (permissions[0].state === 'denied' || permissions[1].state === 'denied') {
          throw new Error('Permissions denied');
        }
      }
    } catch (err) {
      console.warn('Permission API not supported or error:', err);
    }
  };

  // Media setup
  const setupMedia = async () => {
    try {
      if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        throw new Error('Video calls require HTTPS or localhost');
      }

      await checkPermissions();

      const availableDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(availableDevices);

      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.onloadedmetadata = () => {
          localVideoRef.current.play().catch(err => {
            console.error('Video play error:', err);
            setTimeout(() => localVideoRef.current.play(), 100);
          });
        };
      }

      return true;
    } catch (err) {
      console.error('Media setup error:', err);
      setError(err.message.includes('permission') ? 
        'Please allow camera and microphone access' : 
        'Could not access camera. Please try another device');
      return false;
    }
  };

  // Socket.IO initialization
  const initializeSocket = () => {
    return new Promise((resolve) => {
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
      }

      const socketOptions = {
        withCredentials: true,
        secure: window.location.protocol === 'https:',
        rejectUnauthorized: false,
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000
      };

      socketRef.current = io(import.meta.env.VITE_API_URL || 'https://healthapp-1-q37j.onrender.com', socketOptions);

      socketRef.current.on('connect', () => {
        console.log('Socket connected');
        setConnectionStatus('connected');
        clearRetryTimeout();
        setRetryCount(0);
        
        socketRef.current.emit('join-call', { 
          appointmentId, 
          userId: currentUser.uid 
        });
        
        resolve(true);
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setConnectionStatus('disconnected');
      });

      socketRef.current.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
        setConnectionStatus('error');
        if (retryCount < 3) {
          retryTimeoutRef.current = setTimeout(() => {
            console.log(`Retrying connection (attempt ${retryCount + 1})`);
            setRetryCount(c => c + 1);
            socketRef.current.connect();
          }, 2000 * (retryCount + 1));
        } else {
          setError('Connection failed. Please refresh the page.');
          resolve(false);
        }
      });

      socketRef.current.on('webrtc-offer', handleWebRTCOffer);
      socketRef.current.on('webrtc-answer', handleWebRTCAnswer);
      socketRef.current.on('webrtc-candidate', handleWebRTCCandidate);
      socketRef.current.on('user-connected', () => {
        console.log('Remote user connected');
      });
      socketRef.current.on('user-disconnected', () => {
        console.log('Remote user disconnected');
      });
      socketRef.current.on('call-ended', handleCallEnded);
    });
  };

  const clearRetryTimeout = () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  const initializeWebRTC = () => {
    try {
      if (peerRef.current) {
        peerRef.current.close();
      }

      peerRef.current = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      });

      peerRef.current.onconnectionstatechange = () => {
        console.log('Connection state:', peerRef.current.connectionState);
      };
      
      peerRef.current.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerRef.current.iceConnectionState);
        if (peerRef.current.iceConnectionState === 'failed') {
          console.log('ICE failed, restarting ICE');
          peerRef.current.restartIce();
        }
      };

      peerRef.current.onsignalingstatechange = () => {
        console.log('Signaling state:', peerRef.current.signalingState);
      };

      peerRef.current.onicecandidateerror = (event) => {
        console.error('ICE candidate error:', event);
      };

      peerRef.current.onicecandidate = (event) => {
        if (event.candidate && socketRef.current?.connected) {
          socketRef.current.emit('webrtc-candidate', { 
            appointmentId,
            candidate: event.candidate 
          });
        }
      };

      peerRef.current.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        if (!remoteVideoRef.current.srcObject) {
          remoteVideoRef.current.srcObject = new MediaStream();
        }
        remoteVideoRef.current.srcObject.addTrack(event.track);
        
        remoteVideoRef.current.onloadedmetadata = () => {
          remoteVideoRef.current.play().catch(err => {
            console.error('Remote video play error:', err);
            setTimeout(() => remoteVideoRef.current.play(), 100);
          });
        };
      };

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          peerRef.current.addTrack(track, localStreamRef.current);
        });
      }

      connectionTimeoutRef.current = setTimeout(() => {
        if (peerRef.current?.iceConnectionState !== 'connected') {
          setError('Connection timed out. Please check your network.');
        }
      }, 15000);

      if (currentUser.role === 'doctor') {
        createOffer();
      }

    } catch (err) {
      console.error('WebRTC initialization error:', err);
      setError('Failed to initialize video connection');
    }
  };

  const createOffer = async () => {
    try {
      if (!peerRef.current) throw new Error('Peer connection not initialized');

      const offer = await peerRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await peerRef.current.setLocalDescription(offer);
      
      if (socketRef.current?.connected) {
        socketRef.current.emit('webrtc-offer', { 
          appointmentId,
          sdp: peerRef.current.localDescription 
        });
      } else {
        throw new Error('Socket connection not established');
      }
    } catch (err) {
      console.error('Offer creation error:', err);
      setError('Failed to initiate call');
    }
  };

  const handleWebRTCOffer = async ({ sdp }) => {
    try {
      if (!peerRef.current) throw new Error('Peer connection not initialized');

      await peerRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);
      
      if (socketRef.current?.connected) {
        socketRef.current.emit('webrtc-answer', { 
          appointmentId,
          sdp: peerRef.current.localDescription 
        });
      }
    } catch (err) {
      console.error('Error handling offer:', err);
      setError('Failed to establish connection');
    }
  };

  const handleWebRTCAnswer = async ({ sdp }) => {
    try {
      if (!peerRef.current) throw new Error('Peer connection not initialized');
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    } catch (err) {
      console.error('Error handling answer:', err);
      setError('Failed to complete connection');
    }
  };

  const handleWebRTCCandidate = async ({ candidate }) => {
    try {
      if (!peerRef.current) throw new Error('Peer connection not initialized');
      if (candidate) {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.warn('Error adding ICE candidate:', err);
    }
  };

  const handleCallEnded = () => {
    setCallEnded(true);
    cleanupResources();
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCamEnabled(videoTrack.enabled);
      }
    }
  };

  const takeScreenshot = () => {
    const canvas = document.createElement('canvas');
    const video = remoteVideoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const link = document.createElement('a');
    link.download = `consultation-screenshot-${new Date().toISOString()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const savePrescription = async () => {
    try {
      const appointmentRef = firestoreDoc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        prescription: prescriptionText,
        updatedAt: new Date()
      });
      setShowPrescriptionModal(false);
      setPrescriptionText('');
    } catch (err) {
      console.error('Error saving prescription:', err);
      setError('Failed to save prescription');
    }
  };

  const endCall = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('end-call', { appointmentId });
    }
    cleanupResources();
    navigate('/appointmentManagement');
  };

  const cleanupResources = () => {
    clearRetryTimeout();
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (socketRef.current) {
      socketRef.current.off();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    const initVideoSession = async () => {
      try {
        setLoading(true);
        setError(null);
        setRetryCount(0);

        const socketConnected = await initializeSocket();
        if (!socketConnected) return;

        const appointmentDoc = await getDoc(firestoreDoc(db, 'appointments', appointmentId));
        if (!appointmentDoc.exists()) {
          throw new Error('Appointment not found');
        }
        
        const appointmentData = appointmentDoc.data();
        setAppointment(appointmentData);
        
        if (currentUser.role === 'doctor') {
          const patientDoc = await getDoc(firestoreDoc(db, 'users', appointmentData.patientInfo.patientId));
          if (patientDoc.exists()) {
            setOtherParticipant({
              name: patientDoc.data().fullName,
              role: 'patient'
            });
          }
        } else {
          const doctorDoc = await getDoc(firestoreDoc(db, 'doctors', appointmentData.doctorId));
          if (doctorDoc.exists()) {
            setOtherParticipant({
              name: doctorDoc.data().name,
              role: 'doctor'
            });
          }
        }
        
        const mediaSuccess = await setupMedia();
        if (mediaSuccess) {
          initializeWebRTC();
        }

      } catch (err) {
        console.error('Initialization error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initVideoSession();

    return () => {
      cleanupResources();
    };
  }, [appointmentId, currentUser.role]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <FaSpinner className="spinner" />
          <h2>Starting your consultation</h2>
          <p>Please wait while we connect you...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <div className="error-content">
          <h2>Connection Error</h2>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            {error.includes('allow') && (
              <button className="btn-primary" onClick={() => window.location.reload()}>
                Reload & Allow Permissions
              </button>
            )}
            <button className="btn-secondary" onClick={() => navigate('/appointmentManagement')}>
              Back to Appointments
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (callEnded) {
    return (
      <div className="call-ended-screen">
        <div className="call-ended-content">
          <h2>Consultation Ended</h2>
          <p>Your video session has been completed.</p>
          <button className="btn-primary" onClick={() => navigate('/appointmentManagement')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="video-session-container" onMouseMove={handleMouseMove}>
      {/* Header */}
      <header className="video-header">
        <div className="header-left">
          <h1>TeleMed</h1>
          <div className="connection-status">
            <span className={`status-dot ${connectionStatus}`}></span>
            <span className="status-text">
              {connectionStatus === 'connected' ? 'Connected' : 
               connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <div className="header-center">
          <div className="appointment-info">
            <div className="info-item">
              <FaUserMd className="info-icon" />
              <span>{currentUser.role === 'doctor' ? currentUser.fullName : otherParticipant?.name}</span>
            </div>
            <div className="info-item">
              <FaUser className="info-icon" />
              <span>{currentUser.role === 'patient' ? 'You' : otherParticipant?.name}</span>
            </div>
            <div className="info-item">
              <FaCalendarAlt className="info-icon" />
              <span>{appointment?.date}</span>
            </div>
            <div className="info-item">
              <FaClock className="info-icon" />
              <span>{appointment?.timeSlot}</span>
            </div>
          </div>
        </div>
        
        <div className="header-right">
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <MdOutlineMoreVert />
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <button onClick={toggleMic} className="mobile-menu-item">
            {micEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
            <span>{micEnabled ? 'Mute' : 'Unmute'}</span>
          </button>
          <button onClick={toggleCam} className="mobile-menu-item">
            {camEnabled ? <FaVideo /> : <FaVideoSlash />}
            <span>{camEnabled ? 'Stop Video' : 'Start Video'}</span>
          </button>
          {currentUser.role === 'doctor' && (
            <button onClick={() => setShowPrescriptionModal(true)} className="mobile-menu-item">
              <FaFileMedical />
              <span>Prescription</span>
            </button>
          )}
          <button onClick={endCall} className="mobile-menu-item end-call">
            <FaPhoneSlash />
            <span>End Call</span>
          </button>
        </div>
      )}

      {/* Main Video Content */}
      <main className="video-content">
        <div className={`video-grid ${!camEnabled ? 'video-disabled' : ''}`}>
          <div className="video-card remote-video-container">
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="remote-video"
            />
            <div className="video-overlay">
              <span className="participant-name">{otherParticipant?.name}</span>
            </div>
          </div>
          
          <div className="video-card local-video-container">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className="local-video"
            />
            <div className="video-overlay">
              <span className="participant-name">You</span>
              {!camEnabled && <div className="camera-off-indicator">Camera Off</div>}
            </div>
          </div>
        </div>
      </main>

      {/* Controls (Desktop) */}
      {showControls && (
        <div className="video-controls">
          <div className="controls-left">
            <button onClick={toggleMic} className={`control-btn ${!micEnabled ? 'muted' : ''}`}>
              {micEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
            </button>
            <button onClick={toggleCam} className={`control-btn ${!camEnabled ? 'muted' : ''}`}>
              {camEnabled ? <FaVideo /> : <FaVideoSlash />}
            </button>
          </div>
          
          <div className="controls-center">
            <button onClick={endCall} className="end-call-btn">
              <FaPhoneSlash />
            </button>
          </div>
          
          <div className="controls-right">
            {currentUser.role === 'doctor' && (
              <button 
                onClick={() => setShowPrescriptionModal(true)} 
                className="control-btn prescription-btn"
              >
                <FaFileMedical />
                <span>Prescription</span>
              </button>
            )}
            <button onClick={takeScreenshot} className="control-btn">
              <MdOutlineScreenshot />
            </button>
          </div>
        </div>
      )}

      {/* Prescription Modal */}
      <Modal
        isOpen={showPrescriptionModal}
        onRequestClose={() => setShowPrescriptionModal(false)}
        className="prescription-modal"
        overlayClassName="prescription-modal-overlay"
      >
        <h2>Write Prescription</h2>
        <textarea
          value={prescriptionText}
          onChange={(e) => setPrescriptionText(e.target.value)}
          placeholder="Enter prescription details..."
          className="prescription-textarea"
        />
        <div className="modal-actions">
          <button onClick={() => setShowPrescriptionModal(false)} className="btn-secondary">
            Cancel
          </button>
          <button onClick={savePrescription} className="btn-primary">
            Save Prescription
          </button>
        </div>
      </Modal>

      <style jsx>{`
        :root {
          --primary-color: #3a86ff;
          --secondary-color: #8338ec;
          --danger-color: #ff006e;
          --success-color: #06d6a0;
          --warning-color: #ffbe0b;
          --dark-color: #1a1a2e;
          --light-color: #f8f9fa;
          --gray-color: #6c757d;
          --bg-gradient: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .video-session-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background-color: var(--dark-color);
          color: white;
          position: relative;
          overflow: hidden;
        }

        /* Header Styles */
        .video-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background-color: rgba(26, 26, 46, 0.9);
          backdrop-filter: blur(10px);
          z-index: 100;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-left h1 {
          font-size: 1.5rem;
          font-weight: 700;
          background: var(--bg-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        .status-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .status-dot.connected {
          background-color: var(--success-color);
        }

        .status-dot.connecting {
          background-color: var(--warning-color);
          animation: pulse 1.5s infinite;
        }

        .status-dot.disconnected, .status-dot.error {
          background-color: var(--danger-color);
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        .header-center {
          flex: 1;
          display: flex;
          justify-content: center;
        }

        .appointment-info {
          display: flex;
          gap: 1.5rem;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .info-icon {
          color: var(--primary-color);
        }

        .header-right {
          display: flex;
          align-items: center;
        }

        .mobile-menu-btn {
          background: none;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          display: none;
        }

        /* Mobile Menu */
        .mobile-menu {
          position: absolute;
          top: 70px;
          right: 20px;
          background-color: rgba(26, 26, 46, 0.95);
          border-radius: 10px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          z-index: 200;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          display: none;
        }

        .mobile-menu-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mobile-menu-item:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .mobile-menu-item.end-call {
          background: var(--danger-color);
          color: white;
        }

        .mobile-menu-item.end-call:hover {
          background: #d1005e;
        }

        /* Main Content */
        .video-content {
          flex: 1;
          display: flex;
          position: relative;
          overflow: hidden;
        }

        .video-grid {
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: 1fr;
          width: 100%;
          height: 100%;
          position: relative;
        }

        @media (min-width: 768px) {
          .video-grid {
            grid-template-columns: 75% 25%;
            grid-template-rows: 100%;
          }
        }

        .video-card {
          position: relative;
          background-color: #000;
          overflow: hidden;
        }

        .remote-video-container {
          grid-area: 1 / 1 / 2 / 2;
        }

        .local-video-container {
          grid-area: 1 / 2 / 2 / 3;
          border-left: 2px solid rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 767px) {
          .local-video-container {
            position: absolute;
            bottom: 80px;
            right: 20px;
            width: 120px;
            height: 160px;
            border-radius: 8px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            z-index: 10;
          }
        }

        .video-disabled {
          background-color: #111;
        }

        video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 0.5rem 1rem;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .participant-name {
          font-size: 0.9rem;
          font-weight: 500;
        }

        .camera-off-indicator {
          background: rgba(0, 0, 0, 0.5);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
        }

        /* Video Controls */
        .video-controls {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1.5rem;
          background: rgba(26, 26, 46, 0.8);
          border-radius: 50px;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          z-index: 100;
          transition: all 0.3s ease;
        }

        .controls-left, .controls-right {
          display: flex;
          gap: 0.5rem;
        }

        .controls-center {
          margin: 0 1rem;
        }

        .control-btn {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: none;
          background: rgba(174, 198, 186, 0.1);
          color: white;
          font-size: 1.2rem;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .control-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }

        .control-btn.muted {
          background: rgba(255, 0, 0, 0.2);
          color: #ff6b6b;
        }

        .control-btn.prescription-btn {
          width: auto;
          padding: 0 1rem;
          border-radius: 25px;
          gap: 0.5rem;
        }

        .end-call-btn {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: none;
          background: var(--danger-color);
          color: white;
          font-size: 1.5rem;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .end-call-btn:hover {
          background: #d1005e;
          transform: scale(1.05);
        }

        /* Loading Screen */
        .loading-screen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: var(--dark-color);
          z-index: 1000;
        }

        .loading-content {
          text-align: center;
          max-width: 400px;
          padding: 2rem;
        }

        .spinner {
          font-size: 3rem;
          margin-bottom: 1.5rem;
          color: var(--primary-color);
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-content h2 {
          margin-bottom: 1rem;
          color: white;
        }

        .loading-content p {
          color: rgba(255, 255, 255, 0.7);
        }

        /* Error Screen */
        .error-screen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: var(--dark-color);
          z-index: 1000;
        }

        .error-content {
          text-align: center;
          max-width: 500px;
          padding: 2rem;
          background: rgba(26, 26, 46, 0.9);
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .error-content h2 {
          margin-bottom: 1rem;
          color: white;
        }

        .error-message {
          margin-bottom: 2rem;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
        }

        .error-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        /* Call Ended Screen */
        .call-ended-screen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: var(--dark-color);
          z-index: 1000;
        }

        .call-ended-content {
          text-align: center;
          max-width: 500px;
          padding: 2rem;
          background: rgba(26, 26, 46, 0.9);
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .call-ended-content h2 {
          margin-bottom: 1rem;
          color: white;
        }

        .call-ended-content p {
          margin-bottom: 2rem;
          color: rgba(255, 255, 255, 0.8);
        }

        /* Buttons */
        .btn-primary {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 50px;
          background: var(--bg-gradient);
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(58, 134, 255, 0.4);
        }

        .btn-secondary {
          padding: 0.75rem 1.5rem;
          border: 1px solid var(--primary-color);
          border-radius: 50px;
          background: transparent;
          color: var(--primary-color);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: rgba(58, 134, 255, 0.1);
        }

        /* Prescription Modal */
        .prescription-modal {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 600px;
          background: var(--dark-color);
          border-radius: 10px;
          padding: 2rem;
          outline: none;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .prescription-modal h2 {
          margin-bottom: 1.5rem;
          color: white;
          text-align: center;
        }

        .prescription-textarea {
          width: 100%;
          height: 300px;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: white;
          font-size: 1rem;
          resize: none;
          margin-bottom: 1.5rem;
        }

        .prescription-textarea:focus {
          outline: none;
          border-color: var(--primary-color);
        }

        .modal-actions {
          display: flex;
          justify-content: center;
          gap: 1rem;
        }

        .prescription-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(5px);
          z-index: 1000;
        }

        /* Responsive Styles */
        @media (max-width: 768px) {
          .video-header {
            padding: 1rem;
          }

          .appointment-info {
            display: none;
          }

          .mobile-menu-btn {
            display: block;
          }

          .mobile-menu {
            display: flex;
          }

          .video-controls {
            width: 100%;
            border-radius: 0;
            bottom: 0;
            left: 0;
            transform: none;
            justify-content: space-between;
            padding: 1rem;
          }

          .controls-left, .controls-center, .controls-right {
            margin: 0;
          }

          .control-btn {
            width: 45px;
            height: 45px;
            font-size: 1rem;
          }

          .end-call-btn {
            width: 50px;
            height: 50px;
            font-size: 1.3rem;
          }

          .control-btn.prescription-btn {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default VideoSession;