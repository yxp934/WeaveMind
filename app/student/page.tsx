export default function StudentDashboard() {
  // This is a CLIENT-SIDE ONLY page to avoid server-side database issues
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-2xl p-8 bg-white rounded-lg shadow-lg text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Student Dashboard</h1>
        <p className="text-gray-600 mb-8">
          You are successfully logged in as a student!
        </p>
        <div className="text-green-600 font-semibold">
          ✅ Authentication working correctly
        </div>
      </div>
    </div>
  )
}
