export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          WeaveMind
        </h1>
        <p className="text-2xl text-gray-600 mb-8">
          因材织学 - AI-Driven Learning Management System
        </p>
        <div className="space-x-4">
          <a
            href="/auth/login"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Login
          </a>
          <a
            href="/auth/signup"
            className="inline-block px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-600 rounded-lg hover:bg-indigo-50 transition"
          >
            Sign Up
          </a>
        </div>
      </div>
    </div>
  );
}

