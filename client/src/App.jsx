import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
//import Home from './pages/Home';
import AdminPanel from './components/admin/AdminPanel';
import Signup from './components/auth/Signup';
import Login from './components/auth/Login';
import LandingPage from './components/Landing_page/LandingPage'
import Home_page from './components/Home_page/Home_page'
import Profile from './components/Profile/Profile'
import DoctorInformation from './components/DoctorInformation/DoctorInformation'
import MedicalList from './components/MedicalList/MedicalList'
import MedicalInformation from './components/MedicalList/MedicalInformation'
import Blog_page from './components/Blog_page/Blog_page'
import AppointmentBooking from './components/Appointment/AppointmentBooking'
import AppointmentManagement from './components/Appointment/AppointmentManagement'
import VideoSession from './components/VideoSession/VideoSession';
import HealthAIChat from './components/HealthAIChat/HealthAIChat';




function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />}  />
          <Route path="/signup" element={<Signup />} />
          <Route path="/Login" element={<Login />} />
          <Route path="/Home_page" element={<ProtectedRoute><Home_page /></ProtectedRoute>} />
          <Route path="/Profile/:userId" element={<Profile />} />
          <Route path="/DoctorInformation" element={<DoctorInformation />} />
          <Route path="/MedicalList" element={<MedicalList />} />
          <Route path="/MedicalInformation/:id" element={<MedicalInformation />} />
          <Route path="/Blog_page" element={<Blog_page />} />
          <Route path="/AppointmentBooking/:id" element={<AppointmentBooking />} />
          <Route path="/AppointmentManagement" element={<AppointmentManagement />} />
          <Route path="/video-session/:appointmentId" element={<VideoSession />} />
          <Route path="/HealthAIChat" element={<HealthAIChat />} />
          
          <Route path="/test" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
          
          {/* <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPanel /></ProtectedRoute>}/> */}
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App
