import { useState, useEffect } from 'react'
import BookingForm from './components/BookingForm'
import TrackAppointment from './components/TrackAppointment'
import AdminLogin from './components/AdminLogin'
import {
  PawPrint,
  CalendarDays,
  Stethoscope,
  Syringe,
  HeartPulse,
  ShieldCheck,
  Clock,
  ArrowRight,
  Search,
  UserRound
} from 'lucide-react'
import { Scissors, Cross, FlaskConical, Pill } from 'lucide-react'
import AdminDashboard from './components/AdminDashboard'

function App() {
  const [showBooking, setShowBooking] = useState(false)
  const [showTracking, setShowTracking] = useState(false)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
const [adminSession, setAdminSession] = useState(null)
  const [services, setServices] = useState([])
const [servicesError, setServicesError] = useState('')
const [clinicSettings, setClinicSettings] = useState({
  clinicName: 'SmartVet',
  contactNumber: '',
  email: '',
  address: ''
})
useEffect(() => {
  if (adminSession) return

  const controller = new AbortController()

  fetch(
    '/api/settings',
    { signal: controller.signal }
  )
    .then(response => {
      if (!response.ok) {
        throw new Error('Unable to load clinic settings.')
      }

      return response.json()
    })
    .then(setClinicSettings)
    .catch(error => {
      if (error.name !== 'AbortError') {
        console.error(error.message)
      }
    })

  return () => controller.abort()

}, [adminSession])
useEffect(() => {
  if (adminSession) return

  setServicesError('')

  fetch('/api/services')
    .then(response => {
      if (!response.ok) {
        throw new Error('Unable to load services.')
      }

      return response.json()
    })
    .then(data => {
      setServices(data.map(service => ({
        ...service,
        icon: {
          'General Consultation': Stethoscope,
          'Vaccination': Syringe,
          'Wellness Examination': HeartPulse,
          'Grooming': Scissors,
          'Spay & Neuter': Cross,
          'Laboratory Test': FlaskConical,
          'Tick & Flea Treatment': ShieldCheck,
          'Deworming': Pill
        }[service.name] || Stethoscope,
        duration: `${service.duration} minutes`
      })))
    })
    .catch(error => {
      setServicesError(error.message)
    })

}, [adminSession])
async function handleAdminLogout() {
  try {
    const response = await fetch(
      '/api/admin/logout',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminSession.token}`
        }
      }
    )

    if (!response.ok && response.status !== 401) {
      throw new Error('Server logout failed.')
    }
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    setAdminSession(null)
  }
}

if (adminSession) {
  return (
    <AdminDashboard
      session={adminSession}
      onLogout={handleAdminLogout}
    />
  )
}
  return (
    <div className="min-h-screen bg-slate-50">

      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">

          <div className="flex items-center gap-3">
            <div className="bg-teal-600 text-white p-3 rounded-xl">
              <PawPrint size={26} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-teal-700">
                SmartVet
              </h1>
              <p className="text-xs text-slate-500">
                Veterinary Appointment System
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-sm font-medium">
            <a href="#home" className="hover:text-teal-600">Home</a>
            <a href="#services" className="hover:text-teal-600">Services</a>
            <a href="#about" className="hover:text-teal-600">About</a>

            <button
              onClick={() => setShowAdminLogin(true)}
              className="border border-teal-600 text-teal-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-50"
            >
              <UserRound size={17} />
              Admin Login
            </button>
          </div>

        </div>
      </nav>

      {/* Hero Section */}
      <section
        id="home"
        className="bg-gradient-to-br from-teal-50 to-emerald-100 px-6 py-24"
      >
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">

          <div>
            <span className="inline-block bg-teal-100 text-teal-800 px-4 py-2 rounded-full text-sm font-medium">
              Your pet's health comes first
            </span>

            <h2 className="text-5xl md:text-6xl font-bold leading-tight mt-6">
              Better care for
              <span className="block text-teal-700">
                your furry friends.
              </span>
            </h2>

            <p className="text-slate-600 text-lg mt-6 leading-relaxed">
              Schedule veterinary appointments conveniently.
              SmartVet makes pet healthcare easier through
              organized scheduling and pet record management.
            </p>

            <div className="flex flex-wrap gap-4 mt-8">

              <button
                onClick={() => setShowBooking(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-4 rounded-xl flex items-center gap-2 font-semibold"
              >
                <CalendarDays size={20} />
                Book Appointment
                <ArrowRight size={18} />
              </button>

              <button
               onClick={() => setShowTracking(true)}
                className="bg-white border border-slate-300 px-6 py-4 rounded-xl font-semibold flex items-center gap-2 hover:bg-slate-100"
              >
                <Search size={20} />
                Track Appointment
              </button>

            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-12 flex flex-col items-center justify-center min-h-80">
            <PawPrint size={130} className="text-teal-500" />

            <h3 className="text-2xl font-bold mt-6 text-teal-800 text-center">
              Healthy Pets, Happy Owners
            </h3>

            <p className="text-slate-500 text-center mt-3">
              Convenient and organized veterinary care.
            </p>
          </div>

        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="max-w-7xl mx-auto px-6 py-20">

        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">
            Our Veterinary Services
          </h2>

          <p className="text-slate-500 mt-3">
            Quality healthcare for your beloved pets.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
{servicesError && (
  <p className="col-span-full text-center text-red-600">
    {servicesError}
  </p>
)}

{!servicesError && services.length === 0 && (
  <p className="col-span-full text-center text-slate-500">
    No veterinary services currently available.
  </p>
)}
          {services.map((service) => (
            <div
              key={service.name}
              className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition"
            >

              <div className="bg-teal-50 text-teal-600 w-14 h-14 rounded-xl flex items-center justify-center">
                <service.icon size={28} />
              </div>

              <h3 className="text-xl font-bold mt-5">
                {service.name}
              </h3>

              <p className="text-slate-500 mt-3">
                {service.description}
              </p>

              <div className="flex items-center gap-2 text-sm text-teal-700 mt-5">
                <Clock size={16} />
                {service.duration}
              </div>

            </div>
          ))}

        </div>
      </section>

      {/* About Section */}
      <section id="about" className="bg-white py-16 px-6">

        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">
            Why Choose SmartVet?
          </h2>
        </div>

        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 text-center">

          <div>
            <CalendarDays className="mx-auto text-teal-600" size={36} />
            <h3 className="font-bold mt-4">Easy Scheduling</h3>
            <p className="text-slate-500 mt-2">
              Book veterinary appointments conveniently.
            </p>
          </div>

          <div>
            <Clock className="mx-auto text-teal-600" size={36} />
            <h3 className="font-bold mt-4">Conflict Prevention</h3>
            <p className="text-slate-500 mt-2">
              Avoid overlapping veterinary appointments.
            </p>
          </div>

          <div>
            <ShieldCheck className="mx-auto text-teal-600" size={36} />
            <h3 className="font-bold mt-4">Organized Records</h3>
            <p className="text-slate-500 mt-2">
              Manage pet information and visit history.
            </p>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-teal-950 text-white text-center py-10 px-6">

        <PawPrint className="mx-auto mb-3" size={30} />

        <h2 className="font-bold text-xl">
  {clinicSettings.clinicName}
</h2>

        <p className="text-teal-200 text-sm mt-2">
          Veterinary Appointment Scheduling System
        </p>

        <div className="space-y-2 mt-5 text-sm text-teal-100">

  {clinicSettings.address && (
    <p>
      Address: {clinicSettings.address}
    </p>
  )}

  {clinicSettings.contactNumber && (
    <p>
      Contact: {clinicSettings.contactNumber}
    </p>
  )}

  {clinicSettings.email && (
    <p>
      Email: {clinicSettings.email}
    </p>
  )}

</div>
<div className="space-y-2 mt-5 text-sm text-teal-100">

  {clinicSettings.address && (
    <p>
      Address: {clinicSettings.address}
    </p>
  )}

  {clinicSettings.contactNumber && (
    <p>
      Contact: {clinicSettings.contactNumber}
    </p>
  )}

  {clinicSettings.email && (
    <p>
      Email: {clinicSettings.email}
    </p>
  )}

</div>
<p className="text-teal-300 text-xs mt-4">
  © 2026 SmartVet. SAD Project.
</p>

      </footer>

      {showBooking && (
  <BookingForm onClose={() => setShowBooking(false)} />
)}
{showTracking && (
  <TrackAppointment onClose={() => setShowTracking(false)} />
)}
{showAdminLogin && (
  <AdminLogin
    onClose={() => setShowAdminLogin(false)}
    onLogin={(data) => {
      setAdminSession(data)
      setShowAdminLogin(false)
    }}
  />
)}
    </div>
  )
}

export default App
